DROP POLICY IF EXISTS "Owner can insert releases" ON public.app_releases;
DROP POLICY IF EXISTS "Owner can update releases" ON public.app_releases;
DROP POLICY IF EXISTS "Owner can delete releases" ON public.app_releases;

CREATE POLICY "Admins or staff can insert releases" ON public.app_releases
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE POLICY "Admins or staff can update releases" ON public.app_releases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE POLICY "Admins or staff can delete releases" ON public.app_releases
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

-- Backfill: create app_releases rows for versions published in app_settings but missing in app_releases.
INSERT INTO public.app_releases (version, status, released_at, summary, force_update, deployment_type, priority)
SELECT
  s.value->>'version',
  'published',
  COALESCE((s.value->>'released_at')::timestamptz, s.updated_at, now()),
  NULLIF(s.value->>'release_notes',''),
  COALESCE((s.value->>'force_refresh')::boolean, false),
  COALESCE(s.value->>'deployment_type','optional'),
  CASE WHEN COALESCE(s.value->>'deployment_type','optional')='force' THEN 'high'
       WHEN COALESCE(s.value->>'deployment_type','optional')='recommended' THEN 'normal'
       ELSE 'low' END
FROM public.app_settings s
WHERE s.key = 'app_version'
  AND s.value->>'version' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.app_releases r WHERE r.version = s.value->>'version'
  );