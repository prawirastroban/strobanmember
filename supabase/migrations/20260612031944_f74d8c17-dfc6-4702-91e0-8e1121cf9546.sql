
-- 1. Promo used (voucher status moves to 'used')
CREATE OR REPLACE FUNCTION public.notify_promo_used()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_promo_title text;
  v_staff record;
BEGIN
  IF NEW.status <> 'used' OR (TG_OP = 'UPDATE' AND OLD.status = 'used') THEN
    RETURN NEW;
  END IF;
  SELECT title INTO v_promo_title FROM public.promos WHERE id = NEW.promo_id;

  -- Customer
  PERFORM public.create_notification(
    NEW.user_id,
    'Voucher promo dipakai',
    COALESCE('Voucher "' || v_promo_title || '" telah digunakan.', 'Voucher promo telah digunakan.'),
    'promo_used','marketing','low', NULL,
    jsonb_build_object('reference_id', NEW.id, 'promo_id', NEW.promo_id, 'voucher_code', NEW.voucher_code),
    'trigger'
  );
  -- Staff
  FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','staff','admin_cabang') LOOP
    PERFORM public.create_notification(
      v_staff.user_id,
      'Promo digunakan',
      COALESCE('Voucher "' || v_promo_title || '" baru saja digunakan oleh pelanggan.', 'Voucher promo baru saja digunakan.'),
      'promo_used','marketing','low', NULL,
      jsonb_build_object('reference_id', NEW.id, 'promo_id', NEW.promo_id, 'customer_user_id', NEW.user_id),
      'trigger'
    );
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_promo_used ON public.promo_claims;
CREATE TRIGGER trg_notify_promo_used
  AFTER INSERT OR UPDATE OF status ON public.promo_claims
  FOR EACH ROW EXECUTE FUNCTION public.notify_promo_used();

-- 2. Reward (loyalty voucher) used
CREATE OR REPLACE FUNCTION public.notify_reward_used()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reward_name text;
  v_staff record;
BEGIN
  IF NEW.status <> 'used' OR (TG_OP = 'UPDATE' AND OLD.status = 'used') THEN
    RETURN NEW;
  END IF;
  SELECT name INTO v_reward_name FROM public.rewards WHERE id = NEW.reward_id;

  PERFORM public.create_notification(
    NEW.user_id,
    'Reward dipakai',
    COALESCE('Reward "' || v_reward_name || '" telah digunakan.', 'Reward telah digunakan.'),
    'reward_used','marketing','low', NULL,
    jsonb_build_object('reference_id', NEW.id, 'reward_id', NEW.reward_id, 'redemption_code', NEW.redemption_code),
    'trigger'
  );
  FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','staff','admin_cabang') LOOP
    PERFORM public.create_notification(
      v_staff.user_id,
      'Reward digunakan',
      COALESCE('Reward "' || v_reward_name || '" baru saja digunakan oleh pelanggan.', 'Reward baru saja digunakan oleh pelanggan.'),
      'reward_used','marketing','low', NULL,
      jsonb_build_object('reference_id', NEW.id, 'reward_id', NEW.reward_id, 'customer_user_id', NEW.user_id),
      'trigger'
    );
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_reward_used ON public.reward_redemptions;
CREATE TRIGGER trg_notify_reward_used
  AFTER INSERT OR UPDATE OF status ON public.reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_reward_used();

-- 3. Referral commission awarded (status → awarded/available)
CREATE OR REPLACE FUNCTION public.notify_referral_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amount_text text;
BEGIN
  IF NEW.status NOT IN ('awarded','available') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;

  v_amount_text := 'Rp ' || to_char(COALESCE(NEW.amount,0), 'FM999G999G999');
  PERFORM public.create_notification(
    NEW.referrer_id,
    'Komisi referral diterima',
    'Anda menerima komisi ' || v_amount_text || ' dari program referral.',
    'referral_commission','marketing','medium', NULL,
    jsonb_build_object('reference_id', NEW.id, 'amount', NEW.amount, 'booking_id', NEW.booking_id),
    'trigger'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_referral_commission ON public.referral_commissions;
CREATE TRIGGER trg_notify_referral_commission
  AFTER INSERT OR UPDATE OF status ON public.referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_referral_commission();

-- 4. Internal bug/feedback report → notify staff
CREATE OR REPLACE FUNCTION public.notify_internal_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_staff record;
BEGIN
  FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','staff','admin_cabang') LOOP
    PERFORM public.create_notification(
      v_staff.user_id,
      'Laporan baru: ' || COALESCE(NEW.title, '(tanpa judul)'),
      COALESCE('Dari ' || NEW.reporter_name || ' — ' || left(COALESCE(NEW.description,''), 140), 'Laporan internal baru diterima.'),
      'bug_report','operations','high', NULL,
      jsonb_build_object('reference_id', NEW.id, 'category', NEW.category, 'reporter_id', NEW.reporter_id),
      'trigger'
    );
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_internal_report ON public.internal_reports;
CREATE TRIGGER trg_notify_internal_report
  AFTER INSERT ON public.internal_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_internal_report();
