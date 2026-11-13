DROP POLICY IF EXISTS "Public read popup images" ON storage.objects;
CREATE POLICY "Staff read popup images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'popup-images' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)));

DROP POLICY IF EXISTS "spk photos are viewable by everyone" ON storage.objects;
CREATE POLICY "SPK staff read spk photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'spk-photos' AND (public.is_spk_staff(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)));