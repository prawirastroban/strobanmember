-- Read: allow anon + authenticated (needed for public SPK tracker / shared links)
CREATE POLICY "spk photos are viewable by everyone"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'spk-photos');

CREATE POLICY "internal users can upload spk photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'spk-photos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_cabang')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'mekanik')
  )
);

CREATE POLICY "internal users can update spk photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'spk-photos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_cabang')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'mekanik')
  )
);

CREATE POLICY "internal users can delete spk photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'spk-photos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_cabang')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'mekanik')
  )
);