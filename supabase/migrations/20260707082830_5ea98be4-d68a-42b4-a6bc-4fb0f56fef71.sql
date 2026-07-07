
DROP POLICY IF EXISTS "Public can view internal-reports files" ON storage.objects;
CREATE POLICY "Internal users can view internal-reports files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'internal-reports' AND public.is_internal_user(auth.uid()));

DROP POLICY IF EXISTS "Public read payment-proofs" ON storage.objects;
CREATE POLICY "Owner or staff can view payment-proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_cabang'::public.app_role)
  )
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='vehicles') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.vehicles';
  END IF;
END $$;
