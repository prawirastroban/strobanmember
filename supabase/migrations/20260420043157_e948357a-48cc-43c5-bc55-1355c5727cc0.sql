-- Update protect_webhook_fields to allow setting webhook_received_at by staff (it just records confirmation time)
CREATE OR REPLACE FUNCTION public.protect_webhook_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff boolean;
BEGIN
  IF auth.role() = 'authenticated' THEN
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') INTO v_is_staff;

    -- verified_by_webhook is exclusively webhook-controlled
    IF NEW.verified_by_webhook IS DISTINCT FROM OLD.verified_by_webhook AND NEW.verified_by_webhook = true THEN
      RAISE EXCEPTION 'verified_by_webhook=true can only be set by webhook';
    END IF;

    -- midtrans_transaction_id only by webhook
    IF NEW.midtrans_transaction_id IS DISTINCT FROM OLD.midtrans_transaction_id THEN
      RAISE EXCEPTION 'midtrans_transaction_id can only be set by webhook';
    END IF;

    -- If already verified by webhook, lock status from any frontend change
    IF OLD.verified_by_webhook = true AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'payment_status is locked: verified by webhook (source of truth)';
    END IF;

    -- Allow staff to set webhook_received_at (used as confirmation timestamp for manual payments)
    -- Non-staff cannot touch it
    IF NOT v_is_staff AND NEW.webhook_received_at IS DISTINCT FROM OLD.webhook_received_at THEN
      RAISE EXCEPTION 'webhook_received_at can only be set by webhook or staff';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Also: rewrite confirm_manual_payment so it does NOT touch webhook_received_at to be safe,
-- and instead just updates payment_status + updated_at
CREATE OR REPLACE FUNCTION public.confirm_manual_payment(_payment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
  v_payment RECORD;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'staff')
    INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only staff can confirm payments');
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.payment_method = 'midtrans' THEN
    RETURN json_build_object('success', false, 'error', 'Midtrans payments are auto-confirmed via webhook');
  END IF;

  IF v_payment.payment_status = 'success' THEN
    RETURN json_build_object('success', false, 'error', 'Payment already confirmed');
  END IF;

  UPDATE public.payments
    SET payment_status = 'success',
        updated_at = now()
    WHERE id = _payment_id;

  RETURN json_build_object('success', true);
END;
$$;