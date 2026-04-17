-- 1. Add hardening columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verified_by_webhook BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS midtrans_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT;

-- Unique index for idempotency (allows NULL for non-midtrans payments)
CREATE UNIQUE INDEX IF NOT EXISTS payments_midtrans_transaction_id_uidx
  ON public.payments (midtrans_transaction_id)
  WHERE midtrans_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_midtrans_order_id_idx
  ON public.payments (midtrans_order_id)
  WHERE midtrans_order_id IS NOT NULL;

-- 2. Webhook logs table for full audit trail
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'midtrans',
  order_id TEXT,
  transaction_id TEXT,
  transaction_status TEXT,
  fraud_status TEXT,
  payment_type TEXT,
  gross_amount NUMERIC,
  validation_result TEXT NOT NULL, -- 'valid' | 'invalid_signature' | 'amount_mismatch' | 'duplicate' | 'booking_not_found' | 'missing_fields' | 'error'
  error_message TEXT,
  raw_payload JSONB,
  booking_id UUID,
  payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_logs_order_id_idx ON public.webhook_logs (order_id);
CREATE INDEX IF NOT EXISTS webhook_logs_transaction_id_idx ON public.webhook_logs (transaction_id);
CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx ON public.webhook_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_logs_validation_result_idx ON public.webhook_logs (validation_result);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- No INSERT/UPDATE/DELETE policy = only service role (webhook) can write

-- 3. Protective trigger: prevent frontend from setting verified_by_webhook / webhook_received_at
CREATE OR REPLACE FUNCTION public.protect_webhook_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (webhook) to set these. Block authenticated users.
  IF auth.role() = 'authenticated' THEN
    IF NEW.verified_by_webhook IS DISTINCT FROM OLD.verified_by_webhook THEN
      RAISE EXCEPTION 'verified_by_webhook can only be set by webhook';
    END IF;
    IF NEW.webhook_received_at IS DISTINCT FROM OLD.webhook_received_at THEN
      RAISE EXCEPTION 'webhook_received_at can only be set by webhook';
    END IF;
    IF NEW.midtrans_transaction_id IS DISTINCT FROM OLD.midtrans_transaction_id THEN
      RAISE EXCEPTION 'midtrans_transaction_id can only be set by webhook';
    END IF;

    -- If payment is already verified by webhook, lock its status from frontend changes
    IF OLD.verified_by_webhook = true AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'payment_status is locked: verified by webhook (source of truth)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_payments_webhook_fields ON public.payments;
CREATE TRIGGER protect_payments_webhook_fields
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_webhook_fields();