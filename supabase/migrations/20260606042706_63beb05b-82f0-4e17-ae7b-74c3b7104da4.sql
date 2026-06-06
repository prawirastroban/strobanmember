
-- 1. PROMOS: kolom mode cashback
ALTER TABLE public.promos
  ADD COLUMN IF NOT EXISTS reward_mode text NOT NULL DEFAULT 'discount',
  ADD COLUMN IF NOT EXISTS cashback_validity_days integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS cashback_max_amount numeric;

-- 2. BOOKINGS: kolom untuk cashback
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promo_claim_id uuid REFERENCES public.promo_claims(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cashback_used numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_credit_amount numeric,
  ADD COLUMN IF NOT EXISTS cashback_credited boolean NOT NULL DEFAULT false;

-- 3. LEDGER tabel
CREATE TABLE IF NOT EXISTS public.cashback_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('credit','debit','refund','expire','adjust')),
  amount numeric NOT NULL CHECK (amount >= 0),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  promo_id uuid REFERENCES public.promos(id) ON DELETE SET NULL,
  description text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cashback_ledger TO authenticated;
GRANT ALL ON public.cashback_ledger TO service_role;
ALTER TABLE public.cashback_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cashback ledger" ON public.cashback_ledger
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff view all cashback ledger" ON public.cashback_ledger
  FOR SELECT USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

CREATE INDEX IF NOT EXISTS idx_cashback_ledger_user ON public.cashback_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_cashback_ledger_booking ON public.cashback_ledger(booking_id);

-- 4. VIEW saldo
CREATE OR REPLACE VIEW public.cashback_balances
WITH (security_invoker = true) AS
SELECT
  user_id,
  COALESCE(SUM(
    CASE
      WHEN type = 'credit' AND (expires_at IS NULL OR expires_at > now()) THEN amount
      WHEN type IN ('debit','expire') THEN -amount
      WHEN type = 'refund' THEN amount
      WHEN type = 'adjust' THEN amount
      ELSE 0
    END
  ), 0) AS balance,
  COALESCE(SUM(
    CASE WHEN type = 'credit' AND expires_at IS NOT NULL
              AND expires_at > now() AND expires_at < now() + interval '14 days'
         THEN amount ELSE 0 END
  ),0) AS expiring_soon
FROM public.cashback_ledger
GROUP BY user_id;

GRANT SELECT ON public.cashback_balances TO authenticated, service_role;

-- helper: current balance
CREATE OR REPLACE FUNCTION public.get_cashback_balance(_user_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'credit' AND (expires_at IS NULL OR expires_at > now()) THEN amount
      WHEN type IN ('debit','expire') THEN -amount
      WHEN type = 'refund' THEN amount
      WHEN type = 'adjust' THEN amount
      ELSE 0
    END), 0)
  FROM public.cashback_ledger WHERE user_id = _user_id;
$$;

