-- =============================================================================
-- ACCESSORIES PORTAL - COMPLETE SUPABASE DATABASE SCHEMA
-- =============================================================================
-- Run this complete script in the Supabase SQL Editor of your new project.
-- It creates all required tables, constraints, foreign keys, indexes,
-- auth trigger for user profiles, and Row-Level Security (RLS) policies.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- Standalone UUID primary key to allow seamless CSV imports and auth sync
  name TEXT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'counter',
  assigned_counters JSONB DEFAULT '[]'::jsonb,
  assigned_warehouses JSONB DEFAULT '[]'::jsonb,
  assigned_team_leads JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- 2. ACCESSORIES TABLE (Inventory Catalog)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.accessories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  counter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_model TEXT NOT NULL,
  name TEXT NOT NULL,
  accessory_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  purchase_price NUMERIC(12, 2) DEFAULT 0.00,
  cgst_percent NUMERIC(5, 2) DEFAULT 0.00,
  sgst_percent NUMERIC(5, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT accessories_counter_model_name_unique UNIQUE (counter_id, vehicle_model, name)
);

-- =============================================================================
-- 3. BILLS TABLE (Invoices & Approvals)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_number TEXT NOT NULL,
  counter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  accessory_id UUID REFERENCES public.accessories(id) ON DELETE RESTRICT NOT NULL,
  vehicle_model TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_id TEXT,
  chassis_number TEXT NOT NULL,
  engine_number TEXT NOT NULL,
  checklist_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  base_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT DEFAULT 'Cash',
  payment_details JSONB DEFAULT '[]'::jsonb,
  amount_paid NUMERIC(12, 2) DEFAULT 0.00,
  amount_left NUMERIC(12, 2) DEFAULT 0.00,
  excellon_receipt_number TEXT,
  approval_status TEXT DEFAULT 'pending',
  total_purchase_price NUMERIC(12, 2) DEFAULT 0.00,
  excess_adjustment NUMERIC(12, 2) DEFAULT 0.00,
  discount_approved NUMERIC(12, 2) DEFAULT 0.00,
  approval_note TEXT,
  audit_status TEXT DEFAULT NULL,
  auditor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_savings NUMERIC(12, 2) DEFAULT 0.00,
  total_gap NUMERIC(12, 2) DEFAULT 0.00,
  dealership_savings JSONB DEFAULT '{}'::jsonb,
  payment_audits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT bills_bill_number_unique UNIQUE (bill_number)
);

-- =============================================================================
-- 4. BILL_ITEMS TABLE (Multi-item line support for Cashier/Reports)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  accessory_id UUID REFERENCES public.accessories(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_time NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- 5. DRAWER_TRANSACTIONS TABLE (Physical Cash & Vouchers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.drawer_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  counter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT,
  details TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 6. LOGIN_LOGS TABLE (User Login Activity Tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  login_time TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 7. PERFORMANCE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_accessories_counter_id ON public.accessories(counter_id);
CREATE INDEX IF NOT EXISTS idx_accessories_vehicle_model ON public.accessories(vehicle_model);
CREATE INDEX IF NOT EXISTS idx_bills_counter_id ON public.bills(counter_id);
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON public.bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_approval_status ON public.bills(approval_status);
CREATE INDEX IF NOT EXISTS idx_bills_audit_status ON public.bills(audit_status);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at);
CREATE INDEX IF NOT EXISTS idx_drawer_counter_id ON public.drawer_transactions(counter_id);
CREATE INDEX IF NOT EXISTS idx_drawer_status ON public.drawer_transactions(status);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON public.login_logs(user_id);

-- =============================================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER (AUTH -> PROFILES)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    username,
    password,
    role,
    assigned_counters,
    assigned_warehouses,
    assigned_team_leads
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'password',
    COALESCE(new.raw_user_meta_data->>'role', CASE WHEN new.email LIKE 'admin@%' THEN 'admin' ELSE 'counter' END),
    COALESCE((new.raw_user_meta_data->'assigned_counters')::jsonb, '[]'::jsonb),
    COALESCE((new.raw_user_meta_data->'assigned_warehouses')::jsonb, '[]'::jsonb),
    COALESCE((new.raw_user_meta_data->'assigned_team_leads')::jsonb, '[]'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    role = COALESCE(EXCLUDED.role, public.profiles.role);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile or admin can insert" ON public.profiles;
CREATE POLICY "Users can insert their own profile or admin can insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update their profile or admin/TL can update" ON public.profiles;
CREATE POLICY "Users can update their profile or admin/TL can update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'team_lead'))
  );

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------------------------------------
-- ACCESSORIES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Accessories are viewable by authenticated users" ON public.accessories;
CREATE POLICY "Accessories are viewable by authenticated users"
  ON public.accessories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Accessories can be inserted by admin, counter, team lead" ON public.accessories;
CREATE POLICY "Accessories can be inserted by admin, counter, team lead"
  ON public.accessories FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Accessories can be updated by authenticated users" ON public.accessories;
CREATE POLICY "Accessories can be updated by authenticated users"
  ON public.accessories FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Accessories can be deleted by admin or counter" ON public.accessories;
CREATE POLICY "Accessories can be deleted by admin or counter"
  ON public.accessories FOR DELETE
  TO authenticated
  USING (
    counter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------------------------------------
-- BILLS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Bills are viewable by authenticated users" ON public.bills;
CREATE POLICY "Bills are viewable by authenticated users"
  ON public.bills FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Bills can be inserted by counters and admins" ON public.bills;
CREATE POLICY "Bills can be inserted by counters and admins"
  ON public.bills FOR INSERT
  TO authenticated
  WITH CHECK (
    counter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Bills can be updated by authorized roles" ON public.bills;
CREATE POLICY "Bills can be updated by authorized roles"
  ON public.bills FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Bills can be deleted by admins" ON public.bills;
CREATE POLICY "Bills can be deleted by admins"
  ON public.bills FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------------------------------------
-- BILL_ITEMS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Bill items viewable by authenticated users" ON public.bill_items;
CREATE POLICY "Bill items viewable by authenticated users"
  ON public.bill_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Bill items modifiable by authenticated users" ON public.bill_items;
CREATE POLICY "Bill items modifiable by authenticated users"
  ON public.bill_items FOR ALL
  TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- DRAWER_TRANSACTIONS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Drawer transactions viewable by authenticated users" ON public.drawer_transactions;
CREATE POLICY "Drawer transactions viewable by authenticated users"
  ON public.drawer_transactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Drawer transactions insertable by counters, cashiers, admins" ON public.drawer_transactions;
CREATE POLICY "Drawer transactions insertable by counters, cashiers, admins"
  ON public.drawer_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Drawer transactions updatable by cashiers and admins" ON public.drawer_transactions;
CREATE POLICY "Drawer transactions updatable by cashiers and admins"
  ON public.drawer_transactions FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Drawer transactions deletable by admins" ON public.drawer_transactions;
CREATE POLICY "Drawer transactions deletable by admins"
  ON public.drawer_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------------------------------------
-- LOGIN_LOGS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Login logs viewable by authenticated users" ON public.login_logs;
CREATE POLICY "Login logs viewable by authenticated users"
  ON public.login_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own login logs" ON public.login_logs;
CREATE POLICY "Users can insert their own login logs"
  ON public.login_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Login logs deletable by admin" ON public.login_logs;
CREATE POLICY "Login logs deletable by admin"
  ON public.login_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
