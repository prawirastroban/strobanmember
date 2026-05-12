
-- =========================================
-- REFERRAL SETTINGS (single row)
-- =========================================
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  signup_bonus NUMERIC NOT NULL DEFAULT 10000,
  booking_commission_pct NUMERIC NOT NULL DEFAULT 5,
  min_withdraw NUMERIC NOT NULL DEFAULT 50000,
  voucher_conversion_rate NUMERIC NOT NULL DEFAULT 1.0,
  voucher_validity_days INTEGER NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT referral_settings_singleton CHECK (id = 1)
);

INSERT INTO public.referral_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view referral settings"
  ON public.referral_settings FOR SELECT USING (true);

CREATE POLICY "Staff can insert referral settings"
  ON public.referral_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update referral settings"
  ON public.referral_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- =========================================
-- PROFILES extension
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- =========================================
-- REFERRAL COMMISSIONS
-- =========================================
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL,
  booking_id UUID,
  type TEXT NOT NULL CHECK (type IN ('signup','booking')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('pending','available','paid','cancelled')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refcomm_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_refcomm_booking ON public.referral_commissions(booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refcomm_signup ON public.referral_commissions(referee_id) WHERE type='signup';
CREATE UNIQUE INDEX IF NOT EXISTS uq_refcomm_booking ON public.referral_commissions(booking_id) WHERE type='booking' AND booking_id IS NOT NULL;

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own commissions"
  ON public.referral_commissions FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Staff view all commissions"
  ON public.referral_commissions FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

CREATE POLICY "Staff manage commissions"
  ON public.referral_commissions FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

-- =========================================
-- REFERRAL BALANCES
-- =========================================
CREATE TABLE IF NOT EXISTS public.referral_balances (
  user_id UUID PRIMARY KEY,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  total_converted NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own balance"
  ON public.referral_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff view all balances"
  ON public.referral_balances FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

CREATE POLICY "Staff manage balances"
  ON public.referral_balances FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

-- =========================================
-- REFERRAL WITHDRAWALS
-- =========================================
CREATE TABLE IF NOT EXISTS public.referral_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  admin_note TEXT,
  proof_url TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refwd_user ON public.referral_withdrawals(user_id);

ALTER TABLE public.referral_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals"
  ON public.referral_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff view all withdrawals"
  ON public.referral_withdrawals FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

CREATE POLICY "Staff manage withdrawals"
  ON public.referral_withdrawals FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

-- =========================================
-- REFERRAL VOUCHERS
-- =========================================
CREATE TABLE IF NOT EXISTS public.referral_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID,
  used_booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refv_user ON public.referral_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_refv_code ON public.referral_vouchers(code);

ALTER TABLE public.referral_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vouchers"
  ON public.referral_vouchers FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = used_by);

CREATE POLICY "Staff view all vouchers"
  ON public.referral_vouchers FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

CREATE POLICY "Staff manage vouchers"
  ON public.referral_vouchers FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'));

-- =========================================
-- HELPER: generate referral code
-- =========================================
CREATE OR REPLACE FUNCTION public.generate_referral_code_for(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempt INT := 0;
BEGIN
  LOOP
    v_code := 'REF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists OR v_attempt > 10;
    v_attempt := v_attempt + 1;
  END LOOP;
  UPDATE public.profiles SET referral_code = v_code WHERE id = _user_id AND referral_code IS NULL;
  RETURN v_code;
END;
$$;

-- Trigger: auto-assign referral_code on verify
CREATE OR REPLACE FUNCTION public.assign_referral_code_on_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempt INT := 0;
BEGIN
  IF NEW.is_verified = true AND NEW.referral_code IS NULL THEN
    LOOP
      v_code := 'REF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists OR v_attempt > 10;
      v_attempt := v_attempt + 1;
    END LOOP;
    NEW.referral_code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON public.profiles;
CREATE TRIGGER trg_assign_referral_code
  BEFORE INSERT OR UPDATE OF is_verified ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code_on_verify();

-- Backfill existing verified users
UPDATE public.profiles SET referral_code = 'REF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))
  WHERE is_verified = true AND referral_code IS NULL;

-- =========================================
-- BALANCE SYNC TRIGGER
-- =========================================
CREATE OR REPLACE FUNCTION public.sync_referral_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(NEW.referrer_id, OLD.referrer_id);

  INSERT INTO public.referral_balances(user_id) VALUES (v_user) ON CONFLICT DO NOTHING;

  UPDATE public.referral_balances rb SET
    available_balance = COALESCE((SELECT SUM(amount) FROM public.referral_commissions WHERE referrer_id = v_user AND status='available'),0),
    pending_balance   = COALESCE((SELECT SUM(amount) FROM public.referral_commissions WHERE referrer_id = v_user AND status='pending'),0),
    total_earned      = COALESCE((SELECT SUM(amount) FROM public.referral_commissions WHERE referrer_id = v_user AND status IN ('available','paid')),0),
    updated_at = now()
  WHERE rb.user_id = v_user;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_referral_balance ON public.referral_commissions;
CREATE TRIGGER trg_sync_referral_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_referral_balance();

-- =========================================
-- AWARD: signup bonus when verified & has referrer
-- =========================================
CREATE OR REPLACE FUNCTION public.award_referral_signup_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_referrer_verified BOOLEAN;
BEGIN
  IF NEW.is_verified = true
     AND NEW.referred_by IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.is_verified IS DISTINCT FROM NEW.is_verified
          OR OLD.referred_by IS DISTINCT FROM NEW.referred_by) THEN

    SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
    IF v_settings.is_active AND v_settings.signup_bonus > 0 THEN
      SELECT is_verified INTO v_referrer_verified FROM public.profiles WHERE id = NEW.referred_by;
      IF COALESCE(v_referrer_verified, false) THEN
        INSERT INTO public.referral_commissions(referrer_id, referee_id, type, amount, description, status)
        VALUES (NEW.referred_by, NEW.id, 'signup', v_settings.signup_bonus,
                'Bonus pendaftaran referral', 'available')
        ON CONFLICT DO NOTHING;

        INSERT INTO public.notifications(user_id, title, message, type, metadata)
        VALUES (NEW.referred_by, 'Komisi Referral 🎉',
          'Anda mendapat Rp ' || v_settings.signup_bonus || ' dari pendaftaran ' || COALESCE(NEW.full_name,'user baru') || '.',
          'referral', jsonb_build_object('referee_id', NEW.id, 'amount', v_settings.signup_bonus, 'type','signup'));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_signup_bonus ON public.profiles;
CREATE TRIGGER trg_award_signup_bonus
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.award_referral_signup_bonus();

-- =========================================
-- AWARD: booking commission when paid
-- =========================================
CREATE OR REPLACE FUNCTION public.award_referral_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_referrer UUID;
  v_amount NUMERIC;
  v_referrer_verified BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.payment_status = 'paid'
     AND OLD.payment_status IS DISTINCT FROM 'paid' THEN

    SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = NEW.user_id;
    IF v_referrer IS NULL OR v_referrer = NEW.user_id THEN
      RETURN NEW;
    END IF;

    SELECT is_verified INTO v_referrer_verified FROM public.profiles WHERE id = v_referrer;
    IF NOT COALESCE(v_referrer_verified,false) THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
    IF NOT v_settings.is_active OR v_settings.booking_commission_pct <= 0 THEN
      RETURN NEW;
    END IF;

    v_amount := ROUND(NEW.service_price * v_settings.booking_commission_pct / 100);
    IF v_amount > 0 THEN
      INSERT INTO public.referral_commissions(referrer_id, referee_id, booking_id, type, amount, description, status)
      VALUES (v_referrer, NEW.user_id, NEW.id, 'booking', v_amount,
        'Komisi booking ' || COALESCE(NEW.service_name,''), 'available')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.notifications(user_id, title, message, type, metadata)
      VALUES (v_referrer, 'Komisi Referral 💰',
        'Anda mendapat Rp ' || v_amount || ' dari booking ' || COALESCE(NEW.service_name,'') || '.',
        'referral', jsonb_build_object('booking_id', NEW.id, 'amount', v_amount, 'type','booking'));
    END IF;
  END IF;

  -- cancel commission if booking cancelled after paid
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.referral_commissions SET status = 'cancelled'
      WHERE booking_id = NEW.id AND status IN ('available','pending');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_booking_commission ON public.bookings;
CREATE TRIGGER trg_award_booking_commission
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.award_referral_booking_commission();

-- =========================================
-- RPC: attach referrer
-- =========================================
CREATE OR REPLACE FUNCTION public.attach_referrer(_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_referrer UUID;
  v_existing UUID;
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

  UPDATE public.profiles SET referred_by = v_referrer WHERE id = v_user;
  RETURN json_build_object('success', true, 'referrer_id', v_referrer);
END;
$$;

-- =========================================
-- RPC: request withdrawal
-- =========================================
CREATE OR REPLACE FUNCTION public.request_referral_withdrawal(
  _amount NUMERIC, _bank_name TEXT, _account_number TEXT, _account_holder TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_min NUMERIC;
  v_id UUID;
  staff_record RECORD;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('success',false,'error','Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN json_build_object('success',false,'error','Nominal tidak valid'); END IF;
  IF _bank_name IS NULL OR _account_number IS NULL OR _account_holder IS NULL
     OR btrim(_bank_name)='' OR btrim(_account_number)='' OR btrim(_account_holder)='' THEN
    RETURN json_build_object('success',false,'error','Data rekening wajib diisi');
  END IF;

  SELECT min_withdraw INTO v_min FROM public.referral_settings WHERE id = 1;
  IF _amount < COALESCE(v_min,50000) THEN
    RETURN json_build_object('success',false,'error','Minimum tarik Rp ' || v_min);
  END IF;

  SELECT available_balance INTO v_balance FROM public.referral_balances WHERE user_id = v_user;
  IF COALESCE(v_balance,0) < _amount THEN
    RETURN json_build_object('success',false,'error','Saldo tidak cukup');
  END IF;

  INSERT INTO public.referral_withdrawals(user_id, amount, bank_name, account_number, account_holder)
  VALUES (v_user, _amount, _bank_name, _account_number, _account_holder)
  RETURNING id INTO v_id;

  -- reserve balance by reducing available immediately (will be reverted on reject)
  UPDATE public.referral_balances
    SET available_balance = available_balance - _amount, updated_at = now()
    WHERE user_id = v_user;

  FOR staff_record IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff') LOOP
    INSERT INTO public.notifications(user_id, title, message, type, metadata)
    VALUES (staff_record.user_id, 'Permintaan Pencairan Komisi',
      'User mengajukan tarik Rp ' || _amount || ' ke ' || _bank_name || ' a.n. ' || _account_holder,
      'referral', jsonb_build_object('withdrawal_id', v_id, 'amount', _amount));
  END LOOP;

  RETURN json_build_object('success', true, 'withdrawal_id', v_id);
END;
$$;

-- =========================================
-- RPC: approve / reject / mark paid
-- =========================================
CREATE OR REPLACE FUNCTION public.approve_referral_withdrawal(_id UUID, _note TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller UUID := auth.uid(); v_staff BOOLEAN; v_w RECORD;
BEGIN
  SELECT has_role(v_caller,'admin') OR has_role(v_caller,'staff') INTO v_staff;
  IF NOT v_staff THEN RETURN json_build_object('success',false,'error','Unauthorized'); END IF;
  SELECT * INTO v_w FROM public.referral_withdrawals WHERE id = _id;
  IF NOT FOUND THEN RETURN json_build_object('success',false,'error','Not found'); END IF;
  IF v_w.status <> 'pending' THEN RETURN json_build_object('success',false,'error','Already processed'); END IF;
  UPDATE public.referral_withdrawals SET status='approved', admin_note=_note, processed_by=v_caller, processed_at=now(), updated_at=now() WHERE id=_id;
  INSERT INTO public.notifications(user_id,title,message,type,metadata)
  VALUES (v_w.user_id,'Pencairan Disetujui','Permintaan pencairan Rp '||v_w.amount||' disetujui & sedang diproses.','referral',jsonb_build_object('withdrawal_id',_id));
  RETURN json_build_object('success',true);
END;$$;

CREATE OR REPLACE FUNCTION public.reject_referral_withdrawal(_id UUID, _reason TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller UUID := auth.uid(); v_staff BOOLEAN; v_w RECORD;
BEGIN
  SELECT has_role(v_caller,'admin') OR has_role(v_caller,'staff') INTO v_staff;
  IF NOT v_staff THEN RETURN json_build_object('success',false,'error','Unauthorized'); END IF;
  SELECT * INTO v_w FROM public.referral_withdrawals WHERE id = _id;
  IF NOT FOUND THEN RETURN json_build_object('success',false,'error','Not found'); END IF;
  IF v_w.status NOT IN ('pending','approved') THEN RETURN json_build_object('success',false,'error','Cannot reject'); END IF;
  UPDATE public.referral_withdrawals SET status='rejected', admin_note=_reason, processed_by=v_caller, processed_at=now(), updated_at=now() WHERE id=_id;
  -- refund balance
  UPDATE public.referral_balances SET available_balance = available_balance + v_w.amount, updated_at=now() WHERE user_id=v_w.user_id;
  INSERT INTO public.notifications(user_id,title,message,type,metadata)
  VALUES (v_w.user_id,'Pencairan Ditolak','Pencairan Rp '||v_w.amount||' ditolak. Alasan: '||COALESCE(_reason,'-'),'referral',jsonb_build_object('withdrawal_id',_id));
  RETURN json_build_object('success',true);
END;$$;

CREATE OR REPLACE FUNCTION public.mark_referral_withdrawal_paid(_id UUID, _proof_url TEXT DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller UUID := auth.uid(); v_staff BOOLEAN; v_w RECORD;
BEGIN
  SELECT has_role(v_caller,'admin') OR has_role(v_caller,'staff') INTO v_staff;
  IF NOT v_staff THEN RETURN json_build_object('success',false,'error','Unauthorized'); END IF;
  SELECT * INTO v_w FROM public.referral_withdrawals WHERE id = _id;
  IF NOT FOUND THEN RETURN json_build_object('success',false,'error','Not found'); END IF;
  IF v_w.status NOT IN ('pending','approved') THEN RETURN json_build_object('success',false,'error','Cannot mark paid'); END IF;
  UPDATE public.referral_withdrawals SET status='paid', proof_url=COALESCE(_proof_url, proof_url), processed_by=v_caller, processed_at=now(), updated_at=now() WHERE id=_id;
  UPDATE public.referral_balances SET total_withdrawn = total_withdrawn + v_w.amount, updated_at=now() WHERE user_id=v_w.user_id;
  INSERT INTO public.notifications(user_id,title,message,type,metadata)
  VALUES (v_w.user_id,'Pencairan Sukses ✅','Rp '||v_w.amount||' telah ditransfer ke rekening Anda.','referral',jsonb_build_object('withdrawal_id',_id));
  RETURN json_build_object('success',true);
END;$$;

-- =========================================
-- RPC: convert balance to voucher
-- =========================================
CREATE OR REPLACE FUNCTION public.convert_referral_to_voucher(_amount NUMERIC)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_settings RECORD;
  v_code TEXT;
  v_voucher_amount NUMERIC;
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('success',false,'error','Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN json_build_object('success',false,'error','Nominal tidak valid'); END IF;

  SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
  SELECT available_balance INTO v_balance FROM public.referral_balances WHERE user_id = v_user;
  IF COALESCE(v_balance,0) < _amount THEN
    RETURN json_build_object('success',false,'error','Saldo tidak cukup');
  END IF;

  v_voucher_amount := ROUND(_amount * COALESCE(v_settings.voucher_conversion_rate,1));
  v_code := 'REFV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  INSERT INTO public.referral_vouchers(user_id, code, amount, expires_at)
  VALUES (v_user, v_code, v_voucher_amount, now() + (COALESCE(v_settings.voucher_validity_days,90) || ' days')::interval)
  RETURNING id INTO v_id;

  UPDATE public.referral_balances
    SET available_balance = available_balance - _amount,
        total_converted = total_converted + _amount,
        updated_at = now()
    WHERE user_id = v_user;

  RETURN json_build_object('success',true,'code',v_code,'amount',v_voucher_amount,'id',v_id);
END;$$;

-- =========================================
-- RPC: redeem voucher (validate only — actual discount applied client-side)
-- =========================================
CREATE OR REPLACE FUNCTION public.validate_referral_voucher(_code TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_v RECORD;
BEGIN
  SELECT * INTO v_v FROM public.referral_vouchers WHERE code = upper(btrim(_code));
  IF NOT FOUND THEN RETURN json_build_object('valid',false,'error','Voucher tidak ditemukan'); END IF;
  IF v_v.status <> 'active' THEN RETURN json_build_object('valid',false,'error','Voucher sudah '||v_v.status); END IF;
  IF v_v.expires_at < now() THEN
    UPDATE public.referral_vouchers SET status='expired' WHERE id = v_v.id;
    RETURN json_build_object('valid',false,'error','Voucher sudah kadaluarsa');
  END IF;
  RETURN json_build_object('valid',true,'amount',v_v.amount,'code',v_v.code,'expires_at',v_v.expires_at);
END;$$;

CREATE OR REPLACE FUNCTION public.redeem_referral_voucher(_code TEXT, _booking_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); v_v RECORD;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_v FROM public.referral_vouchers WHERE code = upper(btrim(_code));
  IF NOT FOUND THEN RETURN json_build_object('success',false,'error','Voucher tidak ditemukan'); END IF;
  IF v_v.status <> 'active' THEN RETURN json_build_object('success',false,'error','Voucher sudah '||v_v.status); END IF;
  IF v_v.expires_at < now() THEN RETURN json_build_object('success',false,'error','Voucher kadaluarsa'); END IF;

  UPDATE public.referral_vouchers
    SET status='used', used_at=now(), used_by=v_user, used_booking_id=_booking_id
    WHERE id = v_v.id;

  RETURN json_build_object('success',true,'amount',v_v.amount);
END;$$;
