ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'service';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS qty_discounts jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.service_categories SET kind = 'product' WHERE slug IN ('tires','ban','sparepart','spareparts','oli','oil');