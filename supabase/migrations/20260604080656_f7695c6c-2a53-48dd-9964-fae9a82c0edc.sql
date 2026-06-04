
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

INSERT INTO public.app_settings (key, value)
VALUES (
  'dispatch_notification_url',
  to_jsonb('https://yrwttzxrnomaiqxyjrqn.supabase.co/functions/v1/dispatch-notification'::text)
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.fire_dispatch_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
BEGIN
  SELECT value #>> '{}' INTO v_url FROM public.app_settings WHERE key = 'dispatch_notification_url';
  IF v_url IS NULL OR v_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fire_dispatch_notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_notification ON public.notifications;
CREATE TRIGGER trg_dispatch_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fire_dispatch_notification();
