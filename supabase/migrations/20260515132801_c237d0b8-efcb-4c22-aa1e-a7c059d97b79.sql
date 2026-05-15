
-- Helper: any internal role
CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'staff'::app_role, 'admin_cabang'::app_role)
  );
$$;

-- Table
CREATE TABLE public.internal_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reporter_name text,
  reporter_role text,
  category text NOT NULL DEFAULT 'bug',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  page_url text,
  status text NOT NULL DEFAULT 'open',
  fixed_at timestamptz,
  fixed_by uuid,
  fixed_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_internal_reports_status ON public.internal_reports(status);
CREATE INDEX idx_internal_reports_created_at ON public.internal_reports(created_at DESC);

ALTER TABLE public.internal_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: any internal role
CREATE POLICY "Internal users can view reports"
ON public.internal_reports FOR SELECT
USING (public.is_internal_user(auth.uid()));

-- INSERT: any internal role, must be self
CREATE POLICY "Internal users can insert own reports"
ON public.internal_reports FOR INSERT
WITH CHECK (public.is_internal_user(auth.uid()) AND reporter_id = auth.uid());

-- UPDATE: reporter (only when not fixed) OR staff (Owner) for any update
CREATE POLICY "Reporter can update own open reports"
ON public.internal_reports FOR UPDATE
USING (reporter_id = auth.uid() AND status <> 'fixed')
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Owner staff can update any report"
ON public.internal_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role));

-- DELETE: reporter (when not fixed) or staff
CREATE POLICY "Reporter can delete own open reports"
ON public.internal_reports FOR DELETE
USING (reporter_id = auth.uid() AND status <> 'fixed');

CREATE POLICY "Owner staff can delete reports"
ON public.internal_reports FOR DELETE
USING (public.has_role(auth.uid(), 'staff'::app_role));

-- updated_at trigger
CREATE TRIGGER trg_internal_reports_updated_at
BEFORE UPDATE ON public.internal_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_reports;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('internal-reports', 'internal-reports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view internal-reports files"
ON storage.objects FOR SELECT
USING (bucket_id = 'internal-reports');

CREATE POLICY "Internal users can upload internal-reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'internal-reports' AND public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can update own internal-reports files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'internal-reports' AND public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can delete own internal-reports files"
ON storage.objects FOR DELETE
USING (bucket_id = 'internal-reports' AND public.is_internal_user(auth.uid()));
