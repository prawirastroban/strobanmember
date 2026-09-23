ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS referee_discount_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referee_discount_type TEXT NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS referee_discount_value NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_discount_max NUMERIC,
  ADD COLUMN IF NOT EXISTS referee_min_purchase NUMERIC NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_referral_code_for_checkout(_code TEXT, _subtotal NUMERIC DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_code TEXT := upper(btrim(COALESCE(_code, '')));
  v_settings RECORD;
  v_referrer UUID;
  v_referrer_active BOOLEAN;
  v_existing UUID;
  v_amount NUMERIC := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'not_authenticated');
  END IF;
  IF v_code = '' THEN
    RETURN json_build_object('valid', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_settings FROM public.referral_settings WHERE id = 1;
  IF v_settings IS NULL OR NOT COALESCE(v_settings.is_active, false) THEN
    RETURN json_build_object('valid', false, 'error', 'program_inactive');
  END IF;
  IF v_settings.active_from IS NOT NULL AND CURRENT_DATE < v_settings.active_from THEN
    RETURN json_build_object('valid', false, 'error', 'program_inactive');
  END IF;
  IF v_settings.active_until IS NOT NULL AND CURRENT_DATE > v_settings.active_until THEN
    RETURN json_build_object('valid', false, 'error', 'program_inactive');
  END IF;
  IF NOT COALESCE(v_settings.referee_discount_enabled, false)
     OR COALESCE(v_settings.referee_discount_value, 0) <= 0 THEN
    RETURN json_build_object('valid', false, 'error', 'referee_discount_disabled');
  END IF;

  SELECT id, COALESCE(is_verified, false) AND NOT COALESCE(is_flagged, false)
    INTO v_referrer, v_referrer_active
    FROM public.profiles WHERE upper(referral_code) = v_code;

  IF v_referrer IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'not_found');
  END IF;
  IF v_referrer = v_user THEN
    RETURN json_build_object('valid', false, 'error', 'own_code');
  END IF;
  IF NOT COALESCE(v_referrer_active, false) THEN
    RETURN json_build_object('valid', false, 'error', 'referrer_inactive');
  END IF;

  SELECT referred_by INTO v_existing FROM public.profiles WHERE id = v_user;
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('valid', false, 'error', 'already_referred');
  END IF;

  IF COALESCE(_subtotal, 0) < COALESCE(v_settings.referee_min_purchase, 0) THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'min_purchase',
      'min_purchase', COALESCE(v_settings.referee_min_purchase, 0)
    );
  END IF;

  IF v_settings.referee_discount_type = 'fixed' THEN
    v_amount := v_settings.referee_discount_value;
  ELSE
    v_amount := ROUND(COALESCE(_subtotal, 0) * v_settings.referee_discount_value / 100);
    IF v_settings.referee_discount_max IS NOT NULL AND v_settings.referee_discount_max > 0 THEN
      v_amount := LEAST(v_amount, v_settings.referee_discount_max);
    END IF;
  END IF;
  v_amount := GREATEST(0, LEAST(v_amount, COALESCE(_subtotal, 0)));

  RETURN json_build_object(
    'valid', true,
    'code', v_code,
    'referrer_id', v_referrer,
    'discount_type', v_settings.referee_discount_type,
    'discount_value', v_settings.referee_discount_value,
    'discount_amount', v_amount,
    'min_purchase', COALESCE(v_settings.referee_min_purchase, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_referral_code(_code TEXT, _booking_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_code TEXT := upper(btrim(COALESCE(_code, '')));
  v_check json;
  v_referrer UUID;
  v_rows INT;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_check := public.validate_referral_code_for_checkout(v_code, 0);
  IF NOT COALESCE((v_check->>'valid')::boolean, false)
     AND COALESCE(v_check->>'error', '') <> 'min_purchase' THEN
    RETURN json_build_object('success', false, 'error', v_check->>'error');
  END IF;

  SELECT id INTO v_referrer FROM public.profiles WHERE upper(referral_code) = v_code;
  IF v_referrer IS NULL OR v_referrer = v_user THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  UPDATE public.profiles
     SET referred_by = v_referrer,
         referred_at = COALESCE(referred_at, now()),
         updated_at = now()
   WHERE id = v_user AND referred_by IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN json_build_object('success', false, 'error', 'already_referred');
  END IF;

  INSERT INTO public.notifications(user_id, title, message, type, metadata)
  VALUES (
    v_referrer,
    'Kode Referral Dipakai 🎉',
    'Seseorang memakai kode undangan Anda saat booking servis.',
    'referral',
    jsonb_build_object('booking_id', _booking_id, 'referee_id', v_user)
  );

  RETURN json_build_object('success', true, 'referrer_id', v_referrer);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_referral_code_for_checkout(TEXT, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_referral_code(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_referral_code_for_checkout(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(TEXT, UUID) TO authenticated;