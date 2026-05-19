CREATE OR REPLACE FUNCTION public.confirm_booking(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
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

  SELECT status INTO v_status FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
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