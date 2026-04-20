-- Add vehicle_id linkage to bookings (nullable so historical rows remain valid)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS vehicle_id uuid;

CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings(vehicle_id);

-- Validation trigger: every booking must have vehicle_id OR a snapshot (car_type + car_plate_number)
CREATE OR REPLACE FUNCTION public.validate_booking_vehicle_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.vehicle_id IS NULL
     AND (NEW.car_type IS NULL OR btrim(NEW.car_type) = ''
       OR NEW.car_plate_number IS NULL OR btrim(NEW.car_plate_number) = '')
  THEN
    RAISE EXCEPTION 'Booking must have vehicle_id or a vehicle snapshot (car_type + car_plate_number)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_vehicle_link ON public.bookings;
CREATE TRIGGER trg_validate_booking_vehicle_link
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_vehicle_link();

-- Auto-fill snapshot from vehicles if vehicle_id provided but snapshot missing
CREATE OR REPLACE FUNCTION public.fill_booking_vehicle_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand text;
  v_model text;
  v_plate text;
BEGIN
  IF NEW.vehicle_id IS NOT NULL
     AND (NEW.car_type IS NULL OR btrim(NEW.car_type) = ''
       OR NEW.car_plate_number IS NULL OR btrim(NEW.car_plate_number) = '')
  THEN
    SELECT brand, model, license_plate INTO v_brand, v_model, v_plate
      FROM public.vehicles WHERE id = NEW.vehicle_id;
    IF v_brand IS NOT NULL THEN
      IF NEW.car_type IS NULL OR btrim(NEW.car_type) = '' THEN
        NEW.car_type := v_brand || ' ' || v_model;
      END IF;
      IF NEW.car_plate_number IS NULL OR btrim(NEW.car_plate_number) = '' THEN
        NEW.car_plate_number := v_plate;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_booking_vehicle_snapshot ON public.bookings;
CREATE TRIGGER trg_fill_booking_vehicle_snapshot
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_booking_vehicle_snapshot();