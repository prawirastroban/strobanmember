
CREATE OR REPLACE FUNCTION public.admin_adjust_cashback(
  _user_id uuid,
  _amount numeric,
  _type text DEFAULT 'credit',
  _description text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _new_balance numeric;
  _final_expires timestamptz;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;
  IF NOT public.has_role(_caller, 'staff'::app_role) THEN
    RAISE EXCEPTION 'forbidden: hanya Owner yang dapat menyesuaikan saldo cashback' USING ERRCODE = '42501';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount harus lebih besar dari 0';
  END IF;
  IF _type NOT IN ('credit','debit','adjust') THEN
    RAISE EXCEPTION 'type tidak valid (gunakan credit/debit/adjust)';
  END IF;
  IF _description IS NULL OR length(trim(_description)) < 3 THEN
    RAISE EXCEPTION 'description wajib diisi (min 3 karakter)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'user tidak ditemukan';
  END IF;

  IF _type = 'credit' THEN
    _final_expires := COALESCE(_expires_at, now() + interval '365 days');
  ELSE
    _final_expires := NULL;
  END IF;

  INSERT INTO public.cashback_ledger (user_id, type, amount, description, expires_at)
  VALUES (_user_id, _type, _amount, trim(_description), _final_expires);

  INSERT INTO public.admin_audit_log (
    actor_id, actor_role, action, target_type, target_id, target_label,
    before, after, metadata
  ) VALUES (
    _caller, 'staff', 'cashback.adjust', 'user', _user_id, NULL,
    NULL, NULL,
    jsonb_build_object(
      'amount', _amount,
      'type', _type,
      'description', trim(_description),
      'expires_at', _final_expires
    )
  );

  SELECT public.get_cashback_balance(_user_id) INTO _new_balance;
  RETURN COALESCE(_new_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_cashback(uuid, numeric, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_cashback(uuid, numeric, text, text, timestamptz) TO authenticated;
