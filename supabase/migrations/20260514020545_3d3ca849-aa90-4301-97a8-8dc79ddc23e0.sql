ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS active_from date,
  ADD COLUMN IF NOT EXISTS active_until date;