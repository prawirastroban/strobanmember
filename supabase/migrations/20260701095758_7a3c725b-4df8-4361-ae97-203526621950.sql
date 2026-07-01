ALTER TABLE public.app_releases
  ADD COLUMN IF NOT EXISTS deployment_type text NOT NULL DEFAULT 'optional';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_releases_deployment_type_check'
  ) THEN
    ALTER TABLE public.app_releases
      ADD CONSTRAINT app_releases_deployment_type_check
      CHECK (deployment_type IN ('optional','recommended','force'));
  END IF;
END $$;

UPDATE public.app_releases
   SET deployment_type = CASE WHEN force_update THEN 'force' ELSE 'optional' END
 WHERE deployment_type = 'optional';