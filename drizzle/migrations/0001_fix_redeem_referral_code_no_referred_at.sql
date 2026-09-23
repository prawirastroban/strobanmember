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