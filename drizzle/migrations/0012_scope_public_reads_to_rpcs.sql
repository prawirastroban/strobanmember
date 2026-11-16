DROP POLICY IF EXISTS "Signed-in users can view referral settings" ON public.referral_settings;
CREATE POLICY "Staff can view referral settings" ON public.referral_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
DROP POLICY IF EXISTS "Signed-in users can view booking slots" ON public.booking_slots;
CREATE POLICY "Staff can view booking slots" ON public.booking_slots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin_cabang'));
DROP POLICY IF EXISTS "Anyone can view branding" ON public.app_branding;
CREATE POLICY "Staff can view branding" ON public.app_branding FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
DROP POLICY IF EXISTS "Anyone can view legal documents" ON public.legal_documents;
CREATE POLICY "Staff can view legal documents" ON public.legal_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE OR REPLACE FUNCTION public.get_public_referral_settings()
RETURNS TABLE(signup_bonus numeric, booking_commission_pct numeric, min_withdraw numeric, voucher_conversion_rate numeric, voucher_validity_days integer, is_active boolean, point_value_rp numeric, terms_text text, terms_version integer, active_from date, active_until date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT signup_bonus, booking_commission_pct, min_withdraw, voucher_conversion_rate, voucher_validity_days, is_active, point_value_rp, terms_text, terms_version, active_from, active_until
  FROM public.referral_settings WHERE id = 1 AND auth.uid() IS NOT NULL
$$;
CREATE OR REPLACE FUNCTION public.get_booking_slots(_branch text, _date date)
RETURNS TABLE(slot_time text, max_capacity integer, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slot_time::text, max_capacity::integer, status::text FROM public.booking_slots WHERE branch = _branch AND slot_date = _date
$$;
CREATE OR REPLACE FUNCTION public.get_app_branding()
RETURNS TABLE(brand_name text, logo_light_url text, logo_dark_url text, favicon_url text, site_title text, site_description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT brand_name, logo_light_url, logo_dark_url, favicon_url, site_title, site_description FROM public.app_branding WHERE id = 1
$$;
CREATE OR REPLACE FUNCTION public.get_legal_document(_slug text)
RETURNS TABLE(title text, content text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT title, content, updated_at FROM public.legal_documents WHERE slug = _slug
$$;
REVOKE ALL ON FUNCTION public.get_public_referral_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_referral_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_slots(text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_branding() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_legal_document(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view tire images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read service icons" ON storage.objects;
DROP POLICY IF EXISTS "Public can view branding files" ON storage.objects;
DROP POLICY IF EXISTS "Public read payment-assets" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Service images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vehicle images" ON storage.objects;
CREATE POLICY "Staff list public asset buckets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('tire-images','service-icons','branding','payment-assets','avatars','service-images','vehicle-images')
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')));
CREATE POLICY "Owners read own avatars and vehicle images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars','vehicle-images') AND owner_id = (select auth.uid()::text));