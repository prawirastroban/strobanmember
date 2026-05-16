-- Branches: koordinat untuk Haversine
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Bookings: titik jemput + timestamp tahapan pick-up
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_accuracy_m INTEGER,
  ADD COLUMN IF NOT EXISTS pickup_source TEXT,
  ADD COLUMN IF NOT EXISTS pickup_dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_at_workshop_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_nearest_branch_id UUID REFERENCES public.branches(id);

-- Seed koordinat awal (perkiraan berdasarkan alamat cabang)
UPDATE public.branches SET lat = -6.9516775, lng = 107.6106332 WHERE slug = 'bandung' AND lat IS NULL;
UPDATE public.branches SET lat = -7.3000,    lng = 108.2200    WHERE slug = 'tasikmalaya' AND lat IS NULL;
UPDATE public.branches SET lat = -7.3274,    lng = 108.2218    WHERE slug = 'strobanexpresstasik' AND lat IS NULL;
UPDATE public.branches SET lat = -7.3000,    lng = 108.2200    WHERE slug = 'jstationtasik' AND lat IS NULL;
UPDATE public.branches SET lat = -6.7321,    lng = 108.5523    WHERE slug = 'cirebon' AND lat IS NULL;
UPDATE public.branches SET lat = -6.9700,    lng = 108.4830    WHERE slug = 'kuningan' AND lat IS NULL;
UPDATE public.branches SET lat = -7.7470,    lng = 110.3700    WHERE slug = 'yogyakarta' AND lat IS NULL;
UPDATE public.branches SET lat = -6.3168,    lng = 106.6668    WHERE slug = 'bsd' AND lat IS NULL;