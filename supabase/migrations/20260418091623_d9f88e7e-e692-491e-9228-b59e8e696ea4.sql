-- Add service_status column to track service progress separately from booking lifecycle
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_status text NOT NULL DEFAULT 'idle';

-- Allowed values: idle, waiting_confirmation, in_progress, done
COMMENT ON COLUMN public.bookings.service_status IS 'Service workflow: idle, waiting_confirmation, in_progress, done';

-- Index for fast realtime filters
CREATE INDEX IF NOT EXISTS idx_bookings_service_status ON public.bookings(service_status);

-- Ensure realtime broadcasts UPDATE diffs with full row
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add bookings to realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;

-- When payment becomes success, automatically move booking into waiting_confirmation
-- (admin/staff must explicitly confirm to start service)
CREATE OR REPLACE FUNCTION public.set_waiting_confirmation_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'success' AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    UPDATE public.bookings
      SET service_status = 'waiting_confirmation',
          payment_status = 'paid',
          updated_at = now()
      WHERE id = NEW.booking_id
        AND service_status NOT IN ('in_progress', 'done');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_waiting_confirmation_on_payment ON public.payments;
CREATE TRIGGER trg_set_waiting_confirmation_on_payment
AFTER INSERT OR UPDATE OF payment_status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_waiting_confirmation_on_payment();

-- Confirm booking RPC: only staff/admin can call. Sets status=confirmed, service_status=in_progress
CREATE OR REPLACE FUNCTION public.confirm_booking(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid;
  v_is_staff boolean;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'staff')
    INTO v_is_staff;

  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only staff can confirm bookings');
  END IF;

  UPDATE public.bookings
    SET status = 'confirmed',
        service_status = 'in_progress',
        updated_at = now()
    WHERE id = _booking_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;