-- 5. RPC pakai saldo
CREATE OR REPLACE FUNCTION public.apply_cashback_to_booking(_booking_id uuid, _amount numeric)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_booking RECORD;
  v_balance numeric;
  v_max_allowed numeric;
  v_current_used numeric;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'booking_not_found');
  END IF;
  IF v_booking.user_id <> v_user THEN
    RETURN json_build_object('success', false, 'error', 'not_your_booking');
  END IF;
  IF v_booking.payment_status = 'paid' THEN
    RETURN json_build_object('success', false, 'error', 'already_paid');
  END IF;
  IF v_booking.status IN ('completed','cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'booking_finalized');
  END IF;

  v_current_used := COALESCE(v_booking.cashback_used, 0);
  -- Max yang boleh dipakai: harga setelah diskon lain - sudah dipakai
  v_max_allowed := GREATEST(
    0,
    COALESCE(v_booking.service_price, 0) + COALESCE(v_booking.pickup_fee,0) + COALESCE(v_booking.pickup_return_fee,0)
      - COALESCE(v_booking.discount_amount, 0) - v_current_used
  );
  IF _amount > v_max_allowed THEN
    RETURN json_build_object('success', false, 'error', 'exceeds_remaining_total', 'max', v_max_allowed);
  END IF;

  v_balance := public.get_cashback_balance(v_user);
  IF _amount > v_balance THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_balance', 'balance', v_balance);
  END IF;

  INSERT INTO public.cashback_ledger (user_id, type, amount, booking_id, description)
  VALUES (v_user, 'debit', _amount, _booking_id, 'Dipakai pada booking');

  UPDATE public.bookings
    SET cashback_used = v_current_used + _amount,
        updated_at = now()
    WHERE id = _booking_id;

  RETURN json_build_object('success', true, 'applied', _amount, 'new_balance', v_balance - _amount);
END;
$$;

-- 6. RPC refund
CREATE OR REPLACE FUNCTION public.refund_cashback_for_booking(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_booking RECORD;
  v_is_staff boolean;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'booking_not_found');
  END IF;

  v_is_staff := has_role(v_caller,'admin') OR has_role(v_caller,'staff') OR has_role(v_caller,'admin_cabang');
  IF NOT v_is_staff AND v_booking.user_id <> v_caller THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF COALESCE(v_booking.cashback_used, 0) <= 0 THEN
    RETURN json_build_object('success', true, 'refunded', 0);
  END IF;

  -- avoid double refund
  IF EXISTS (SELECT 1 FROM public.cashback_ledger
             WHERE booking_id = _booking_id AND type = 'refund') THEN
    RETURN json_build_object('success', false, 'error', 'already_refunded');
  END IF;

  INSERT INTO public.cashback_ledger (user_id, type, amount, booking_id, description)
  VALUES (v_booking.user_id, 'refund', v_booking.cashback_used, _booking_id, 'Refund pembatalan booking');

  UPDATE public.bookings SET cashback_used = 0, updated_at = now() WHERE id = _booking_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (v_booking.user_id, 'Saldo Cashback Dikembalikan',
    'Saldo Rp ' || v_booking.cashback_used || ' telah dikembalikan karena pembatalan booking.',
    'cashback', jsonb_build_object('booking_id', _booking_id, 'amount', v_booking.cashback_used));

  RETURN json_build_object('success', true, 'refunded', v_booking.cashback_used);
END;
$$;

-- 7. TRIGGER kredit cashback saat booking completed
CREATE OR REPLACE FUNCTION public.credit_cashback_on_completion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_subtotal numeric;
  v_cashback numeric;
  v_expires timestamptz;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.cashback_credited = true OR NEW.promo_claim_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.*
    INTO v_promo
    FROM public.promo_claims pc
    JOIN public.promos p ON p.id = pc.promo_id
    WHERE pc.id = NEW.promo_claim_id;

  IF NOT FOUND OR v_promo.reward_mode <> 'cashback' THEN
    RETURN NEW;
  END IF;

  v_subtotal := GREATEST(0,
    COALESCE(NEW.service_price,0) + COALESCE(NEW.pickup_fee,0) + COALESCE(NEW.pickup_return_fee,0)
    - COALESCE(NEW.discount_amount,0) - COALESCE(NEW.cashback_used,0)
  );

  IF v_promo.discount_type = 'percentage' THEN
    v_cashback := floor(v_subtotal * v_promo.discount_value / 100);
  ELSE
    v_cashback := v_promo.discount_value;
  END IF;

  IF v_promo.cashback_max_amount IS NOT NULL AND v_promo.cashback_max_amount > 0 THEN
    v_cashback := LEAST(v_cashback, v_promo.cashback_max_amount);
  END IF;
  v_cashback := GREATEST(0, v_cashback);

  IF v_cashback <= 0 THEN
    NEW.cashback_credited := true;
    NEW.cashback_credit_amount := 0;
    RETURN NEW;
  END IF;

  v_expires := now() + (COALESCE(v_promo.cashback_validity_days, 90) || ' days')::interval;

  INSERT INTO public.cashback_ledger (user_id, type, amount, booking_id, promo_id, description, expires_at)
  VALUES (NEW.user_id, 'credit', v_cashback, NEW.id, v_promo.id,
    'Cashback dari promo: ' || v_promo.title, v_expires);

  NEW.cashback_credited := true;
  NEW.cashback_credit_amount := v_cashback;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (NEW.user_id, 'Cashback Diterima 🎉',
    'Anda mendapat cashback Rp ' || v_cashback || ' dari promo "' || v_promo.title || '". Saldo siap dipakai transaksi berikutnya.',
    'cashback', jsonb_build_object('booking_id', NEW.id, 'amount', v_cashback, 'expires_at', v_expires));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_cashback_on_completion ON public.bookings;
CREATE TRIGGER trg_credit_cashback_on_completion
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.credit_cashback_on_completion();

-- 8. AUTO-REFUND saat booking dibatalkan
CREATE OR REPLACE FUNCTION public.auto_refund_cashback_on_cancel()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled'
     AND COALESCE(NEW.cashback_used,0) > 0
     AND NOT EXISTS (SELECT 1 FROM public.cashback_ledger
                     WHERE booking_id = NEW.id AND type = 'refund')
  THEN
    INSERT INTO public.cashback_ledger (user_id, type, amount, booking_id, description)
    VALUES (NEW.user_id, 'refund', NEW.cashback_used, NEW.id, 'Auto-refund pembatalan booking');

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, 'Saldo Cashback Dikembalikan',
      'Saldo Rp ' || NEW.cashback_used || ' dikembalikan karena booking dibatalkan.',
      'cashback', jsonb_build_object('booking_id', NEW.id, 'amount', NEW.cashback_used));

    NEW.cashback_used := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_refund_cashback_on_cancel ON public.bookings;
CREATE TRIGGER trg_auto_refund_cashback_on_cancel
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.auto_refund_cashback_on_cancel();
