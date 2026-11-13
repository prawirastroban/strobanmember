DROP POLICY IF EXISTS "Anyone can view referral settings" ON public.referral_settings;
CREATE POLICY "Signed-in users can view referral settings" ON public.referral_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view booking slots" ON public.booking_slots;
CREATE POLICY "Signed-in users can view booking slots" ON public.booking_slots FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pwa_settings public read" ON public.pwa_settings;
CREATE POLICY "pwa_settings public read" ON public.pwa_settings FOR SELECT TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can log popup events" ON public.promo_popup_events;
CREATE POLICY "Log own popup events" ON public.promo_popup_events FOR INSERT TO anon, authenticated
WITH CHECK ((user_id IS NULL AND auth.uid() IS NULL) OR user_id = auth.uid());

DROP POLICY IF EXISTS "pwa_events public insert" ON public.pwa_events;
CREATE POLICY "pwa_events own insert" ON public.pwa_events FOR INSERT TO anon, authenticated
WITH CHECK ((user_id IS NULL AND auth.uid() IS NULL) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.customer_complaints;
CREATE POLICY "Submit own complaints" ON public.customer_complaints FOR INSERT TO anon, authenticated
WITH CHECK ((user_id IS NULL AND auth.uid() IS NULL) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can upload internal-reports" ON storage.objects;
CREATE POLICY "Authenticated users can upload internal-reports" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'internal-reports' AND (storage.foldername(name))[1] = (select auth.uid()::text));