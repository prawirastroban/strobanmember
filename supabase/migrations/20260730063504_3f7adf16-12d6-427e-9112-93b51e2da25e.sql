CREATE POLICY "Public can view home banner settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (key = 'home.banner_settings');