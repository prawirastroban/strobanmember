ALTER TABLE public.tires ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Passenger';
ALTER TABLE public.tires ADD COLUMN IF NOT EXISTS logo_url text;