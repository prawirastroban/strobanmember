-- 1) Invalidate stale duplicate push tokens: keep only the newest token per (user, platform, device_type)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, coalesce(platform,'web'), coalesce(device_type,'unknown')
           ORDER BY coalesce(last_active, updated_at, created_at) DESC, created_at DESC
         ) AS rn
  FROM public.push_tokens
  WHERE invalidated_at IS NULL
)
UPDATE public.push_tokens t
SET invalidated_at = now(), invalid_reason = 'superseded_by_newer_device_token'
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;

-- 2) Idempotency guard: skip creating an identical notification within 30 seconds
CREATE OR REPLACE FUNCTION public.notifications_dedupe_recent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = NEW.user_id
      AND n.title = NEW.title
      AND n.message = NEW.message
      AND coalesce(n.type,'') = coalesce(NEW.type,'')
      AND n.created_at > now() - interval '30 seconds'
  ) THEN
    RETURN NULL; -- skip duplicate insert
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_dedupe_recent ON public.notifications;
CREATE TRIGGER trg_notifications_dedupe_recent
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_dedupe_recent();