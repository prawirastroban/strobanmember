-- Stage 2B: only the 16 approved internal policy targets change.
DO $stage2b$
DECLARE
  before_snapshot jsonb;
  expected_snapshot jsonb;
  after_snapshot jsonb;
  inventory_fingerprint text;
  targets text[] := ARRAY[
    'branches.Staff can delete branches',
    'branches.Staff can insert branches',
    'branches.Staff can update branches',
    'branches.Staff can view all branches',
    'promos.Staff can delete promos',
    'promos.Staff can insert promos',
    'promos.Staff can update promos',
    'promos.Staff can view all promos',
    'services.Staff can delete services',
    'services.Staff can insert services',
    'services.Staff can update services',
    'services.Staff can view all services',
    'tires.Staff can delete tires',
    'tires.Staff can insert tires',
    'tires.Staff can update tires',
    'tires.Staff can view all tires'
  ];
BEGIN
  SELECT md5(string_agg(concat_ws('|',schemaname,tablename,policyname,permissive,cmd,roles::text,COALESCE(qual,'<NULL>'),COALESCE(with_check,'<NULL>')),E'\n' ORDER BY tablename,policyname))
  INTO inventory_fingerprint FROM pg_policies
  WHERE schemaname='public' AND tablename IN ('branches','promos','services','tires');
  IF inventory_fingerprint IS DISTINCT FROM '40f2363acd5b2a1f5cb45f334428f09c' THEN
    RAISE EXCEPTION 'Stage 2B stopped: current policies differ from the approved audit inventory';
  END IF;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname),
         jsonb_agg(CASE WHEN (tablename || '.' || policyname) = ANY(targets)
           THEN to_jsonb(p) || jsonb_build_object('roles',ARRAY['authenticated']::name[])
           ELSE to_jsonb(p) END ORDER BY tablename,policyname)
  INTO before_snapshot, expected_snapshot FROM pg_policies p WHERE schemaname='public';

  ALTER POLICY "Staff can delete branches" ON public.branches TO authenticated;
  ALTER POLICY "Staff can insert branches" ON public.branches TO authenticated;
  ALTER POLICY "Staff can update branches" ON public.branches TO authenticated;
  ALTER POLICY "Staff can view all branches" ON public.branches TO authenticated;
  ALTER POLICY "Staff can delete promos" ON public.promos TO authenticated;
  ALTER POLICY "Staff can insert promos" ON public.promos TO authenticated;
  ALTER POLICY "Staff can update promos" ON public.promos TO authenticated;
  ALTER POLICY "Staff can view all promos" ON public.promos TO authenticated;
  ALTER POLICY "Staff can delete services" ON public.services TO authenticated;
  ALTER POLICY "Staff can insert services" ON public.services TO authenticated;
  ALTER POLICY "Staff can update services" ON public.services TO authenticated;
  ALTER POLICY "Staff can view all services" ON public.services TO authenticated;
  ALTER POLICY "Staff can delete tires" ON public.tires TO authenticated;
  ALTER POLICY "Staff can insert tires" ON public.tires TO authenticated;
  ALTER POLICY "Staff can update tires" ON public.tires TO authenticated;
  ALTER POLICY "Staff can view all tires" ON public.tires TO authenticated;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname)
  INTO after_snapshot FROM pg_policies p WHERE schemaname='public';
  IF after_snapshot IS DISTINCT FROM expected_snapshot THEN
    RAISE EXCEPTION 'Stage 2B stopped: changes exceed the 16 approved target roles';
  END IF;
END
$stage2b$;

-- Rollback: review only; execute solely upon a separately approved rollback request.
-- ALTER POLICY "Staff can delete branches" ON public.branches TO public;
-- ALTER POLICY "Staff can insert branches" ON public.branches TO public;
-- ALTER POLICY "Staff can update branches" ON public.branches TO public;
-- ALTER POLICY "Staff can view all branches" ON public.branches TO public;
-- ALTER POLICY "Staff can delete promos" ON public.promos TO public;
-- ALTER POLICY "Staff can insert promos" ON public.promos TO public;
-- ALTER POLICY "Staff can update promos" ON public.promos TO public;
-- ALTER POLICY "Staff can view all promos" ON public.promos TO public;
-- ALTER POLICY "Staff can delete services" ON public.services TO public;
-- ALTER POLICY "Staff can insert services" ON public.services TO public;
-- ALTER POLICY "Staff can update services" ON public.services TO public;
-- ALTER POLICY "Staff can view all services" ON public.services TO public;
-- ALTER POLICY "Staff can delete tires" ON public.tires TO public;
-- ALTER POLICY "Staff can insert tires" ON public.tires TO public;
-- ALTER POLICY "Staff can update tires" ON public.tires TO public;
-- ALTER POLICY "Staff can view all tires" ON public.tires TO public;