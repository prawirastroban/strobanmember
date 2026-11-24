-- Stage 2D: only 25 approved storage.objects policy targets change public -> authenticated.
-- Baseline (audit method, Python serializer): all 3485e7364ddf16f385624cab3eb187d3, expr bf797446bc687c02588649b1142c1bfa,
-- candidates ded90e1b769ebf35846bcc2ee45f9714 / c7adb6b162c688730ada1df42f91837d, retained bbf52fd36a5bbbadc5ac3121fefdabb1.
DO $stage2d$
DECLARE
  allow text[] := ARRAY[
    'Internal users can delete own internal-reports files','Internal users can update own internal-reports files',
    'Owner view own pickup handover','Staff can delete branding files','Staff can delete service icons',
    'Staff can delete service images','Staff can delete tire images','Staff can update branding files',
    'Staff can update service icons','Staff can update service images','Staff can update tire images',
    'Staff can update withdrawal proofs','Staff can upload branding files','Staff can upload service icons',
    'Staff can upload service images','Staff can upload tire images','Staff can upload withdrawal proofs',
    'Staff can view withdrawal proofs','Staff manage pickup handover','Users can delete own vehicle images',
    'Users can update own vehicle images','Users can upload own vehicle images','Users can view own withdrawal proofs',
    'Users update own proof','Users upload own proof'];
  fp text; n int; pub text[]; before_s jsonb; after_s jsonb; pname text;
BEGIN
  SELECT md5(string_agg(concat_ws('|',policyname,substring(COALESCE(qual,with_check) from 'bucket_id = ''([^'']+)'''),cmd,array_to_string(roles,','),permissive,COALESCE(qual,''),COALESCE(with_check,'')),E'\n' ORDER BY policyname)), count(*)
  INTO fp, n FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
  IF n <> 43 OR fp IS DISTINCT FROM 'cdc6f52a8cd70280fce4a4d44e0b9c40' THEN
    RAISE EXCEPTION 'Stage 2D stopped: inventory differs (count %, fp %)', n, fp;
  END IF;
  SELECT array_agg(policyname::text ORDER BY policyname) INTO pub FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND roles=ARRAY['public']::name[];
  IF pub IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(allow) x) THEN
    RAISE EXCEPTION 'Stage 2D stopped: public candidates differ from allowlist';
  END IF;
  SELECT jsonb_object_agg(policyname, jsonb_build_object('cmd',cmd,'permissive',permissive,'qual',qual,'with_check',with_check,
    'roles', CASE WHEN policyname = ANY(allow) THEN to_jsonb(ARRAY['authenticated']) ELSE to_jsonb(roles) END))
  INTO before_s FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
  FOREACH pname IN ARRAY allow LOOP
    EXECUTE format('ALTER POLICY %I ON storage.objects TO authenticated', pname);
  END LOOP;
  SELECT jsonb_object_agg(policyname, jsonb_build_object('cmd',cmd,'permissive',permissive,'qual',qual,'with_check',with_check,'roles',to_jsonb(roles)))
  INTO after_s FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
  IF after_s IS DISTINCT FROM before_s THEN
    RAISE EXCEPTION 'Stage 2D stopped: post-change snapshot differs';
  END IF;
END
$stage2d$;
-- Rollback (NOT executed): for each of the 25 allowlisted names run
-- ALTER POLICY "<name>" ON storage.objects TO public;
-- e.g. ALTER POLICY "Users upload own proof" ON storage.objects TO public;  (repeat for all 25 names listed above)