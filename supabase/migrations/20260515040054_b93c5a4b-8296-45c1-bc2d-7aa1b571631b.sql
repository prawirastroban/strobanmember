ALTER TABLE public.app_branding 
ADD COLUMN IF NOT EXISTS site_title TEXT,
ADD COLUMN IF NOT EXISTS site_description TEXT;