
-- ============================================================================
-- Notification Engine — Fase 1: schema, defaults, presence, RPC
-- ============================================================================

-- 1) notifications: tambah kolom priority, category, action_url, source
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority   text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS category   text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS source     text;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_priority_check
  CHECK (priority IN ('critical','high','medium','low'));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check
  CHECK (category IN ('booking','customer','operations','marketing','finance','reporting','system'));

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_category
  ON public.notifications (user_id, category);

-- 2) BEFORE INSERT trigger: infer category/priority/action_url from `type` + metadata
--    when caller didn't set them. Keeps the 8 legacy notify_* functions untouched.
CREATE OR REPLACE FUNCTION public.notifications_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text := lower(coalesce(NEW.type, 'info'));
BEGIN
  -- Category inference
  IF NEW.category IS NULL OR NEW.category = 'system' THEN
    NEW.category := CASE
      WHEN t LIKE 'booking%' OR t IN ('cancel_request','cancel_approved','cancel_rejected','service_progress') THEN 'booking'
      WHEN t IN ('new_registration','verification','vehicle_added','complaint','customer') THEN 'customer'
      WHEN t IN ('pickup','slot_full','slot_nearly_full','operations') THEN 'operations'
      WHEN t IN ('promo','voucher','loyalty','reward','marketing','cashback') THEN 'marketing'
      WHEN t LIKE 'payment%' OR t IN ('refund','referral','invoice_ready','manual_payment','tire_order') THEN 'finance'
      WHEN t LIKE 'report%' OR t IN ('daily_report','weekly_report','monthly_report') THEN 'reporting'
      WHEN t IN ('bug','correction_request','audit','security','integration_error','api_error','server_warning') THEN 'system'
      ELSE 'system'
    END;
  END IF;

  -- Priority inference
  IF NEW.priority IS NULL OR NEW.priority = 'medium' THEN
    NEW.priority := CASE
      WHEN t IN ('security','integration_error','api_error','server_warning','payment_failed') THEN 'critical'
      WHEN t IN ('booking','booking_created','complaint','correction_request','refund','cancel_request') THEN 'high'
      WHEN t IN ('payment','payment_success','pickup','invoice_ready','tire_order','manual_payment') THEN 'medium'
      WHEN t IN ('loyalty','promo','voucher','reward','cashback','marketing') THEN 'low'
      ELSE 'medium'
    END;
  END IF;

  -- action_url fallback from legacy metadata.redirect_to
  IF NEW.action_url IS NULL AND NEW.metadata ? 'redirect_to' THEN
    NEW.action_url := NEW.metadata->>'redirect_to';
  END IF;

  -- source fallback
  IF NEW.source IS NULL THEN
    NEW.source := 'legacy';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_set_defaults ON public.notifications;
CREATE TRIGGER trg_notifications_set_defaults
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_set_defaults();

-- 3) user_presence (smart delivery)
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    text NOT NULL,
  current_route text NOT NULL DEFAULT '/',
  last_seen     timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own presence" ON public.user_presence;
CREATE POLICY "Users manage own presence"
  ON public.user_presence
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON public.user_presence (user_id, last_seen DESC);

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_user_presence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_presence_touch ON public.user_presence;
CREATE TRIGGER trg_user_presence_touch
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_presence();

-- 4) Unified API: public.create_notification(...)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id    uuid,
  _title      text,
  _message    text,
  _type       text DEFAULT 'info',
  _category   text DEFAULT NULL,
  _priority   text DEFAULT NULL,
  _action_url text DEFAULT NULL,
  _metadata   jsonb DEFAULT '{}'::jsonb,
  _source     text DEFAULT 'manual'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _user_id IS NULL OR _title IS NULL OR _message IS NULL THEN
    RAISE EXCEPTION 'create_notification: user_id, title, message required';
  END IF;

  INSERT INTO public.notifications (
    user_id, title, message, type, category, priority, action_url, metadata, source
  ) VALUES (
    _user_id, _title, _message, coalesce(_type,'info'),
    coalesce(_category,'system'),    -- will be re-inferred by BEFORE trigger if 'system'
    coalesce(_priority,'medium'),    -- same — re-inferred if 'medium'
    _action_url,
    coalesce(_metadata,'{}'::jsonb),
    coalesce(_source,'manual')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid,text,text,text,text,text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,text,text,text,jsonb,text) TO authenticated, service_role;

-- 5) Backfill existing rows so categories/priorities exist on legacy data
UPDATE public.notifications n
SET
  category = CASE
    WHEN lower(coalesce(n.type,'info')) LIKE 'booking%'
      OR lower(coalesce(n.type,'info')) IN ('cancel_request','cancel_approved','cancel_rejected','service_progress') THEN 'booking'
    WHEN lower(coalesce(n.type,'info')) IN ('new_registration','verification','vehicle_added','complaint') THEN 'customer'
    WHEN lower(coalesce(n.type,'info')) IN ('promo','voucher','loyalty','reward','cashback') THEN 'marketing'
    WHEN lower(coalesce(n.type,'info')) LIKE 'payment%'
      OR lower(coalesce(n.type,'info')) IN ('refund','referral','invoice_ready','manual_payment','tire_order') THEN 'finance'
    ELSE 'system'
  END,
  priority = CASE
    WHEN lower(coalesce(n.type,'info')) IN ('booking','complaint','correction_request','cancel_request') THEN 'high'
    WHEN lower(coalesce(n.type,'info')) IN ('loyalty','promo','voucher','reward','cashback') THEN 'low'
    ELSE 'medium'
  END,
  action_url = coalesce(action_url, n.metadata->>'redirect_to'),
  source = coalesce(source, 'legacy')
WHERE n.category = 'system' AND n.priority = 'medium';
