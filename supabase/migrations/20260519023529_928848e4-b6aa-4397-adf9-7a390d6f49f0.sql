
-- 1. Helper: ordinal of booking status
CREATE OR REPLACE FUNCTION public.booking_status_ordinal(_status text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _status
    WHEN 'pending' THEN 1
    WHEN 'waiting_confirmation' THEN 2
    WHEN 'confirmed' THEN 3
    WHEN 'checked_in' THEN 4
    WHEN 'in_progress' THEN 5
    WHEN 'completed' THEN 6
    WHEN 'cancelled' THEN 99
    ELSE 0
  END
$$;

-- 2. Trigger function: forward-only on bookings
CREATE OR REPLACE FUNCTION public.enforce_forward_only_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / system context (no auth.uid) is allowed (webhooks, edge functions)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Owner (staff) can override
  IF has_role(auth.uid(), 'staff') THEN
    RETURN NEW;
  END IF;
  -- Booking status forward-only
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('completed','cancelled') THEN
      RAISE EXCEPTION 'FORWARD_ONLY_BOOKING_STATUS: Status sudah final (%). Ajukan koreksi ke Owner.', OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status <> 'cancelled'
       AND public.booking_status_ordinal(NEW.status) < public.booking_status_ordinal(OLD.status) THEN
      RAISE EXCEPTION 'FORWARD_ONLY_BOOKING_STATUS: Status tidak boleh mundur dari % ke %. Ajukan koreksi ke Owner.', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  -- Payment status lock from paid
  IF OLD.payment_status = 'paid' AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'FORWARD_ONLY_PAYMENT_STATUS: Pembayaran sudah Lunas. Ajukan koreksi ke Owner.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_forward_only_booking ON public.bookings;
CREATE TRIGGER trg_enforce_forward_only_booking
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forward_only_booking();

-- 3. Trigger on payments
CREATE OR REPLACE FUNCTION public.enforce_forward_only_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'staff') THEN
    RETURN NEW;
  END IF;
  IF OLD.payment_status = 'paid' AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'FORWARD_ONLY_PAYMENT_STATUS: Pembayaran sudah Lunas. Ajukan koreksi ke Owner.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_forward_only_payment ON public.payments;
CREATE TRIGGER trg_enforce_forward_only_payment
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forward_only_payment();

-- 4. status_change_requests table
CREATE TABLE IF NOT EXISTS public.status_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  requester_role text,
  target_table text NOT NULL CHECK (target_table IN ('bookings','payments')),
  field text NOT NULL,
  from_value text,
  to_value text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scr_booking ON public.status_change_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_scr_status ON public.status_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_scr_requested_by ON public.status_change_requests(requested_by);

ALTER TABLE public.status_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users insert own correction requests" ON public.status_change_requests;
CREATE POLICY "Internal users insert own correction requests"
  ON public.status_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (
      has_role(auth.uid(),'admin')
      OR has_role(auth.uid(),'admin_cabang')
      OR has_role(auth.uid(),'staff')
    )
  );

DROP POLICY IF EXISTS "Staff and requester view correction requests" ON public.status_change_requests;
CREATE POLICY "Staff and requester view correction requests"
  ON public.status_change_requests FOR SELECT
  USING (has_role(auth.uid(),'staff') OR requested_by = auth.uid());

DROP POLICY IF EXISTS "Staff update correction requests" ON public.status_change_requests;
CREATE POLICY "Staff update correction requests"
  ON public.status_change_requests FOR UPDATE
  USING (has_role(auth.uid(),'staff'))
  WITH CHECK (has_role(auth.uid(),'staff'));

-- 5. Apply / reject functions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.apply_status_change_request(_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.status_change_requests%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(),'staff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT * INTO r FROM public.status_change_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'ALREADY_REVIEWED'; END IF;

  IF r.target_table = 'bookings' AND r.field = 'status' THEN
    UPDATE public.bookings SET status = r.to_value, updated_at = now() WHERE id = r.booking_id;
  ELSIF r.target_table = 'bookings' AND r.field = 'payment_status' THEN
    UPDATE public.bookings SET payment_status = r.to_value, updated_at = now() WHERE id = r.booking_id;
    UPDATE public.payments  SET payment_status = r.to_value, updated_at = now() WHERE booking_id = r.booking_id;
  ELSIF r.target_table = 'payments' AND r.field = 'payment_status' THEN
    UPDATE public.payments  SET payment_status = r.to_value, updated_at = now() WHERE booking_id = r.booking_id;
    UPDATE public.bookings  SET payment_status = r.to_value, updated_at = now() WHERE id = r.booking_id;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_FIELD';
  END IF;

  UPDATE public.status_change_requests
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = _note,
        updated_at = now()
    WHERE id = _id;

  INSERT INTO public.notifications(user_id, title, message, type, metadata)
  VALUES (
    r.requested_by,
    'Permintaan koreksi disetujui',
    format('Perubahan %s pada booking diterima.', r.field),
    'success',
    jsonb_build_object('booking_id', r.booking_id, 'request_id', _id)
  );
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_status_change_request(_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.status_change_requests%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(),'staff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT * INTO r FROM public.status_change_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'ALREADY_REVIEWED'; END IF;
  UPDATE public.status_change_requests
    SET status='rejected',
        reviewed_by=auth.uid(),
        reviewed_at=now(),
        review_note=_note,
        updated_at=now()
    WHERE id=_id;
  INSERT INTO public.notifications(user_id, title, message, type, metadata)
  VALUES (
    r.requested_by,
    'Permintaan koreksi ditolak',
    COALESCE(_note, 'Permintaan tidak dapat diproses.'),
    'error',
    jsonb_build_object('booking_id', r.booking_id, 'request_id', _id)
  );
  RETURN jsonb_build_object('success', true);
END;
$$;
