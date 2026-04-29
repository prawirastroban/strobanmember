
-- service_categories
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
ON public.service_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Staff can view all categories"
ON public.service_categories FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert categories"
ON public.service_categories FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update categories"
ON public.service_categories FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete categories"
ON public.service_categories FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_service_categories_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- service_icons
CREATE TABLE public.service_icons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'lucide' CHECK (kind IN ('lucide','emoji','image')),
  value TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_icons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active icons"
ON public.service_icons FOR SELECT
USING (is_active = true);

CREATE POLICY "Staff can view all icons"
ON public.service_icons FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert icons"
ON public.service_icons FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update icons"
ON public.service_icons FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete icons"
ON public.service_icons FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_service_icons_updated_at
BEFORE UPDATE ON public.service_icons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.service_categories (slug, label, sort_order) VALUES
  ('maintenance','Maintenance',1),
  ('tires','Tires',2),
  ('electrical','Electrical',3),
  ('ac','AC',4),
  ('body','Body',5)
ON CONFLICT (slug) DO NOTHING;

-- Seed icons (Lucide)
INSERT INTO public.service_icons (key, kind, value, label, sort_order) VALUES
  ('Wrench','lucide','Wrench','Wrench',1),
  ('Droplets','lucide','Droplets','Droplets',2),
  ('ShieldCheck','lucide','ShieldCheck','ShieldCheck',3),
  ('RotateCcw','lucide','RotateCcw','RotateCcw',4),
  ('Car','lucide','Car','Car',5),
  ('Zap','lucide','Zap','Zap',6),
  ('Wind','lucide','Wind','Wind',7),
  ('ThermometerSun','lucide','ThermometerSun','ThermometerSun',8),
  ('Sparkles','lucide','Sparkles','Sparkles',9),
  ('Settings','lucide','Settings','Settings',10)
ON CONFLICT (key) DO NOTHING;

-- Storage bucket for service icon images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-icons','service-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read service icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-icons');

CREATE POLICY "Staff can upload service icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-icons' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role)));

CREATE POLICY "Staff can update service icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-icons' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role)));

CREATE POLICY "Staff can delete service icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-icons' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role)));
