-- 1. Create booking_slots table
CREATE TABLE public.booking_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch TEXT NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'full', 'closed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (branch, slot_date, slot_time)
);

CREATE INDEX idx_booking_slots_branch_date ON public.booking_slots(branch, slot_date);

-- 2. Enable RLS
ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Anyone can view booking slots"
  ON public.booking_slots FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert slots"
  ON public.booking_slots FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update slots"
  ON public.booking_slots FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete slots"
  ON public.booking_slots FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- 4. updated_at trigger
CREATE TRIGGER update_booking_slots_updated_at
  BEFORE UPDATE ON public.booking_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper function: slot availability
CREATE OR REPLACE FUNCTION public.get_slot_availability(_branch TEXT, _date DATE, _time TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_booking_count INT;
  v_max INT;
  v_status TEXT;
BEGIN
  SELECT * INTO v_slot FROM public.booking_slots
    WHERE branch = _branch AND slot_date = _date AND slot_time = _time;

  SELECT COUNT(*) INTO v_booking_count
    FROM public.bookings
    WHERE branch = _branch
      AND booking_date = _date
      AND booking_time = _time
      AND status NOT IN ('cancelled');

  IF FOUND THEN
    v_max := v_slot.max_capacity;
    v_status := v_slot.status;
  ELSE
    v_max := 3; -- default capacity
    v_status := 'available';
  END IF;

  IF v_status = 'closed' THEN
    RETURN json_build_object('available', false, 'status', 'closed', 'booked', v_booking_count, 'max', v_max, 'remaining', 0);
  END IF;

  IF v_booking_count >= v_max THEN
    RETURN json_build_object('available', false, 'status', 'full', 'booked', v_booking_count, 'max', v_max, 'remaining', 0);
  END IF;

  RETURN json_build_object('available', true, 'status', 'available', 'booked', v_booking_count, 'max', v_max, 'remaining', v_max - v_booking_count);
END;
$$;

-- 6. Trigger to auto-update slot status when bookings change
CREATE OR REPLACE FUNCTION public.sync_slot_status_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_max INT;
  v_branch TEXT;
  v_date DATE;
  v_time TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_branch := OLD.branch;
    v_date := OLD.booking_date;
    v_time := OLD.booking_time;
  ELSE
    v_branch := NEW.branch;
    v_date := NEW.booking_date;
    v_time := NEW.booking_time;
  END IF;

  IF v_branch IS NULL OR v_date IS NULL OR v_time IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.bookings
    WHERE branch = v_branch AND booking_date = v_date AND booking_time = v_time
      AND status NOT IN ('cancelled');

  SELECT max_capacity INTO v_max FROM public.booking_slots
    WHERE branch = v_branch AND slot_date = v_date AND slot_time = v_time;

  IF v_max IS NULL THEN
    v_max := 3;
    -- Auto-create slot record so status is observable
    INSERT INTO public.booking_slots (branch, slot_date, slot_time, max_capacity, status)
    VALUES (v_branch, v_date, v_time, v_max,
      CASE WHEN v_count >= v_max THEN 'full' ELSE 'available' END)
    ON CONFLICT (branch, slot_date, slot_time) DO NOTHING;
  ELSE
    UPDATE public.booking_slots
      SET status = CASE
        WHEN status = 'closed' THEN 'closed'
        WHEN v_count >= v_max THEN 'full'
        ELSE 'available'
      END,
      updated_at = now()
      WHERE branch = v_branch AND slot_date = v_date AND slot_time = v_time;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_slot_status_after_booking
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_slot_status_on_booking();

-- 7. Enable realtime
ALTER TABLE public.booking_slots REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_slots;