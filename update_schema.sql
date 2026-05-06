-- Add new columns for payment details
ALTER TABLE public.bills
ADD COLUMN payment_method TEXT DEFAULT 'Cash',
ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN amount_left DECIMAL(10, 2) DEFAULT 0.00;
