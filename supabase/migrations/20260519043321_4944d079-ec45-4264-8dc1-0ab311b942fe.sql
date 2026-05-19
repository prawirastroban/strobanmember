
CREATE TABLE IF NOT EXISTS public.wa_password_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  phone_e164 TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  otp_salt TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reset_token_hash TEXT,
  ip_hash TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_pw_resets_phone_time ON public.wa_password_resets (phone_e164, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_pw_resets_token_hash ON public.wa_password_resets (reset_token_hash) WHERE reset_token_hash IS NOT NULL;

ALTER TABLE public.wa_password_resets ENABLE ROW LEVEL SECURITY;

-- Deny-all from client; service role bypasses RLS.
CREATE POLICY "Deny all client access" ON public.wa_password_resets
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
