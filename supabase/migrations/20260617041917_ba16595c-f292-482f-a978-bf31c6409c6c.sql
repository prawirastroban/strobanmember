
-- promo_popups
DROP POLICY IF EXISTS "Admins can view all popups" ON public.promo_popups;
DROP POLICY IF EXISTS "Admins can insert popups" ON public.promo_popups;
DROP POLICY IF EXISTS "Admins can update popups" ON public.promo_popups;
DROP POLICY IF EXISTS "Admins can delete popups" ON public.promo_popups;

CREATE POLICY "Staff can view all popups"
  ON public.promo_popups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert popups"
  ON public.promo_popups FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update popups"
  ON public.promo_popups FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can delete popups"
  ON public.promo_popups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- promo_popup_events
DROP POLICY IF EXISTS "Admins can view popup events" ON public.promo_popup_events;
CREATE POLICY "Staff can view popup events"
  ON public.promo_popup_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- storage: popup-images
DROP POLICY IF EXISTS "Admins upload popup images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update popup images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete popup images" ON storage.objects;

CREATE POLICY "Staff upload popup images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'popup-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

CREATE POLICY "Staff update popup images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'popup-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));

CREATE POLICY "Staff delete popup images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'popup-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
