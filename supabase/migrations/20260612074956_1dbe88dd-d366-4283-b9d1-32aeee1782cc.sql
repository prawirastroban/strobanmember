-- Relax signup_ip uniqueness: allow up to 3 accounts per IP (family / office WiFi).
DROP INDEX IF EXISTS public.profiles_signup_ip_unique;

CREATE OR REPLACE FUNCTION public.assert_signup_ip_unique(_ip text, _exclude_user uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _count int;
  _max_per_ip CONSTANT int := 3;
BEGIN
  IF _ip IS NULL OR length(trim(_ip)) = 0 THEN
    RETURN;
  END IF;

  -- Allowlisted IPs are exempt
  IF EXISTS (SELECT 1 FROM public.referral_ip_allowlist WHERE ip = _ip) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO _count
    FROM public.profiles
   WHERE signup_ip = _ip
     AND (_exclude_user IS NULL OR id <> _exclude_user);

  IF _count >= _max_per_ip THEN
    RAISE EXCEPTION 'duplicate_signup_ip' USING ERRCODE = 'P0001';
  END IF;
END;
$function$;