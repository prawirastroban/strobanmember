-- =========================================
-- ANTI-FRAUD REFERRAL: 7-LAYER PROTECTION
-- =========================================

-- 1) profiles: kolom anti-fraud
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_ip TEXT,
  ADD COLUMN IF NOT EXISTS fraud_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_bank_account TEXT;

-- backfill: legacy users yang sudah punya phone dianggap verified (tidak break flow)
UPDATE public.profiles SET phone_verified = true, phone_verified_at = now()
  WHERE phone IS NOT NULL AND btrim(phone) <> '' AND phone_verified = false;

-- unique phone (Rule 3)
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_phone
  ON public.profiles(phone) WHERE phone IS NOT NULL AND btrim(phone) <> '';

CREATE INDEX IF NOT EXISTS idx_profiles_is_flagged ON public.profiles(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_profiles_payout_bank ON public.profiles(payout_bank_account) WHERE payout_bank_account IS NOT NULL;

-- 2) referral_settings: kolom konfigurasi anti-fraud
ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS signup_bonus_hold_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS max_referrals_per_day INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_referrals_per_month INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS same_ip_threshold INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS fraud_score_flag_threshold INTEGER NOT NULL DEFAULT 50;

-- 3) referral_fraud_log
CREATE TABLE IF NOT EXISTS public.referral_fraud_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  related_user_id UUID,
  rule TEXT NOT NULL,
  score_delta INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fraudlog_user ON public.referral_fraud_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraudlog_rule ON public.referral_fraud_log(rule);

ALTER TABLE public.referral_fraud_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view fraud log" ON public.referral_fraud_log;
CREATE POLICY "Staff view fraud log" ON public.referral_fraud_log FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

