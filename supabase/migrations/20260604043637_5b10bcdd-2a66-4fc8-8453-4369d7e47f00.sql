
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS queue_estimated_start timestamptz,
  ADD COLUMN IF NOT EXISTS queue_note text,
  ADD COLUMN IF NOT EXISTS queue_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS queue_set_by uuid;

-- Auto-clear queue fields when booking moves past checked_in
CREATE OR REPLACE FUNCTION public.clear_queue_on_status_advance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('in_progress','completed','cancelled')
     AND (NEW.queue_estimated_start IS NOT NULL OR NEW.queue_note IS NOT NULL)
  THEN
    NEW.queue_estimated_start := NULL;
    NEW.queue_note := NULL;
    NEW.queue_set_at := NULL;
    NEW.queue_set_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_queue_on_status_advance ON public.bookings;
CREATE TRIGGER trg_clear_queue_on_status_advance
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.clear_queue_on_status_advance();
