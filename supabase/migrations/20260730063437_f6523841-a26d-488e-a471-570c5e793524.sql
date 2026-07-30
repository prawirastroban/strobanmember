CREATE TABLE public.home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  subtitle text,
  show_text boolean NOT NULL DEFAULT true,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_banners TO authenticated;
GRANT ALL ON public.home_banners TO service_role;

ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
ON public.home_banners FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert banners"
ON public.home_banners FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banners"
ON public.home_banners FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banners"
ON public.home_banners FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER home_banners_set_updated_at
BEFORE UPDATE ON public.home_banners
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_home_banners_active_sort ON public.home_banners (is_active, sort_order);