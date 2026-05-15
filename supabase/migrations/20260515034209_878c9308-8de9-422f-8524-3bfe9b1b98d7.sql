
-- ============================================================
-- 1. RATE LIMITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies — only service role can access (default deny)
CREATE POLICY "Staff can view rate limits"
  ON public.rate_limits FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role));

-- Atomic check + increment. Returns true if WITHIN limit, false if EXCEEDED.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key TEXT,
  _max INTEGER,
  _window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _row RECORD;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count, updated_at)
  VALUES (_key, _now, 1, _now)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.window_start < _now - (_window_seconds || ' seconds')::interval
        THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start < _now - (_window_seconds || ' seconds')::interval
        THEN _now
      ELSE public.rate_limits.window_start
    END,
    updated_at = _now
  RETURNING * INTO _row;

  RETURN _row.count <= _max;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
-- Only callable from edge functions via service_role

-- ============================================================
-- 2. ADMIN AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_label TEXT,
  before JSONB,
  after JSONB,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log (action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT. No INSERT/UPDATE/DELETE policies → immutable from client.
-- Only the SECURITY DEFINER function below can write.
CREATE POLICY "Owner can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role));

-- Internal logger function
CREATE OR REPLACE FUNCTION public.log_admin_audit(
  _action TEXT,
  _target_type TEXT DEFAULT NULL,
  _target_id TEXT DEFAULT NULL,
  _target_label TEXT DEFAULT NULL,
  _before JSONB DEFAULT NULL,
  _after JSONB DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
  _actor_role TEXT;
BEGIN
  SELECT role::text INTO _actor_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role::text
    WHEN 'staff' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'admin_cabang' THEN 3
    ELSE 4
  END
  LIMIT 1;

  INSERT INTO public.admin_audit_log (
    actor_id, actor_role, action, target_type, target_id,
    target_label, before, after, metadata
  ) VALUES (
    auth.uid(), _actor_role, _action, _target_type, _target_id,
    _target_label, _before, _after, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_audit(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) TO authenticated;

-- ============================================================
-- 3. AUDIT TRIGGERS on sensitive tables
-- ============================================================

-- Payments: log when staff manually changes payment_status
CREATE OR REPLACE FUNCTION public.audit_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if actor is staff/admin AND payment_status changed
  IF auth.uid() IS NOT NULL
     AND OLD.payment_status IS DISTINCT FROM NEW.payment_status
     AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_cabang'::app_role))
  THEN
    PERFORM public.log_admin_audit(
      'payment.status_change',
      'payment',
      NEW.id::text,
      NEW.midtrans_order_id,
      jsonb_build_object('payment_status', OLD.payment_status, 'amount', OLD.amount),
      jsonb_build_object('payment_status', NEW.payment_status, 'amount', NEW.amount, 'method', NEW.payment_method),
      jsonb_build_object('booking_id', NEW.booking_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_change ON public.payments;
CREATE TRIGGER trg_audit_payment_change
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_change();

-- Referral withdrawals: log approve/reject
CREATE OR REPLACE FUNCTION public.audit_withdrawal_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  THEN
    PERFORM public.log_admin_audit(
      'withdrawal.status_change',
      'referral_withdrawal',
      NEW.id::text,
      NEW.bank_name || ' - ' || NEW.account_holder,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'admin_note', NEW.admin_note),
      jsonb_build_object('user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_withdrawal_change ON public.referral_withdrawals;
CREATE TRIGGER trg_audit_withdrawal_change
  AFTER UPDATE ON public.referral_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.audit_withdrawal_change();

-- Loyalty points manual adjustment
CREATE OR REPLACE FUNCTION public.audit_loyalty_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.total_points IS DISTINCT FROM NEW.total_points
     AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
     AND auth.uid() <> NEW.user_id  -- ignore self updates from triggers
  THEN
    PERFORM public.log_admin_audit(
      'loyalty.points_change',
      'loyalty',
      NEW.user_id::text,
      NULL,
      jsonb_build_object('total_points', OLD.total_points),
      jsonb_build_object('total_points', NEW.total_points, 'delta', NEW.total_points - OLD.total_points),
      jsonb_build_object('user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_loyalty_change ON public.loyalty_points;
CREATE TRIGGER trg_audit_loyalty_change
  AFTER UPDATE ON public.loyalty_points
  FOR EACH ROW EXECUTE FUNCTION public.audit_loyalty_change();

-- Manual payment proofs approval/reject
CREATE OR REPLACE FUNCTION public.audit_manual_proof_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_cabang'::app_role))
  THEN
    PERFORM public.log_admin_audit(
      'manual_payment.review',
      'manual_payment_proof',
      NEW.id::text,
      NEW.sender_name,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'amount', NEW.transfer_amount, 'reject_reason', NEW.reject_reason),
      jsonb_build_object('booking_id', NEW.booking_id, 'method', NEW.method)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_manual_proof_change ON public.manual_payment_proofs;
CREATE TRIGGER trg_audit_manual_proof_change
  AFTER UPDATE ON public.manual_payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.audit_manual_proof_change();

-- ============================================================
-- 4. FIX overly-permissive booking_status_logs INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert status logs" ON public.booking_status_logs;
CREATE POLICY "Staff or owner can insert status logs"
  ON public.booking_status_logs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'admin_cabang'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_status_logs.booking_id
        AND b.user_id = auth.uid()
    )
  );
