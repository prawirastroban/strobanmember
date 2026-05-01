ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_color text;

CREATE INDEX IF NOT EXISTS idx_services_show_on_home
  ON public.services (show_on_home, home_sort_order)
  WHERE show_on_home = true;