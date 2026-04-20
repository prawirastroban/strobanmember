
-- =========================================================
-- 1) Auto-link vehicle_id from plate snapshot when missing
--    + validate vehicle_id belongs to the same user
-- =========================================================
CREATE OR REPLACE FUNCTION public.fill_and_validate_booking_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_match_id uuid;
BEGIN
  -- If vehicle_id is provided, ensure it belongs to the booking user
  IF NEW.vehicle_id IS NOT NULL THEN
    SELECT user_id INTO v_owner FROM public.vehicles WHERE id = NEW.vehicle_id;
    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'Vehicle % not found', NEW.vehicle_id;
    END IF;
    IF v_owner <> NEW.user_id THEN
      RAISE EXCEPTION 'Vehicle does not belong to user';
    END IF;
    RETURN NEW;
  END IF;

  -- Try to auto-link from plate when vehicle_id is missing
  IF NEW.car_plate_number IS NOT NULL AND btrim(NEW.car_plate_number) <> '' THEN
    SELECT id INTO v_match_id
      FROM public.vehicles
      WHERE user_id = NEW.user_id
        AND UPPER(REPLACE(license_plate, ' ', '')) = UPPER(REPLACE(NEW.car_plate_number, ' ', ''))
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1;
    IF v_match_id IS NOT NULL THEN
      NEW.vehicle_id := v_match_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_and_validate_booking_vehicle ON public.bookings;
CREATE TRIGGER trg_fill_and_validate_booking_vehicle
BEFORE INSERT OR UPDATE OF vehicle_id, car_plate_number ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fill_and_validate_booking_vehicle();

-- =========================================================
-- 2) Auto-set next_service_date when booking → completed
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_next_service_date_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_name text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'completed'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.next_service_date IS NULL
  THEN
    v_name := LOWER(COALESCE(NEW.service_name, ''));
    v_days := CASE
      WHEN v_name ~ 'oli|oil'                THEN 90
      WHEN v_name ~ 'tune.?up'               THEN 180
      WHEN v_name ~ 'rem|brake'              THEN 180
      WHEN v_name ~ 'ban|tire|tyre'          THEN 365
      WHEN v_name ~ 'aki|battery'            THEN 365
      WHEN v_name ~ 'ac|air.?cond'           THEN 180
      WHEN v_name ~ 'spooring|balancing'     THEN 180
      ELSE 180
    END;
    NEW.next_service_date := NEW.booking_date + (v_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_next_service_date_on_complete ON public.bookings;
CREATE TRIGGER trg_set_next_service_date_on_complete
BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_next_service_date_on_complete();

-- =========================================================
-- 3) Backfill historical completed bookings
-- =========================================================
UPDATE public.bookings
SET next_service_date = booking_date + (
  CASE
    WHEN LOWER(service_name) ~ 'oli|oil'            THEN 90
    WHEN LOWER(service_name) ~ 'tune.?up'           THEN 180
    WHEN LOWER(service_name) ~ 'rem|brake'          THEN 180
    WHEN LOWER(service_name) ~ 'ban|tire|tyre'     THEN 365
    WHEN LOWER(service_name) ~ 'aki|battery'        THEN 365
    WHEN LOWER(service_name) ~ 'ac|air.?cond'       THEN 180
    WHEN LOWER(service_name) ~ 'spooring|balancing' THEN 180
    ELSE 180
  END || ' days'
)::interval
WHERE status = 'completed' AND next_service_date IS NULL;

-- =========================================================
-- 4) Backfill vehicle_id on past bookings via plate match
-- =========================================================
UPDATE public.bookings b
SET vehicle_id = v.id
FROM public.vehicles v
WHERE b.vehicle_id IS NULL
  AND b.car_plate_number IS NOT NULL
  AND v.user_id = b.user_id
  AND UPPER(REPLACE(v.license_plate, ' ', '')) = UPPER(REPLACE(b.car_plate_number, ' ', ''));
