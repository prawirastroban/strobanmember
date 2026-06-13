
-- app_releases: structured changelog + deployment history
CREATE TABLE public.app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  previous_version text,
  released_at timestamptz NOT NULL DEFAULT now(),
  released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published',
  category text[] NOT NULL DEFAULT '{}',
  title text,
  summary text,
  purpose text,
  reason text,
  impact text,
  affected_modules text[] NOT NULL DEFAULT '{}',
  priority text NOT NULL DEFAULT 'normal',
  force_update boolean NOT NULL DEFAULT false,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_releases TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_releases TO authenticated;
GRANT ALL ON public.app_releases TO service_role;

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read published releases"
ON public.app_releases FOR SELECT TO authenticated
USING (status = 'published' OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Owner can insert releases"
ON public.app_releases FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Owner can update releases"
ON public.app_releases FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Owner can delete releases"
ON public.app_releases FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

CREATE INDEX idx_app_releases_released_at ON public.app_releases (released_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_app_releases_updated_at
BEFORE UPDATE ON public.app_releases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- app_version_clients: per-user adoption tracker
CREATE TABLE public.app_version_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  browser text,
  os text,
  update_status text NOT NULL DEFAULT 'updated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.app_version_clients TO authenticated;
GRANT ALL ON public.app_version_clients TO service_role;

ALTER TABLE public.app_version_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own version row or owner sees all"
ON public.app_version_clients FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can upsert own version row"
ON public.app_version_clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own version row"
ON public.app_version_clients FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_app_version_clients_updated_at
BEFORE UPDATE ON public.app_version_clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_app_version_clients_version ON public.app_version_clients (current_version);
CREATE INDEX idx_app_version_clients_last_seen ON public.app_version_clients (last_seen_at DESC);
