ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS point_value_rp numeric NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS terms_text text,
  ADD COLUMN IF NOT EXISTS terms_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_terms_version integer;