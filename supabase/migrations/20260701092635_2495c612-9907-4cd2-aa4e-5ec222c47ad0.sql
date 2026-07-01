ALTER TABLE public.app_releases ADD COLUMN IF NOT EXISTS build_number integer;
ALTER TABLE public.app_releases ADD COLUMN IF NOT EXISTS release_channel text NOT NULL DEFAULT 'production';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_releases_release_channel_check') THEN
    ALTER TABLE public.app_releases DROP CONSTRAINT app_releases_release_channel_check;
  END IF;
END $$;
ALTER TABLE public.app_releases ADD CONSTRAINT app_releases_release_channel_check CHECK (release_channel IN ('production','beta'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_releases_status_check') THEN
    ALTER TABLE public.app_releases DROP CONSTRAINT app_releases_status_check;
  END IF;
END $$;
ALTER TABLE public.app_releases ADD CONSTRAINT app_releases_status_check CHECK (status IN ('draft','published','archived'));