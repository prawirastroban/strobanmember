
ALTER TABLE public.tires ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;
