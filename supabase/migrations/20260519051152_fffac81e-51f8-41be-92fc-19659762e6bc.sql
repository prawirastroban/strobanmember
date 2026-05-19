
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old text := OLD.status;
  v_new text := NEW.status;
  v_is_staff boolean;
BEGIN
  IF v_old = v_new THEN
    RETURN NEW;
  END IF;

  IF v_new = 'cancelled' AND v_old NOT IN ('completed') THEN
    RETURN NEW;
  END IF;

  IF v_old IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition: booking is % (terminal)', v_old;
  END IF;

  SELECT public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
      OR public.has_role(auth.uid(), 'admin_cabang')
    INTO v_is_staff;
  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  IF (v_old = 'pending' AND v_new = 'waiting_confirmation')
     OR (v_old = 'waiting_confirmation' AND v_new = 'confirmed')
     OR (v_old = 'confirmed' AND v_new = 'in_progress')
     OR (v_old = 'in_progress' AND v_new = 'completed')
  THEN
    IF v_new = 'confirmed' AND COALESCE(NEW.payment_status, OLD.payment_status) NOT IN ('paid') THEN
      RAISE EXCEPTION 'Cannot confirm booking: payment_status must be paid (current: %)', COALESCE(NEW.payment_status, OLD.payment_status);
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid status transition: % -> %', v_old, v_new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_booking(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
  v_paid text;
  v_status text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT public.has_role(v_caller, 'admin')
      OR public.has_role(v_caller, 'staff')
      OR public.has_role(v_caller, 'admin_cabang')
    INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only staff can confirm bookings');
  END IF;

  SELECT payment_status, status INTO v_paid, v_status
    FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_paid NOT IN ('paid', 'pay_later') THEN
    RETURN json_build_object('success', false, 'error', 'Booking belum dibayar (payment_status: ' || v_paid || ')');
  END IF;

  IF v_status NOT IN ('waiting_confirmation', 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'Booking tidak dalam status yang bisa dikonfirmasi (current: ' || v_status || ')');
  END IF;

  UPDATE public.bookings
    SET status = 'confirmed',
        service_status = 'confirmed',
        updated_at = now()
    WHERE id = _booking_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_booking_cancellation(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
  v_owner uuid;
  v_service text;
BEGIN
  v_caller := auth.uid();
  SELECT public.has_role(v_caller, 'admin')
      OR public.has_role(v_caller, 'staff')
      OR public.has_role(v_caller, 'admin_cabang')
    INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT user_id, service_name INTO v_owner, v_service
    FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  UPDATE public.bookings
    SET status = 'cancelled',
        cancel_requested = false,
        updated_at = now()
    WHERE id = _booking_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (v_owner, 'Pembatalan Disetujui',
    'Permintaan pembatalan booking ' || v_service || ' telah disetujui.',
    'cancel_approved',
    jsonb_build_object('booking_id', _booking_id));

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_booking_cancellation(_booking_id uuid, _reason text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
  v_owner uuid;
  v_service text;
BEGIN
  v_caller := auth.uid();
  SELECT public.has_role(v_caller, 'admin')
      OR public.has_role(v_caller, 'staff')
      OR public.has_role(v_caller, 'admin_cabang')
    INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT user_id, service_name INTO v_owner, v_service
    FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  UPDATE public.bookings
    SET cancel_requested = false,
        cancel_reason = NULL,
        cancel_requested_at = NULL,
        updated_at = now()
    WHERE id = _booking_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (v_owner, 'Permintaan Pembatalan Ditolak',
    'Permintaan pembatalan booking ' || v_service || ' ditolak.' ||
    CASE WHEN _reason IS NOT NULL THEN ' Alasan: ' || _reason ELSE '' END,
    'cancel_rejected',
    jsonb_build_object('booking_id', _booking_id, 'reject_reason', _reason));

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_webhook_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_is_staff boolean;
BEGIN
  IF auth.role() = 'authenticated' THEN
    SELECT public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'staff')
        OR public.has_role(auth.uid(), 'admin_cabang')
      INTO v_is_staff;

    IF NEW.verified_by_webhook IS DISTINCT FROM OLD.verified_by_webhook AND NEW.verified_by_webhook = true THEN
      RAISE EXCEPTION 'verified_by_webhook=true can only be set by webhook';
    END IF;

    IF NEW.midtrans_transaction_id IS DISTINCT FROM OLD.midtrans_transaction_id THEN
      RAISE EXCEPTION 'midtrans_transaction_id can only be set by webhook';
    END IF;

    IF OLD.verified_by_webhook = true AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'payment_status is locked: verified by webhook (source of truth)';
    END IF;

    IF NOT v_is_staff AND NEW.webhook_received_at IS DISTINCT FROM OLD.webhook_received_at THEN
      RAISE EXCEPTION 'webhook_received_at can only be set by webhook or staff';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
