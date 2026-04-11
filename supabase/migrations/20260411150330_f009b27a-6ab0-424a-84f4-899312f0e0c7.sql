
-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one active payment per booking
CREATE UNIQUE INDEX idx_payments_booking_unique ON public.payments (booking_id) WHERE payment_status != 'failed';

-- Index for fast status queries
CREATE INDEX idx_payments_status ON public.payments (payment_status);
CREATE INDEX idx_payments_user ON public.payments (user_id);
CREATE INDEX idx_payments_created ON public.payments (created_at DESC);

-- Add payment_status to bookings
ALTER TABLE public.bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all payments"
  ON public.payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update all payments"
  ON public.payments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Activity log trigger for payments
CREATE OR REPLACE FUNCTION public.log_payment_activity()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('payment', 'Payment initiated: Rp ' || NEW.amount || ' via ' || NEW.payment_method, NEW.user_id,
      jsonb_build_object('payment_id', NEW.id, 'booking_id', NEW.booking_id, 'amount', NEW.amount, 'method', NEW.payment_method, 'status', NEW.payment_status));
  ELSIF TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('payment', 'Payment ' || NEW.payment_status || ': Rp ' || NEW.amount || ' via ' || NEW.payment_method, NEW.user_id,
      jsonb_build_object('payment_id', NEW.id, 'booking_id', NEW.booking_id, 'amount', NEW.amount, 'method', NEW.payment_method, 'old_status', OLD.payment_status, 'new_status', NEW.payment_status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_payment_activity_trigger
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_activity();

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
