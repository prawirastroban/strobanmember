
-- Tabel booking_reviews
CREATE TABLE public.booking_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  service_quality text NOT NULL DEFAULT 'puas',
  would_recommend text NOT NULL DEFAULT 'belum_yakin',
  follow_up_status text NOT NULL DEFAULT 'completed',
  follow_up_method text,
  follow_up_at timestamptz DEFAULT now(),
  internal_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage booking reviews" ON public.booking_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Users view own booking reviews" ON public.booking_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER trg_booking_reviews_updated_at
  BEFORE UPDATE ON public.booking_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tambah kolom di bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_reminder_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_reminder_dismissed boolean NOT NULL DEFAULT false;

-- Trigger: set reminder ketika service_status menjadi completed
CREATE OR REPLACE FUNCTION public.set_review_reminder_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.service_status = 'completed'
     AND (OLD.service_status IS DISTINCT FROM 'completed')
     AND NEW.review_reminder_due_at IS NULL THEN
    NEW.review_reminder_due_at := now() + interval '1 day';
    NEW.review_reminder_dismissed := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_review_reminder ON public.bookings;
CREATE TRIGGER trg_set_review_reminder
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_review_reminder_due();

-- Backfill untuk booking yang sudah completed
UPDATE public.bookings
SET review_reminder_due_at = COALESCE(updated_at, created_at) + interval '1 day'
WHERE service_status = 'completed'
  AND review_reminder_due_at IS NULL;
