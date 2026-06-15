
-- Enums
CREATE TYPE public.popup_audience AS ENUM ('all', 'guest', 'authenticated');
CREATE TYPE public.popup_frequency AS ENUM ('every_visit', 'once_per_session', 'daily', 'weekly', 'once_ever');
CREATE TYPE public.popup_event_type AS ENUM ('impression', 'cta_click', 'cta_secondary_click', 'dismiss');

-- Main table
CREATE TABLE public.promo_popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  cta_secondary_label TEXT,
  cta_secondary_url TEXT,
  audience public.popup_audience NOT NULL DEFAULT 'all',
  frequency public.popup_frequency NOT NULL DEFAULT 'daily',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  show_countdown BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_pages TEXT[] NOT NULL DEFAULT ARRAY['/']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

GRANT SELECT ON public.promo_popups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_popups TO authenticated;
GRANT ALL ON public.promo_popups TO service_role;

ALTER TABLE public.promo_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active popups"
  ON public.promo_popups FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Admins can view all popups"
  ON public.promo_popups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert popups"
  ON public.promo_popups FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update popups"
  ON public.promo_popups FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete popups"
  ON public.promo_popups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promo_popups_updated_at
  BEFORE UPDATE ON public.promo_popups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events table
CREATE TABLE public.promo_popup_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  popup_id UUID NOT NULL REFERENCES public.promo_popups(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  event_type public.popup_event_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_popup_events_popup ON public.promo_popup_events(popup_id, event_type);
CREATE INDEX idx_promo_popup_events_created_at ON public.promo_popup_events(created_at DESC);

GRANT INSERT ON public.promo_popup_events TO anon, authenticated;
GRANT SELECT ON public.promo_popup_events TO authenticated;
GRANT ALL ON public.promo_popup_events TO service_role;

ALTER TABLE public.promo_popup_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log popup events"
  ON public.promo_popup_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view popup events"
  ON public.promo_popup_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
