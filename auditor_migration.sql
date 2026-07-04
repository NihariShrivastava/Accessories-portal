-- Migration to support Auditor Role and Workflow

-- 0. Update user_role enum to include 'auditor'
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'auditor';

-- 1. Add assigned_team_leads to profiles (for the auditor to know which team leads they manage)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assigned_team_leads JSONB DEFAULT '[]'::jsonb;

-- 2. Add auditor-related columns to the bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS audit_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auditor_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS dealership_savings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS payment_audits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_savings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_gap NUMERIC DEFAULT 0;

-- Optional: Create an index on audit_status for faster filtering in the Auditor Dashboard
CREATE INDEX IF NOT EXISTS idx_bills_audit_status ON public.bills(audit_status);
