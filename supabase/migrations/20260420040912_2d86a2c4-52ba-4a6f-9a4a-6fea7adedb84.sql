-- Add cancel request columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP WITH TIME ZONE;

-- Function: customer requests cancellation
CREATE OR REPLACE FUNCTION public.request_booking_cancellation(_booking_id uuid, _reason text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_owner uuid;
  v_status text;
  v_service text;
  staff_record RECORD;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT user_id, status, service_name INTO v_owner, v_status, v_service
    FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;
  IF v_owner <> v_caller THEN
    RETURN json_build_object('success', false, 'error', 'Not your booking');
  END IF;
  IF v_status IN ('completed', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Booking sudah ' || v_status);
  END IF;

  UPDATE public.bookings
    SET cancel_requested = true,
        cancel_reason = COALESCE(NULLIF(btrim(_reason), ''), 'Tidak ada alasan'),
        cancel_requested_at = now(),
        updated_at = now()
    WHERE id = _booking_id;

  -- Notify all staff/admin
  FOR staff_record IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'staff')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (staff_record.user_id, 'Permintaan Pembatalan',
      'Customer meminta pembatalan: ' || v_service,
      'cancel_request',
      jsonb_build_object('booking_id', _booking_id, 'reason', _reason));
  END LOOP;

  RETURN json_build_object('success', true);
END;
$$;

-- Function: staff approves cancellation (actually cancel)
CREATE OR REPLACE FUNCTION public.approve_booking_cancellation(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
  v_owner uuid;
  v_service text;
BEGIN
  v_caller := auth.uid();
  SELECT public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'staff') INTO v_is_staff;
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
$$;

-- Function: staff rejects cancellation
CREATE OR REPLACE FUNCTION public.reject_booking_cancellation(_booking_id uuid, _reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
  v_owner uuid;
  v_service text;
BEGIN
  v_caller := auth.uid();
  SELECT public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'staff') INTO v_is_staff;
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
$$;