ALTER TABLE public.pwa_settings
  ADD COLUMN IF NOT EXISTS android_store_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS android_store_url text NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.bengkelstroban.app&pcampaignid=web_share',
  ADD COLUMN IF NOT EXISTS android_open_in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS android_banner_title text,
  ADD COLUMN IF NOT EXISTS android_banner_subtitle text;