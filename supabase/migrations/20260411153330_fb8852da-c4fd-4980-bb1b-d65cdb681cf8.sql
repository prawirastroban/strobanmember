
-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1;

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT invoices_booking_id_unique UNIQUE (booking_id)
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all invoices"
ON public.invoices FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "System can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update invoices"
ON public.invoices FOR UPDATE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_booking_id ON public.invoices(booking_id);

-- Auto-generate invoice on booking creation
CREATE OR REPLACE FUNCTION public.generate_invoice_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_number TEXT;
BEGIN
  v_invoice_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
  
  INSERT INTO public.invoices (invoice_number, booking_id, user_id, amount, items, payment_status)
  VALUES (
    v_invoice_number,
    NEW.id,
    NEW.user_id,
    NEW.service_price,
    jsonb_build_array(jsonb_build_object(
      'name', NEW.service_name,
      'type', NEW.service_type,
      'price', NEW.service_price,
      'quantity', 1
    )),
    NEW.payment_status
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_invoice
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_on_booking();

-- Sync invoice status when payment status changes on booking
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    UPDATE public.invoices
    SET payment_status = NEW.payment_status, updated_at = now()
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_invoice_status
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_payment_status();

-- Sync payment method from payments table
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'success' THEN
    UPDATE public.invoices
    SET payment_method = NEW.payment_method, payment_status = 'paid', updated_at = now()
    WHERE booking_id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_invoice_method
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_payment_method();

-- Update timestamp trigger
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
