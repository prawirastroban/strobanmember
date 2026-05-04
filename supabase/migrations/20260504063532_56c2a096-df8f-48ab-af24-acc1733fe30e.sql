-- 1. Branding table (singleton row)
CREATE TABLE IF NOT EXISTS public.app_branding (
  id INT PRIMARY KEY DEFAULT 1,
  brand_name TEXT NOT NULL DEFAULT 'Sahabat Stroban',
  logo_light_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT app_branding_singleton CHECK (id = 1)
);

INSERT INTO public.app_branding (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view branding"
  ON public.app_branding FOR SELECT
  USING (true);

CREATE POLICY "Staff can update branding"
  ON public.app_branding FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert branding"
  ON public.app_branding FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_app_branding_updated_at
  BEFORE UPDATE ON public.app_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
CREATE POLICY "Public can view branding files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Staff can upload branding files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  );

CREATE POLICY "Staff can update branding files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  );

CREATE POLICY "Staff can delete branding files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  );

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_branding;