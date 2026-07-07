
-- =========================================================================
-- Safe Realtime event tables. PII tables (bookings/profiles/vehicles) stay
-- OFF the realtime publication; clients subscribe to these metadata-only
-- streams instead and re-fetch full rows via authenticated APIs (RLS applies).
-- =========================================================================

-- ---------- booking_events ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  status text,
  payment_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_user_id ON public.booking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON public.booking_events(created_at DESC);

GRANT SELECT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner or staff can view booking_events" ON public.booking_events;
CREATE POLICY "Owner or staff can view booking_events"
ON public.booking_events FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_cabang'::public.app_role)
);

-- ---------- profile_events -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_events_user_id ON public.profile_events(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_created_at ON public.profile_events(created_at DESC);

GRANT SELECT ON public.profile_events TO authenticated;
GRANT ALL ON public.profile_events TO service_role;

ALTER TABLE public.profile_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner or staff can view profile_events" ON public.profile_events;
CREATE POLICY "Owner or staff can view profile_events"
ON public.profile_events FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_cabang'::public.app_role)
);

-- ---------- Trigger: emit booking_events from bookings ------------------
CREATE OR REPLACE FUNCTION public.emit_booking_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'booking_created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      v_event := 'booking_status_and_payment_changed';
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      v_event := 'booking_status_changed';
    ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      v_event := 'booking_payment_changed';
    ELSIF NEW.cancel_requested IS DISTINCT FROM OLD.cancel_requested THEN
      v_event := 'booking_cancel_requested_changed';
    ELSE
      v_event := 'booking_updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.booking_events (booking_id, user_id, event_type, status, payment_status)
    VALUES (OLD.id, OLD.user_id, 'booking_deleted', OLD.status, OLD.payment_status);
    RETURN OLD;
  END IF;

  INSERT INTO public.booking_events (booking_id, user_id, event_type, status, payment_status)
  VALUES (NEW.id, NEW.user_id, v_event, NEW.status, NEW.payment_status);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'emit_booking_event failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_emit_event ON public.bookings;
CREATE TRIGGER trg_bookings_emit_event
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.emit_booking_event();

-- ---------- Trigger: emit profile_events from profiles ------------------
CREATE OR REPLACE FUNCTION public.emit_profile_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'profile_created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      v_event := 'profile_phone_changed';
    ELSIF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      v_event := 'profile_verification_changed';
    ELSE
      v_event := 'profile_updated';
    END IF;
  END IF;

  INSERT INTO public.profile_events (user_id, event_type)
  VALUES (COALESCE(NEW.id, OLD.id), v_event);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'emit_profile_event failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_emit_event ON public.profiles;
CREATE TRIGGER trg_profiles_emit_event
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.emit_profile_event();

-- ---------- Publish only the event tables to realtime -------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='booking_events') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_events';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profile_events') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_events';
  END IF;
END $$;

-- Safety re-assertion: ensure PII tables remain OFF the realtime publication.
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
