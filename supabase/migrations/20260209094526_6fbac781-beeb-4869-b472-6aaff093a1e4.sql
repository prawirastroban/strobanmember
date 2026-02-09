-- Add customer_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN customer_id TEXT UNIQUE;

-- Create a sequence for customer IDs
CREATE SEQUENCE IF NOT EXISTS public.customer_id_seq START WITH 1001;

-- Create function to generate customer ID
CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    NEW.customer_id := 'CUST-' || LPAD(nextval('public.customer_id_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign customer ID on insert
CREATE TRIGGER set_customer_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_customer_id();