CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('standard','builder')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_favorite boolean NOT NULL DEFAULT false,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_templates TO authenticated;
GRANT ALL ON public.report_templates TO service_role;

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read own templates"
  ON public.report_templates FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "staff read global templates"
  ON public.report_templates FOR SELECT TO authenticated
  USING (is_global = true AND (
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'admin_cabang')
  ));

CREATE POLICY "owner insert own templates"
  ON public.report_templates FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_global = false OR public.has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "owner update own templates"
  ON public.report_templates FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (is_global = true AND public.has_role(auth.uid(), 'staff')))
  WITH CHECK (
    (owner_id = auth.uid() AND (is_global = false OR public.has_role(auth.uid(), 'staff')))
    OR (is_global = true AND public.has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "owner delete own templates"
  ON public.report_templates FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (is_global = true AND public.has_role(auth.uid(), 'staff')));

CREATE TRIGGER set_updated_at_report_templates
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS report_templates_owner_idx ON public.report_templates(owner_id);
CREATE INDEX IF NOT EXISTS report_templates_global_idx ON public.report_templates(is_global) WHERE is_global = true;