CREATE OR REPLACE FUNCTION public.staff_submit_manual_payment_proof(
  _booking_id uuid,
  _method text,
  _sender_name text,
  _sender_bank text,
  _transfer_amount numeric,
  _transfer_date date,
  _proof_url text,
  _notes text,
  _mark_paid boolean DEFAULT true
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_staff boolean;
  v_booking RECORD;
  v_payment_id uuid;
  v_proof_id uuid;
  v_proof_status text;
  v_booking_pay_status text;
BEGIN
  SELECT (
    has_role(v_caller,'admin')
    OR has_role(v_caller,'staff')
    OR has_role(v_caller,'admin_cabang')
  ) INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF _method NOT IN ('transfer','qris') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid method');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  v_proof_status := CASE WHEN _mark_paid THEN 'approved' ELSE 'pending' END;
  v_booking_pay_status := CASE WHEN _mark_paid THEN 'paid' ELSE 'awaiting_confirmation' END;

  SELECT id INTO v_payment_id FROM public.payments WHERE booking_id = _booking_id;
  IF v_payment_id IS NULL THEN
    INSERT INTO public.payments (booking_id, user_id, amount, payment_method, payment_status)
    VALUES (_booking_id, v_booking.user_id, _transfer_amount, _method,
            CASE WHEN _mark_paid THEN 'paid' ELSE 'pending' END)
    RETURNING id INTO v_payment_id;
  ELSE
    UPDATE public.payments
      SET amount = _transfer_amount,
          payment_method = _method,
          payment_status = CASE WHEN _mark_paid THEN 'paid' ELSE 'pending' END,
          updated_at = now()
      WHERE id = v_payment_id;
  END IF;

  INSERT INTO public.manual_payment_proofs (
    booking_id, payment_id, user_id, method,
    sender_name, sender_bank,
    transfer_amount, transfer_date, proof_url, notes,
    status, reviewed_by, reviewed_at
  ) VALUES (
    _booking_id, v_payment_id, v_booking.user_id, _method,
    _sender_name, _sender_bank,
    _transfer_amount, _transfer_date, _proof_url, _notes,
    v_proof_status,
    CASE WHEN _mark_paid THEN v_caller ELSE NULL END,
    CASE WHEN _mark_paid THEN now() ELSE NULL END
  ) RETURNING id INTO v_proof_id;

  UPDATE public.bookings
    SET payment_method = _method,
        payment_status = v_booking_pay_status,
        updated_at = now()
    WHERE id = _booking_id;

  RETURN json_build_object('success', true, 'proof_id', v_proof_id, 'payment_id', v_payment_id);
END;
$$;