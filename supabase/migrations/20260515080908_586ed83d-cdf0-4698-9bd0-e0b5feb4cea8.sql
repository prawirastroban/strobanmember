ALTER TABLE public.promos
ADD COLUMN IF NOT EXISTS max_claims_per_user INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.promos.max_claims_per_user IS 'Maksimum klaim per user. 0 = unlimited.';

CREATE OR REPLACE FUNCTION public.claim_promo(_promo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _promo public.promos;
  _user_claim_count INTEGER;
  _last_claim public.promo_claims;
  _code TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _promo FROM public.promos WHERE id = _promo_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF NOT _promo.is_active
     OR _promo.starts_at > now()
     OR (_promo.ends_at IS NOT NULL AND _promo.ends_at < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive_or_expired');
  END IF;

  IF _promo.max_claims IS NOT NULL AND _promo.claims_count >= _promo.max_claims THEN
    RETURN jsonb_build_object('success', false, 'error', 'fully_claimed');
  END IF;

  -- Per-user limit check (0 = unlimited)
  IF _promo.max_claims_per_user > 0 THEN
    SELECT count(*) INTO _user_claim_count
      FROM public.promo_claims
      WHERE promo_id = _promo_id AND user_id = _user_id;

    IF _user_claim_count >= _promo.max_claims_per_user THEN
      SELECT * INTO _last_claim FROM public.promo_claims
        WHERE promo_id = _promo_id AND user_id = _user_id
        ORDER BY claimed_at DESC LIMIT 1;
      RETURN jsonb_build_object(
        'success', false,
        'error', CASE WHEN _promo.max_claims_per_user = 1 THEN 'already_claimed' ELSE 'limit_per_user_reached' END,
        'voucher_code', _last_claim.voucher_code
      );
    END IF;
  END IF;

  _code := COALESCE(NULLIF(_promo.voucher_prefix, ''), 'PROMO')
           || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.promo_claims (promo_id, user_id, voucher_code, expires_at)
  VALUES (_promo_id, _user_id, _code, _promo.ends_at);

  UPDATE public.promos
  SET claims_count = claims_count + 1
  WHERE id = _promo_id;

  RETURN jsonb_build_object(
    'success', true,
    'voucher_code', _code,
    'expires_at', _promo.ends_at
  );
END;
$$;