-- 4) referral_signups_meta
CREATE TABLE IF NOT EXISTS public.referral_signups_meta (
  referee_id UUID PRIMARY KEY,
  referrer_id UUID NOT NULL,
  signup_ip TEXT,
  signup_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signupsmeta_referrer_ip ON public.referral_signups_meta(referrer_id, signup_ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signupsmeta_referrer_time ON public.referral_signups_meta(referrer_id, created_at DESC);

ALTER TABLE public.referral_signups_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view signups meta" ON public.referral_signups_meta;
CREATE POLICY "Staff view signups meta" ON public.referral_signups_meta FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

-- =========================================
-- RULE 6: Fraud Score helper
-- =========================================
CREATE OR REPLACE FUNCTION public.add_fraud_score(
  _user_id UUID, _delta INTEGER, _rule TEXT, _details JSONB DEFAULT '{}'::jsonb,
  _related_user_id UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_threshold INTEGER;
  v_new_score INTEGER;
  v_was_flagged BOOLEAN;
  staff_rec RECORD;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  SELECT fraud_score_flag_threshold INTO v_threshold FROM public.referral_settings WHERE id = 1;
  v_threshold := COALESCE(v_threshold, 50);

  SELECT is_flagged INTO v_was_flagged FROM public.profiles WHERE id = _user_id;

  UPDATE public.profiles
    SET fraud_score = COALESCE(fraud_score,0) + _delta,
        updated_at = now()
    WHERE id = _user_id
  RETURNING fraud_score INTO v_new_score;

  INSERT INTO public.referral_fraud_log(user_id, related_user_id, rule, score_delta, details)
  VALUES (_user_id, _related_user_id, _rule, _delta, _details);

  -- auto-flag jika threshold tercapai
  IF v_new_score >= v_threshold AND NOT COALESCE(v_was_flagged,false) THEN
    UPDATE public.profiles
      SET is_flagged = true,
          flagged_at = now(),
          flagged_reason = 'Auto-flag: fraud_score=' || v_new_score || ' rule=' || _rule
      WHERE id = _user_id;

    -- hold semua komisi available → pending
    UPDATE public.referral_commissions
      SET status = 'pending'
      WHERE referrer_id = _user_id AND status = 'available';

    -- notify staff
    FOR staff_rec IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff') LOOP
      INSERT INTO public.notifications(user_id, title, message, type, metadata)
      VALUES (staff_rec.user_id, '⚠️ Referral Auto-Flag',
        'User dengan fraud_score ' || v_new_score || ' ditandai otomatis. Rule: ' || _rule,
        'referral_fraud',
        jsonb_build_object('flagged_user_id', _user_id, 'score', v_new_score, 'rule', _rule));
    END LOOP;
  END IF;
END;
$$;

-- =========================================
-- RULE 1: Komisi booking saat COMPLETED, bukan paid
-- =========================================
CREATE OR REPLACE FUNCTION public.award_referral_booking_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_referrer UUID;
  v_amount NUMERIC;
  v_referrer_verified BOOLEAN;
  v_referrer_flagged BOOLEAN;
BEGIN
  -- Trigger ketika service_status berubah jadi 'completed'
  IF TG_OP = 'UPDATE'
     AND NEW.service_status = 'completed'
     AND OLD.service_status IS DISTINCT FROM 'completed'
     AND NEW.payment_status = 'paid' THEN

    SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = NEW.user_id;
    IF v_referrer IS NULL OR v_referrer = NEW.user_id THEN RETURN NEW; END IF;

    SELECT is_verified, is_flagged INTO v_referrer_verified, v_referrer_flagged
      FROM public.profiles WHERE id = v_referrer;
    IF NOT COALESCE(v_referrer_verified,false) THEN RETURN NEW; END IF;

    SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
    IF NOT v_settings.is_active OR v_settings.booking_commission_pct <= 0 THEN RETURN NEW; END IF;

    v_amount := ROUND(NEW.service_price * v_settings.booking_commission_pct / 100);
    IF v_amount > 0 THEN
      INSERT INTO public.referral_commissions(referrer_id, referee_id, booking_id, type, amount, description, status, available_at)
      VALUES (v_referrer, NEW.user_id, NEW.id, 'booking', v_amount,
        'Komisi booking ' || COALESCE(NEW.service_name,''),
        CASE WHEN COALESCE(v_referrer_flagged,false) THEN 'pending' ELSE 'available' END,
        now())
      ON CONFLICT DO NOTHING;

      INSERT INTO public.notifications(user_id, title, message, type, metadata)
      VALUES (v_referrer, 'Komisi Referral 💰',
        'Anda mendapat Rp ' || v_amount || ' dari servis selesai ' || COALESCE(NEW.service_name,'') || '.',
        'referral', jsonb_build_object('booking_id', NEW.id, 'amount', v_amount, 'type','booking'));
    END IF;
  END IF;

  -- cancel komisi jika booking dibatalkan
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.referral_commissions SET status = 'cancelled'
      WHERE booking_id = NEW.id AND status IN ('available','pending');
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================
-- RULE 2 & 3: Bonus signup pending 7 hari + butuh phone_verified
-- =========================================
CREATE OR REPLACE FUNCTION public.award_referral_signup_bonus()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_referrer_verified BOOLEAN;
  v_referrer_flagged BOOLEAN;
  v_hold_days INTEGER;
BEGIN
  IF NEW.is_verified = true
     AND NEW.referred_by IS NOT NULL
     AND COALESCE(NEW.phone_verified, false) = true   -- Rule 3
     AND (TG_OP = 'INSERT'
          OR OLD.is_verified IS DISTINCT FROM NEW.is_verified
          OR OLD.referred_by IS DISTINCT FROM NEW.referred_by
          OR OLD.phone_verified IS DISTINCT FROM NEW.phone_verified) THEN

    SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
    IF v_settings.is_active AND v_settings.signup_bonus > 0 THEN
      SELECT is_verified, is_flagged INTO v_referrer_verified, v_referrer_flagged
        FROM public.profiles WHERE id = NEW.referred_by;

      IF COALESCE(v_referrer_verified, false) THEN
        v_hold_days := COALESCE(v_settings.signup_bonus_hold_days, 7);

        INSERT INTO public.referral_commissions(referrer_id, referee_id, type, amount, description, status, available_at)
        VALUES (NEW.referred_by, NEW.id, 'signup', v_settings.signup_bonus,
                'Bonus pendaftaran referral (hold ' || v_hold_days || ' hari)',
                'pending',
                now() + (v_hold_days || ' days')::interval)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.notifications(user_id, title, message, type, metadata)
        VALUES (NEW.referred_by, 'Bonus Referral (Pending) ⏳',
          'Bonus Rp ' || v_settings.signup_bonus || ' dari ' || COALESCE(NEW.full_name,'user baru') || ' akan tersedia dalam ' || v_hold_days || ' hari.',
          'referral', jsonb_build_object('referee_id', NEW.id, 'amount', v_settings.signup_bonus, 'type','signup', 'hold_days', v_hold_days));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================
-- RULE 2: Release pending bonus (cron-callable)
-- =========================================
CREATE OR REPLACE FUNCTION public.release_pending_referral_commissions()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH released AS (
    UPDATE public.referral_commissions rc
      SET status = 'available'
      FROM public.profiles p
      WHERE rc.referrer_id = p.id
        AND rc.status = 'pending'
        AND rc.available_at IS NOT NULL
        AND rc.available_at <= now()
        AND COALESCE(p.is_flagged, false) = false
    RETURNING rc.id
  )
  SELECT COUNT(*) INTO v_count FROM released;

  RETURN json_build_object('success', true, 'released', v_count);
END;
$$;

-- =========================================
-- RULE 4 & 7: attach_referrer dengan IP + rate limit
-- =========================================
CREATE OR REPLACE FUNCTION public.attach_referrer(_code TEXT, _ip TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_referrer UUID;
  v_existing UUID;
  v_settings RECORD;
  v_count_day INTEGER;
  v_count_month INTEGER;
  v_count_same_ip INTEGER;
  v_phone TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF _code IS NULL OR btrim(_code) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Empty code');
  END IF;

  SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(btrim(_code));
  IF v_referrer IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Kode referral tidak ditemukan');
  END IF;
  IF v_referrer = v_user THEN
    RETURN json_build_object('success', false, 'error', 'Tidak bisa pakai kode sendiri');
  END IF;

  SELECT referred_by INTO v_existing FROM public.profiles WHERE id = v_user;
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sudah punya referrer');
  END IF;

  SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;

  -- Rule 7: rate limit per hari
  SELECT COUNT(*) INTO v_count_day FROM public.referral_signups_meta
    WHERE referrer_id = v_referrer AND created_at > now() - interval '24 hours';
  IF v_count_day >= COALESCE(v_settings.max_referrals_per_day, 10) THEN
    PERFORM public.add_fraud_score(v_referrer, 20, 'rate_limit_day',
      jsonb_build_object('count_24h', v_count_day, 'attempted_referee', v_user), v_user);
    RETURN json_build_object('success', false, 'error', 'Referrer mencapai batas referral harian. Coba lagi besok.');
  END IF;

  -- Rule 7: rate limit per bulan
  SELECT COUNT(*) INTO v_count_month FROM public.referral_signups_meta
    WHERE referrer_id = v_referrer AND created_at > now() - interval '30 days';
  IF v_count_month >= COALESCE(v_settings.max_referrals_per_month, 50) THEN
    PERFORM public.add_fraud_score(v_referrer, 10, 'rate_limit_month',
      jsonb_build_object('count_30d', v_count_month, 'attempted_referee', v_user), v_user);
    RETURN json_build_object('success', false, 'error', 'Referrer mencapai batas referral bulanan.');
  END IF;

  -- attach
  UPDATE public.profiles
    SET referred_by = v_referrer,
        signup_ip = COALESCE(signup_ip, _ip)
    WHERE id = v_user;

  SELECT phone INTO v_phone FROM public.profiles WHERE id = v_user;

  INSERT INTO public.referral_signups_meta(referee_id, referrer_id, signup_ip, signup_phone)
    VALUES (v_user, v_referrer, _ip, v_phone)
    ON CONFLICT (referee_id) DO UPDATE SET signup_ip = EXCLUDED.signup_ip, signup_phone = EXCLUDED.signup_phone;

  -- Rule 4: cek IP sama
  IF _ip IS NOT NULL AND btrim(_ip) <> '' THEN
    SELECT COUNT(*) INTO v_count_same_ip FROM public.referral_signups_meta
      WHERE referrer_id = v_referrer
        AND signup_ip = _ip
        AND created_at > now() - interval '24 hours'
        AND referee_id <> v_user;
    IF v_count_same_ip >= COALESCE(v_settings.same_ip_threshold, 2) THEN
      PERFORM public.add_fraud_score(v_referrer, 30, 'same_ip_cluster',
        jsonb_build_object('ip', _ip, 'count_same_ip_24h', v_count_same_ip + 1), v_user);
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'referrer_id', v_referrer);
END;
$$;

-- =========================================
-- RULE 5: Rekening unik per akun
-- =========================================
CREATE OR REPLACE FUNCTION public.request_referral_withdrawal(
  _amount NUMERIC, _bank_name TEXT, _account_number TEXT, _account_holder TEXT
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_min NUMERIC;
  v_id UUID;
  v_other_user UUID;
  v_norm_acc TEXT;
  v_is_flagged BOOLEAN;
  staff_record RECORD;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('success',false,'error','Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN json_build_object('success',false,'error','Nominal tidak valid'); END IF;
  IF _bank_name IS NULL OR _account_number IS NULL OR _account_holder IS NULL
     OR btrim(_bank_name)='' OR btrim(_account_number)='' OR btrim(_account_holder)='' THEN
    RETURN json_build_object('success',false,'error','Data rekening wajib diisi');
  END IF;

  v_norm_acc := regexp_replace(_account_number, '\s+', '', 'g');

  SELECT is_flagged INTO v_is_flagged FROM public.profiles WHERE id = v_user;
  IF COALESCE(v_is_flagged,false) THEN
    RETURN json_build_object('success',false,'error','Akun sedang ditinjau. Hubungi support.');
  END IF;

  -- Rule 5: rekening tidak boleh dipakai user lain
  SELECT id INTO v_other_user FROM public.profiles
    WHERE payout_bank_account = v_norm_acc AND id <> v_user
    LIMIT 1;
  IF v_other_user IS NOT NULL THEN
    PERFORM public.add_fraud_score(v_user, 40, 'duplicate_bank_account',
      jsonb_build_object('account_number', v_norm_acc, 'other_user_id', v_other_user), v_other_user);
    RETURN json_build_object('success',false,'error','Nomor rekening ini sudah terdaftar di akun lain.');
  END IF;

  SELECT min_withdraw INTO v_min FROM public.referral_settings WHERE id = 1;
  IF _amount < COALESCE(v_min,50000) THEN
    RETURN json_build_object('success',false,'error','Minimum tarik Rp ' || v_min);
  END IF;

  SELECT available_balance INTO v_balance FROM public.referral_balances WHERE user_id = v_user;
  IF COALESCE(v_balance,0) < _amount THEN
    RETURN json_build_object('success',false,'error','Saldo tidak cukup');
  END IF;

  -- simpan rekening utama user
  UPDATE public.profiles SET payout_bank_account = v_norm_acc WHERE id = v_user;

  INSERT INTO public.referral_withdrawals(user_id, amount, bank_name, account_number, account_holder)
  VALUES (v_user, _amount, _bank_name, v_norm_acc, _account_holder)
  RETURNING id INTO v_id;

  UPDATE public.referral_balances
    SET available_balance = available_balance - _amount, updated_at = now()
    WHERE user_id = v_user;

  FOR staff_record IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff') LOOP
    INSERT INTO public.notifications(user_id, title, message, type, metadata)
    VALUES (staff_record.user_id, 'Permintaan Pencairan Komisi',
      'User mengajukan tarik Rp ' || _amount || ' ke ' || _bank_name || ' a.n. ' || _account_holder,
      'referral', jsonb_build_object('withdrawal_id', v_id, 'amount', _amount));
  END LOOP;

  RETURN json_build_object('success',true,'withdrawal_id', v_id);
END;
$$;

-- =========================================
-- ADMIN HELPERS: unflag & release
-- =========================================
CREATE OR REPLACE FUNCTION public.admin_unflag_user(_user_id UUID, _release_commissions BOOLEAN DEFAULT true)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff')) THEN
    RETURN json_build_object('success',false,'error','Unauthorized');
  END IF;

  UPDATE public.profiles
    SET is_flagged = false, flagged_reason = NULL, flagged_at = NULL, fraud_score = 0
    WHERE id = _user_id;

  IF _release_commissions THEN
    UPDATE public.referral_commissions
      SET status = 'available'
      WHERE referrer_id = _user_id
        AND status = 'pending'
        AND (available_at IS NULL OR available_at <= now());
  END IF;

  INSERT INTO public.referral_fraud_log(user_id, rule, score_delta, details)
  VALUES (_user_id, 'admin_unflag', 0, jsonb_build_object('actor', auth.uid(), 'released', _release_commissions));

  RETURN json_build_object('success',true);
END;
$$;

-- =========================================
-- TRIGGER: sync phone_verified dari auth.users
-- =========================================
CREATE OR REPLACE FUNCTION public.sync_phone_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.phone_confirmed_at IS NOT NULL
     AND (OLD.phone_confirmed_at IS NULL OR OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at) THEN
    UPDATE public.profiles
      SET phone_verified = true,
          phone_verified_at = NEW.phone_confirmed_at,
          phone = COALESCE(phone, NEW.phone)
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_phone_verified ON auth.users;
CREATE TRIGGER trg_sync_phone_verified
  AFTER UPDATE OF phone_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_phone_verified();
