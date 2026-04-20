CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old text := OLD.status;
  v_new text := NEW.status;
  v_is_staff boolean;
BEGIN
  IF v_old = v_new THEN
    RETURN NEW;
  END IF;

  -- Always allow cancel from non-terminal
  IF v_new = 'cancelled' AND v_old NOT IN ('completed') THEN
    RETURN NEW;
  END IF;

  -- Terminal states cannot change
  IF v_old IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition: booking is % (terminal)', v_old;
  END IF;

  -- Staff/admin can transition to any non-terminal status
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
    INTO v_is_staff;
  IF v_is_staff THEN
    -- Staff can move forward, backward, or to legacy states freely
    RETURN NEW;
  END IF;

  -- Customer: only the strict forward flow
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