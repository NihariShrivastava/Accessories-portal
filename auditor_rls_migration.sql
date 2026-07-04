-- Migration to update RLS policies for the Auditor role

-- Enable RLS on profiles if not already enabled (usually is)
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Drop existing auditor policies if they exist (to avoid errors if run multiple times)
DROP POLICY IF EXISTS "Auditors can view all bills" ON public.bills;
DROP POLICY IF EXISTS "Auditors can update bills" ON public.bills;

-- Create policy allowing auditors to SELECT bills
CREATE POLICY "Auditors can view all bills"
ON public.bills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'auditor'
  )
);

-- Create policy allowing auditors to UPDATE bills
CREATE POLICY "Auditors can update bills"
ON public.bills
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'auditor'
  )
);
