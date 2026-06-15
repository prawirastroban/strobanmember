
CREATE POLICY "Public read popup images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'popup-images');

CREATE POLICY "Admins upload popup images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'popup-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update popup images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'popup-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete popup images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'popup-images' AND public.has_role(auth.uid(), 'admin'));
