-- Scope: SELECT policies on public.home_banners only.
-- Audited baseline: one mixed SELECT policy and three authenticated write policies.
ALTER POLICY "Anyone can view active banners"
ON public.home_banners
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Staff can view all banners"
ON public.home_banners
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
);

-- Manual rollback (review and apply separately; NOT executed here):
-- DROP POLICY "Staff can view all banners" ON public.home_banners;
-- ALTER POLICY "Anyone can view active banners"
-- ON public.home_banners
-- TO public
-- USING (
--   (is_active = true)
--   OR public.has_role(auth.uid(), 'admin'::public.app_role)
--   OR public.has_role(auth.uid(), 'staff'::public.app_role)
-- );