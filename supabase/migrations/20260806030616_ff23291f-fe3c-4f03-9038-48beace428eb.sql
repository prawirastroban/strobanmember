CREATE OR REPLACE FUNCTION public.register_push_token_atomic(
  _user_id uuid,
  _token text,
  _platform text,
  _role text,
  _device_type text,
  _last_active timestamptz
)
RETURNS SETOF public.push_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.push_tokens;
  v_device_key text := coalesce(_device_type, 'unknown');
BEGIN
  IF _user_id IS NULL OR length(coalesce(_token, '')) < 5 THEN
    RAISE EXCEPTION 'invalid push token registration';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':' || _platform || ':' || v_device_key, 0));

  UPDATE public.push_tokens
  SET invalidated_at = now(),
      invalid_reason = 'superseded_by_newer_device_token'
  WHERE user_id = _user_id
    AND platform = _platform
    AND coalesce(device_type, 'unknown') = v_device_key
    AND token <> _token
    AND invalidated_at IS NULL;

  INSERT INTO public.push_tokens (
    user_id, token, platform, role, device_type, last_active,
    invalidated_at, invalid_reason
  ) VALUES (
    _user_id, _token, _platform, _role, _device_type,
    coalesce(_last_active, now()), NULL, NULL
  )
  ON CONFLICT (token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    role = EXCLUDED.role,
    device_type = EXCLUDED.device_type,
    last_active = EXCLUDED.last_active,
    updated_at = now(),
    invalidated_at = NULL,
    invalid_reason = NULL
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_token_atomic(uuid, text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_token_atomic(uuid, text, text, text, text, timestamptz) TO service_role;