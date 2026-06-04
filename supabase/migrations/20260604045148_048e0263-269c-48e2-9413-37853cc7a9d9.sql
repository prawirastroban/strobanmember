
CREATE TABLE public.user_filter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, name)
);

CREATE INDEX idx_user_filter_presets_user_module ON public.user_filter_presets(user_id, module);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_filter_presets TO authenticated;
GRANT ALL ON public.user_filter_presets TO service_role;

ALTER TABLE public.user_filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own filter presets"
ON public.user_filter_presets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_user_filter_presets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_filter_presets_updated_at
BEFORE UPDATE ON public.user_filter_presets
FOR EACH ROW EXECUTE FUNCTION public.update_user_filter_presets_updated_at();
