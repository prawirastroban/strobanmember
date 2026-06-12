
-- Seed app version control keys into app_settings and allow public read for these keys
INSERT INTO public.app_settings (key, value) VALUES
  ('app_version', '{"version":"1.0.0","released_at":null,"release_notes":"","force_refresh":false}'::jsonb),
  ('app_min_version', '{"version":"1.0.0"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Public read policy limited to version keys only (needed so unauthenticated visitors can check)
DROP POLICY IF EXISTS "Public can read app version keys" ON public.app_settings;
CREATE POLICY "Public can read app version keys"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (key IN ('app_version', 'app_min_version'));

GRANT SELECT ON public.app_settings TO anon;
