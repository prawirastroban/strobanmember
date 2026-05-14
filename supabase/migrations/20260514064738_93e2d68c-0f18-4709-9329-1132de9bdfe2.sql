ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_reminder_sent_at timestamptz;