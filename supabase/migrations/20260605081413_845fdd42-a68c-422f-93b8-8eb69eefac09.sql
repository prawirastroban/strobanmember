ALTER TABLE public.pwa_settings
  ADD COLUMN IF NOT EXISTS notification_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_icon_url text,
  ADD COLUMN IF NOT EXISTS notification_sound_url text,
  ADD COLUMN IF NOT EXISTS default_ringtone      text    NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS default_vibrate       boolean NOT NULL DEFAULT true;