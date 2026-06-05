
-- pwa_settings (singleton)
CREATE TABLE public.pwa_settings (
  id INT PRIMARY KEY DEFAULT 1,
  banner_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  banner_title TEXT NOT NULL DEFAULT 'Install Sahabat Stroban',
  banner_subtitle TEXT NOT NULL DEFAULT 'Akses lebih cepat & notifikasi langsung',
  delay_seconds INT NOT NULL DEFAULT 5 CHECK (delay_seconds >= 0 AND delay_seconds <= 60),
  reprompt_days INT NOT NULL DEFAULT 0 CHECK (reprompt_days >= 0 AND reprompt_days <= 90),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pwa_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.pwa_settings TO anon, authenticated;
GRANT UPDATE ON public.pwa_settings TO authenticated;
GRANT ALL ON public.pwa_settings TO service_role;

ALTER TABLE public.pwa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pwa_settings public read"
  ON public.pwa_settings FOR SELECT
  USING (true);

CREATE POLICY "pwa_settings owner update"
  ON public.pwa_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Seed singleton
INSERT INTO public.pwa_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pwa_settings;

-- pwa_events
CREATE TABLE public.pwa_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL CHECK (event IN ('shown','accepted','dismissed')),
  platform TEXT NOT NULL CHECK (platform IN ('android','ios','desktop')),
  user_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pwa_events_event_created_idx ON public.pwa_events (event, created_at DESC);
CREATE INDEX pwa_events_created_idx ON public.pwa_events (created_at DESC);

GRANT INSERT ON public.pwa_events TO anon, authenticated;
GRANT SELECT ON public.pwa_events TO authenticated;
GRANT ALL ON public.pwa_events TO service_role;

ALTER TABLE public.pwa_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pwa_events public insert"
  ON public.pwa_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "pwa_events admin read"
  ON public.pwa_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
