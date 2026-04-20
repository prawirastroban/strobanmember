
-- Validation trigger for booking status transitions
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text := OLD.status;
  v_new text := NEW.status;
  v_is_staff boolean;
BEGIN
  -- No change, allow
  IF v_old = v_new THEN
    RETURN NEW;
  END IF;

  -- Always allow cancel from non-terminal
  IF v_new = 'cancelled' AND v_old NOT IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- Terminal states cannot change
  IF v_old IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition: booking is % (terminal)', v_old;
  END IF;

  -- Allowed forward transitions
  IF (v_old = 'pending' AND v_new = 'waiting_confirmation')
     OR (v_old = 'waiting_confirmation' AND v_new = 'confirmed')
     OR (v_old = 'confirmed' AND v_new = 'in_progress')
     OR (v_old = 'in_progress' AND v_new = 'completed')
  THEN
    -- Confirm requires paid
    IF v_new = 'confirmed' AND COALESCE(NEW.payment_status, OLD.payment_status) NOT IN ('paid') THEN
      RAISE EXCEPTION 'Cannot confirm booking: payment_status must be paid (current: %)', COALESCE(NEW.payment_status, OLD.payment_status);
    END IF;
    RETURN NEW;
  END IF;

  -- Staff override: allow legacy transitions for backfill (checked_in/finishing/ready/installed)
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
    INTO v_is_staff;
  IF v_is_staff AND v_new IN ('checked_in', 'finishing', 'ready', 'installed') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid status transition: % -> %', v_old, v_new;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_status ON public.bookings;
CREATE TRIGGER trg_validate_booking_status
BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_status_transition();

-- Update set_waiting_confirmation_on_payment to also bump status (not just service_status)
CREATE OR REPLACE FUNCTION public.set_waiting_confirmation_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'success' AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    UPDATE public.bookings
      SET service_status = 'waiting_confirmation',
          payment_status = 'paid',
          status = CASE WHEN status = 'pending' THEN 'waiting_confirmation' ELSE status END,
          updated_at = now()
      WHERE id = NEW.booking_id
        AND status NOT IN ('completed', 'cancelled');
  END IF;
  RETURN NEW;
END;
$$;

-- Update confirm_booking RPC to require paid + correct prior status
CREATE OR REPLACE FUNCTION public.confirm_booking(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'staff')
    INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only staff can confirm bookings');
  END IF;

  SELECT payment_status, status INTO v_paid, v_status
    FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_paid <> 'paid' THEN
    RETURN json_build_object('success', false, 'error', 'Booking belum dibayar (payment_status: ' || v_paid || ')');
  END IF;

  IF v_status NOT IN ('waiting_confirmation', 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'Booking tidak dalam status yang bisa dikonfirmasi (current: ' || v_status || ')');
  END IF;

  -- Move to waiting_confirmation first if still pending (to satisfy transition rule), then confirm.
  IF v_status = 'pending' THEN
    UPDATE public.bookings SET status = 'waiting_confirmation', updated_at = now() WHERE id = _booking_id;
  END IF;

  UPDATE public.bookings
    SET status = 'confirmed',
        service_status = 'in_progress',
        updated_at = now()
    WHERE id = _booking_id;

  -- Move to in_progress (operational start)
  UPDATE public.bookings
    SET status = 'in_progress',
        updated_at = now()
    WHERE id = _booking_id;

  RETURN json_build_object('success', true);
END;
$$;
