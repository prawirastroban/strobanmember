CREATE OR REPLACE FUNCTION public.confirm_manual_payment(_payment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_admin boolean;
  v_is_staff boolean;
  v_is_admin_cabang boolean;
  v_payment RECORD;
  v_booking RECORD;
  v_allowed boolean;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT public.has_role(v_caller, 'admin') INTO v_is_admin;
  SELECT public.has_role(v_caller, 'staff') INTO v_is_staff;
  SELECT public.has_role(v_caller, 'admin_cabang') INTO v_is_admin_cabang;

  IF NOT (v_is_admin OR v_is_staff OR v_is_admin_cabang) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  -- For admin_cabang: ensure payment belongs to their assigned branch
  IF v_is_admin_cabang AND NOT (v_is_admin OR v_is_staff) THEN
    SELECT * INTO v_booking FROM public.bookings WHERE id = v_payment.booking_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Booking not found');
    END IF;
    SELECT public.is_admin_cabang_for(v_booking.branch) INTO v_allowed;
    IF NOT v_allowed THEN
      RETURN json_build_object('success', false, 'error', 'Unauthorized: payment outside your branch');
    END IF;
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

  -- For pay_at_workshop confirmed by admin/admin_cabang: also auto-confirm the booking
  IF v_payment.payment_method = 'pay_at_workshop' AND (v_is_admin OR v_is_admin_cabang) THEN
    UPDATE public.bookings
      SET status = 'confirmed',
          service_status = 'confirmed',
          payment_status = 'paid',
          updated_at = now()
      WHERE id = v_payment.booking_id
        AND status NOT IN ('completed', 'cancelled');
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;