-- Seed default "How to earn points" content
INSERT INTO public.app_settings (key, value)
VALUES (
  'loyalty_how_to_earn',
  '{"title": "Cara mendapatkan poin:", "items": ["100 poin per kunjungan servis", "50 poin untuk referensi", "25 poin untuk ulasan"]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Allow public (anon + authenticated) to read this specific public-safe setting
CREATE POLICY "Public can view loyalty_how_to_earn"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key = 'loyalty_how_to_earn');