DROP POLICY IF EXISTS "Anyone can view active banners" ON public.home_banners;
DROP POLICY IF EXISTS "Admins can insert banners" ON public.home_banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.home_banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.home_banners;

CREATE POLICY "Anyone can view active banners"
ON public.home_banners FOR SELECT
USING (
  is_active = true
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can insert banners"
ON public.home_banners FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update banners"
ON public.home_banners FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can delete banners"
ON public.home_banners FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));