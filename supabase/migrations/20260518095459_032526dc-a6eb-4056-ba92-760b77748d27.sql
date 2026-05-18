ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by uuid;
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON public.bookings(created_by);