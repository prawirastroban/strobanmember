ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS thumbnail_position text NOT NULL DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS thumbnail_zoom numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS thumbnail_ratio text NOT NULL DEFAULT '1:1',
  ADD COLUMN IF NOT EXISTS thumbnail_bg text;