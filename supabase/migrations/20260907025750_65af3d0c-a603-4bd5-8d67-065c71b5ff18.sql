CREATE POLICY "Public can view cashback usage rules"
ON public.app_settings
FOR SELECT
TO authenticated, anon
USING (key = 'cashback.usage_rules');

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
  v_rules jsonb;
  v_mode text;
  v_total numeric;
  v_min numeric;
  v_max_amount numeric;
  v_max_percent numeric;
  v_cap numeric;
  v_eligible boolean := true;
  v_ids text[];
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

  SELECT value::jsonb INTO v_rules FROM public.app_settings WHERE key = 'cashback.usage_rules';
  v_rules := COALESCE(v_rules, '{}'::jsonb);

  IF COALESCE((v_rules->>'enabled')::boolean, true) = false THEN
    RETURN json_build_object('success', false, 'error', 'cashback_disabled');
  END IF;

  v_current_used := COALESCE(v_booking.cashback_used, 0);
  v_ids := COALESCE(v_booking.service_ids, '{}'::text[]);

  -- Total tagihan sebenarnya (harga tersimpan belum dipotong cashback;
  -- bila sudah pernah dipotong, tambahkan kembali pemakaian sebelumnya).
  v_total := GREATEST(0,
    COALESCE(v_booking.service_price, 0)
      + COALESCE(v_booking.pickup_fee, 0)
      + COALESCE(v_booking.pickup_return_fee, 0)
      + v_current_used
  );

  v_mode := COALESCE(v_rules->>'mode', 'all');

  -- Kecualikan barang (berlaku untuk semua mode)
  IF COALESCE((v_rules->>'exclude_products')::boolean, false) THEN
    IF EXISTS (
      SELECT 1
      FROM public.services s
      JOIN public.service_categories c ON c.slug = s.category
      WHERE s.id::text = ANY (v_ids)
        AND c.kind = 'product'
    ) THEN
      RETURN json_build_object('success', false, 'error', 'service_not_eligible');
    END IF;
  END IF;

  IF v_mode = 'services' THEN
    -- Semua item harus termasuk daftar yang diizinkan
    v_eligible := array_length(v_ids, 1) IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM unnest(v_ids) sid
      WHERE sid NOT IN (
        SELECT jsonb_array_elements_text(COALESCE(v_rules->'allowed_service_ids','[]'::jsonb))
      )
    );
  ELSIF v_mode = 'categories' THEN
    v_eligible := array_length(v_ids, 1) IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM unnest(v_ids) sid
      LEFT JOIN public.services s ON s.id::text = sid
      WHERE s.id IS NULL
         OR s.category IS NULL
         OR s.category NOT IN (
              SELECT jsonb_array_elements_text(COALESCE(v_rules->'allowed_categories','[]'::jsonb))
            )
    );
  END IF;

  IF NOT v_eligible THEN
    RETURN json_build_object('success', false, 'error', 'service_not_eligible');
  END IF;

  v_min := COALESCE((v_rules->>'min_transaction')::numeric, 0);
  IF v_min > 0 AND v_total < v_min THEN
    RETURN json_build_object('success', false, 'error', 'below_min_transaction', 'min_transaction', v_min);
  END IF;

  v_cap := v_total;
  v_max_percent := COALESCE((v_rules->>'max_percent')::numeric, 100);
  IF v_max_percent > 0 AND v_max_percent < 100 THEN
    v_cap := LEAST(v_cap, FLOOR(v_total * v_max_percent / 100));
  END IF;
  v_max_amount := COALESCE((v_rules->>'max_amount')::numeric, 0);
  IF v_max_amount > 0 THEN
    v_cap := LEAST(v_cap, v_max_amount);
  END IF;

  v_max_allowed := GREATEST(0, LEAST(v_total, v_cap) - v_current_used);
  IF _amount > v_max_allowed THEN
    RETURN json_build_object('success', false, 'error', 'exceeds_max', 'max', v_max_allowed);
  END IF;

  v_balance := public.get_cashback_balance(v_user);
  IF _amount > v_balance THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_balance', 'balance', v_balance);
  END IF;

  INSERT INTO public.cashback_ledger (user_id, type, amount, booking_id, description)
  VALUES (v_user, 'debit', _amount, _booking_id, 'Dipakai pada booking');

  -- Server yang memotong harga (sumber kebenaran tunggal)
  UPDATE public.bookings
    SET cashback_used = v_current_used + _amount,
        service_price = GREATEST(0, COALESCE(service_price, 0) - _amount),
        updated_at = now()
    WHERE id = _booking_id;

  RETURN json_build_object(
    'success', true,
    'applied', _amount,
    'new_balance', v_balance - _amount,
    'new_service_price', GREATEST(0, COALESCE(v_booking.service_price,0) - _amount)
  );
END;
$$;