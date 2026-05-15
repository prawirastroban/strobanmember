-- Extend internal_reports for public/customer/guest submissions
ALTER TABLE public.internal_reports
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS reporter_email text,
  ADD COLUMN IF NOT EXISTS reporter_phone text,
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.internal_reports
  ALTER COLUMN reporter_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internal_reports_source ON public.internal_reports(source);

-- Replace insert policy to allow any authenticated user (own row)
DROP POLICY IF EXISTS "Internal users can insert own reports" ON public.internal_reports;

CREATE POLICY "Authenticated users can insert own reports"
ON public.internal_reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Allow customers to view ONLY their own reports (so they can see status updates if shown later)
CREATE POLICY "Reporters can view own reports"
ON public.internal_reports FOR SELECT
USING (reporter_id IS NOT NULL AND reporter_id = auth.uid());

-- Storage policy: keep internal upload as is, but also allow any authenticated user to upload to internal-reports
DROP POLICY IF EXISTS "Internal users can upload internal-reports" ON storage.objects;
CREATE POLICY "Authenticated users can upload internal-reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'internal-reports');
