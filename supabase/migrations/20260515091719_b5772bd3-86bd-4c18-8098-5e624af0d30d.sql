
-- 1. IP allowlist table
CREATE TABLE IF NOT EXISTS public.referral_ip_allowlist (
  ip text PRIMARY KEY,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_ip_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view ip allowlist"
  ON public.referral_ip_allowlist FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff insert ip allowlist"
  ON public.referral_ip_allowlist FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff delete ip allowlist"
  ON public.referral_ip_allowlist FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- 2. Unique index on profiles.signup_ip (partial — NULL allowed)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_signup_ip_unique
  ON public.profiles (signup_ip)
  WHERE signup_ip IS NOT NULL;

-- 3. assert_signup_ip_unique helper
CREATE OR REPLACE FUNCTION public.assert_signup_ip_unique(_ip text, _exclude_user uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _ip IS NULL OR length(trim(_ip)) = 0 THEN
    RETURN;
  END IF;

  -- Allowlisted IPs are exempt
  IF EXISTS (SELECT 1 FROM public.referral_ip_allowlist WHERE ip = _ip) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE signup_ip = _ip
      AND (_exclude_user IS NULL OR id <> _exclude_user)
  ) THEN
    RAISE EXCEPTION 'duplicate_signup_ip' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- 4. Trigger on profiles to enforce check on any direct write
CREATE OR REPLACE FUNCTION public.profiles_check_signup_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.signup_ip IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.signup_ip IS DISTINCT FROM OLD.signup_ip) THEN
    PERFORM public.assert_signup_ip_unique(NEW.signup_ip, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_duplicate_ip ON public.profiles;
CREATE TRIGGER profiles_block_duplicate_ip
  BEFORE INSERT OR UPDATE OF signup_ip ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_check_signup_ip();
