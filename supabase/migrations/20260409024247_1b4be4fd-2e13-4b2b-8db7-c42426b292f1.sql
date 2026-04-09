-- Create storage bucket for tire images
INSERT INTO storage.buckets (id, name, public)
VALUES ('tire-images', 'tire-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Anyone can view tire images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tire-images');

-- Staff/admin can upload
CREATE POLICY "Staff can upload tire images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tire-images'
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'staff')
  )
);

-- Staff/admin can update
CREATE POLICY "Staff can update tire images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tire-images'
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'staff')
  )
);

-- Staff/admin can delete
CREATE POLICY "Staff can delete tire images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tire-images'
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'staff')
  )
);