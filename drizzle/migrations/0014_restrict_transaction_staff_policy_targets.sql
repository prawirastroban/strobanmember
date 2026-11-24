-- Stage 2A: change only the target roles of the 11 explicitly audited staff policies.
-- Customer policies and the seven indirect Admin Cabang policies remain unchanged.
DO $stage2a$
DECLARE
  before_snapshot jsonb;
  expected_snapshot jsonb;
  after_snapshot jsonb;
  inventory_fingerprint text;
  targets text[] := ARRAY[
    'bookings.Owner staff can delete bookings',
    'bookings.Staff can insert bookings',
    'bookings.Staff can update all bookings',
    'bookings.Staff can view all bookings',
    'invoices.Staff can insert invoices',
    'invoices.Staff can update invoices',
    'invoices.Staff can view all invoices',
    'payments.Staff can insert payments',
    'payments.Staff can update all payments',
    'payments.Staff can view all payments',
    'user_roles.Staff and admin can view all roles'
  ];
BEGIN
  SELECT md5(string_agg(concat_ws('|',schemaname,tablename,policyname,permissive,cmd,roles::text,COALESCE(qual,'<NULL>'),COALESCE(with_check,'<NULL>')),E'\n' ORDER BY tablename,policyname))
  INTO inventory_fingerprint
  FROM pg_policies
  WHERE schemaname='public' AND tablename IN ('bookings','invoices','payments','user_roles');

  IF inventory_fingerprint IS DISTINCT FROM '5db49502470a59c9d38e3e2bb615261a' THEN
    RAISE EXCEPTION 'Stage 2A stopped: current policies differ from the approved audit inventory';
  END IF;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname),
         jsonb_agg(CASE WHEN (tablename || '.' || policyname) = ANY(targets)
           THEN to_jsonb(p) || jsonb_build_object('roles',ARRAY['authenticated']::name[])
           ELSE to_jsonb(p) END ORDER BY tablename,policyname)
  INTO before_snapshot, expected_snapshot
  FROM pg_policies p WHERE schemaname='public';

  ALTER POLICY "Owner staff can delete bookings" ON public.bookings TO authenticated;
  ALTER POLICY "Staff can insert bookings" ON public.bookings TO authenticated;
  ALTER POLICY "Staff can update all bookings" ON public.bookings TO authenticated;
  ALTER POLICY "Staff can view all bookings" ON public.bookings TO authenticated;
  ALTER POLICY "Staff can insert invoices" ON public.invoices TO authenticated;
  ALTER POLICY "Staff can update invoices" ON public.invoices TO authenticated;
  ALTER POLICY "Staff can view all invoices" ON public.invoices TO authenticated;
  ALTER POLICY "Staff can insert payments" ON public.payments TO authenticated;
  ALTER POLICY "Staff can update all payments" ON public.payments TO authenticated;
  ALTER POLICY "Staff can view all payments" ON public.payments TO authenticated;
  ALTER POLICY "Staff and admin can view all roles" ON public.user_roles TO authenticated;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname)
  INTO after_snapshot FROM pg_policies p WHERE schemaname='public';
  IF after_snapshot IS DISTINCT FROM expected_snapshot THEN
    RAISE EXCEPTION 'Stage 2A stopped: changes exceed the 11 approved target roles';
  END IF;
END
$stage2a$;

-- Rollback: run only upon a separately approved rollback request, never during validation.
-- ALTER POLICY "Owner staff can delete bookings" ON public.bookings TO public;
-- ALTER POLICY "Staff can insert bookings" ON public.bookings TO public;
-- ALTER POLICY "Staff can update all bookings" ON public.bookings TO public;
-- ALTER POLICY "Staff can view all bookings" ON public.bookings TO public;
-- ALTER POLICY "Staff can insert invoices" ON public.invoices TO public;
-- ALTER POLICY "Staff can update invoices" ON public.invoices TO public;
-- ALTER POLICY "Staff can view all invoices" ON public.invoices TO public;
-- ALTER POLICY "Staff can insert payments" ON public.payments TO public;
-- ALTER POLICY "Staff can update all payments" ON public.payments TO public;
-- ALTER POLICY "Staff can view all payments" ON public.payments TO public;
-- ALTER POLICY "Staff and admin can view all roles" ON public.user_roles TO public;