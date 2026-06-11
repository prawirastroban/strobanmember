ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS last_active timestamp with time zone,
  ADD COLUMN IF NOT EXISTS invalidated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS invalid_reason text;

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_platform ON public.push_tokens(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_push_tokens_last_active ON public.push_tokens(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_push_tokens_invalidated_at ON public.push_tokens(invalidated_at);

CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text,
  platform text,
  event_type text not null,
  status_code integer,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);
GRANT SELECT ON public.push_delivery_logs TO authenticated;
GRANT ALL ON public.push_delivery_logs TO service_role;
ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own push delivery logs"
ON public.push_delivery_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'staff')
  OR public.has_role(auth.uid(), 'admin_cabang')
);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_user_created_at
  ON public.push_delivery_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_event_type_created_at
  ON public.push_delivery_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_notification_id
  ON public.push_delivery_logs(notification_id);

CREATE OR REPLACE FUNCTION public.get_pwa_push_audit()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_priv boolean;
  result jsonb;
BEGIN
  is_priv := public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'staff')
          OR public.has_role(auth.uid(), 'admin_cabang');

  IF is_priv THEN
    SELECT jsonb_build_object(
      'scope', 'global',
      'active_tokens', COALESCE((SELECT COUNT(*) FROM public.push_tokens WHERE invalidated_at IS NULL), 0),
      'invalid_tokens', COALESCE((SELECT COUNT(*) FROM public.push_tokens WHERE invalidated_at IS NOT NULL), 0),
      'last_push_sent', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE event_type IN ('sent', 'failed', 'skipped')),
      'last_push_success', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE event_type = 'sent'),
      'last_push_failed', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE event_type = 'failed'),
      'last_notification_trigger', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE event_type = 'trigger'),
      'last_device_sync', (SELECT MAX(last_active) FROM public.push_tokens),
      'by_platform', COALESCE((SELECT jsonb_object_agg(platform, cnt) FROM (
        SELECT COALESCE(platform, 'unknown') AS platform, COUNT(*) AS cnt
        FROM public.push_tokens
        WHERE invalidated_at IS NULL
        GROUP BY 1
      ) s), '{}'::jsonb)
    ) INTO result;
  ELSE
    SELECT jsonb_build_object(
      'scope', 'self',
      'active_tokens', COALESCE((SELECT COUNT(*) FROM public.push_tokens WHERE user_id = auth.uid() AND invalidated_at IS NULL), 0),
      'invalid_tokens', COALESCE((SELECT COUNT(*) FROM public.push_tokens WHERE user_id = auth.uid() AND invalidated_at IS NOT NULL), 0),
      'last_push_sent', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE user_id = auth.uid() AND event_type IN ('sent', 'failed', 'skipped')),
      'last_push_success', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE user_id = auth.uid() AND event_type = 'sent'),
      'last_push_failed', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE user_id = auth.uid() AND event_type = 'failed'),
      'last_notification_trigger', (SELECT MAX(created_at) FROM public.push_delivery_logs WHERE user_id = auth.uid() AND event_type = 'trigger'),
      'last_device_sync', (SELECT MAX(last_active) FROM public.push_tokens WHERE user_id = auth.uid()),
      'by_platform', COALESCE((SELECT jsonb_object_agg(platform, cnt) FROM (
        SELECT COALESCE(platform, 'unknown') AS platform, COUNT(*) AS cnt
        FROM public.push_tokens
        WHERE user_id = auth.uid() AND invalidated_at IS NULL
        GROUP BY 1
      ) s), '{}'::jsonb)
    ) INTO result;
  END IF;

  RETURN COALESCE(result, jsonb_build_object(
    'scope', CASE WHEN is_priv THEN 'global' ELSE 'self' END,
    'active_tokens', 0,
    'invalid_tokens', 0,
    'last_push_sent', NULL,
    'last_push_success', NULL,
    'last_push_failed', NULL,
    'last_notification_trigger', NULL,
    'last_device_sync', NULL,
    'by_platform', '{}'::jsonb
  ));
END;
$$;
REVOKE ALL ON FUNCTION public.get_pwa_push_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pwa_push_audit() TO authenticated;