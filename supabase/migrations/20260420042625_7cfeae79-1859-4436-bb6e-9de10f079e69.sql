
-- RPC: confirm a manual (cash/transfer/qris/pay_at_workshop) payment by staff
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
        verified_by_webhook = false,
        webhook_received_at = now(),
        updated_at = now()
    WHERE id = _payment_id;

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: reject a manual payment
CREATE OR REPLACE FUNCTION public.reject_manual_payment(_payment_id uuid, _reason text DEFAULT NULL)
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
  SELECT public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'staff') INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;
  IF v_payment.payment_method = 'midtrans' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reject midtrans payments here');
  END IF;

  UPDATE public.payments
    SET payment_status = 'failed', updated_at = now()
    WHERE id = _payment_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (v_payment.user_id, 'Pembayaran Ditolak',
    'Pembayaran Rp ' || v_payment.amount || ' ditolak staff.' ||
    CASE WHEN _reason IS NOT NULL THEN ' Alasan: ' || _reason ELSE '' END,
    'payment',
    jsonb_build_object('payment_id', _payment_id, 'reason', _reason));

  RETURN json_build_object('success', true);
END;
$$;
