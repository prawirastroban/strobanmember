
-- 1. Table
CREATE TABLE IF NOT EXISTS public.booking_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_from_prev_minutes INTEGER
);

CREATE INDEX IF NOT EXISTS idx_booking_status_logs_booking ON public.booking_status_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_logs_changed_at ON public.booking_status_logs(changed_at DESC);

ALTER TABLE public.booking_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all status logs"
ON public.booking_status_logs FOR SELECT
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role) OR has_role(auth.uid(),'admin_cabang'::app_role));

CREATE POLICY "Staff can insert status logs"
ON public.booking_status_logs FOR INSERT
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role) OR has_role(auth.uid(),'admin_cabang'::app_role) OR true);

CREATE POLICY "Users can view own booking status logs"
ON public.booking_status_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = booking_status_logs.booking_id
    AND b.user_id = auth.uid()
));

-- 2. Trigger function
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_at TIMESTAMPTZ;
  v_minutes INT;
BEGIN
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
$$;

DROP TRIGGER IF EXISTS trg_log_booking_status_change ON public.bookings;
CREATE TRIGGER trg_log_booking_status_change
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.log_booking_status_change();
