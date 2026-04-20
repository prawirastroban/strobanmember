-- Add next_service_date to bookings for reminder system
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS next_service_date date;

CREATE INDEX IF NOT EXISTS idx_bookings_next_service_date
  ON public.bookings(next_service_date)
  WHERE next_service_date IS NOT NULL;

-- When a booking is marked completed, also bump the linked vehicle's last_service_date
CREATE OR REPLACE FUNCTION public.sync_vehicle_last_service_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'completed'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.vehicle_id IS NOT NULL
  THEN
    UPDATE public.vehicles
      SET last_service_date = NEW.booking_date,
          updated_at = now()
      WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vehicle_last_service_date ON public.bookings;
CREATE TRIGGER trg_sync_vehicle_last_service_date
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vehicle_last_service_date();