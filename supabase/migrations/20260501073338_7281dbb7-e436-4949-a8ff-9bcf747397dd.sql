ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.services.media_urls IS 'Array of media items: [{ "url": "...", "type": "image" | "video" }]';