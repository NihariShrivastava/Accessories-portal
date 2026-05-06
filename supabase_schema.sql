-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'counter');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'counter',
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Create accessories table
CREATE TABLE public.accessories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  counter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_model TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(counter_id, vehicle_model, name)
);

-- Enable RLS on accessories
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on accessories"
  ON accessories
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Counters can view and update their own accessories"
  ON accessories FOR ALL
  USING ( counter_id = auth.uid() );

-- Create bills table
CREATE TABLE public.bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  counter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  accessory_id UUID REFERENCES public.accessories(id) ON DELETE RESTRICT NOT NULL,
  chassis_number TEXT NOT NULL,
  engine_number TEXT NOT NULL,
  checklist_number TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on bills
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all bills"
  ON bills FOR SELECT
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Counters can insert their own bills"
  ON bills FOR INSERT
  WITH CHECK ( counter_id = auth.uid() );

CREATE POLICY "Counters can view their own bills"
  ON bills FOR SELECT
  USING ( counter_id = auth.uid() );

-- Create login_logs table
CREATE TABLE public.login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on login_logs
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all login logs"
  ON login_logs FOR SELECT
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Users can insert their own login logs"
  ON login_logs FOR INSERT
  WITH CHECK ( user_id = auth.uid() );

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (new.id, COALESCE((new.raw_user_meta_data->>'role')::user_role, 'counter'), new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
