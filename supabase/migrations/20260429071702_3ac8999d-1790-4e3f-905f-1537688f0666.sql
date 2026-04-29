-- Track every booking lifecycle step: pending/waiting_confirmation -> confirmed -> checked_in -> in_progress -> completed
-- Also capture the initial booking creation as the first log entry, and continue tracking service_status.

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_at TIMESTAMPTZ;
  v_minutes INT;
BEGIN
  -- INSERT: log the initial booking status as the first step
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_logs (
      booking_id, from_status, to_status, changed_by, changed_at, duration_from_prev_minutes
    ) VALUES (
      NEW.id, NULL, COALESCE(NEW.status, 'pending'), auth.uid(), COALESCE(NEW.created_at, now()), NULL
    );
    RETURN NEW;
  END IF;

  -- UPDATE: log when main lifecycle status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT changed_at INTO v_prev_at
      FROM public.booking_status_logs
      WHERE booking_id = NEW.id
      ORDER BY changed_at DESC
      LIMIT 1;

    IF v_prev_at IS NOT NULL THEN
      v_minutes := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_prev_at))/60)::int;
    ELSE
      v_minutes := GREATEST(0, EXTRACT(EPOCH FROM (now() - NEW.created_at))/60)::int;
    END IF;

    INSERT INTO public.booking_status_logs (
      booking_id, from_status, to_status, changed_by, changed_at, duration_from_prev_minutes
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), now(), v_minutes
    );
  END IF;

  -- UPDATE: also log service_status sub-stage changes (kept for backward compat)
  IF TG_OP = 'UPDATE' AND OLD.service_status IS DISTINCT FROM NEW.service_status THEN
    SELECT changed_at INTO v_prev_at
      FROM public.booking_status_logs
      WHERE booking_id = NEW.id
      ORDER BY changed_at DESC
      LIMIT 1;

    IF v_prev_at IS NOT NULL THEN
      v_minutes := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_prev_at))/60)::int;
    ELSE
      v_minutes := GREATEST(0, EXTRACT(EPOCH FROM (now() - NEW.created_at))/60)::int;
    END IF;

    INSERT INTO public.booking_status_logs (
      booking_id, from_status, to_status, changed_by, changed_at, duration_from_prev_minutes
    ) VALUES (
      NEW.id, OLD.service_status, NEW.service_status, auth.uid(), now(), v_minutes
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate trigger to fire on INSERT as well
DROP TRIGGER IF EXISTS trg_log_booking_status_change ON public.bookings;
CREATE TRIGGER trg_log_booking_status_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_status_change();