ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS vehicle_criteria text,
  ADD COLUMN IF NOT EXISTS warranty_info text;