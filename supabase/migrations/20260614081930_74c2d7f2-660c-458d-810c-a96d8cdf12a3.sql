CREATE TABLE public.account_claim_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid,
  booking_public_token text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz
);

GRANT ALL ON public.account_claim_tokens TO service_role;

ALTER TABLE public.account_claim_tokens ENABLE ROW LEVEL SECURITY;

-- No client policies: only the edge function (service_role) reads/writes this table.

CREATE INDEX IF NOT EXISTS idx_account_claim_tokens_user ON public.account_claim_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_account_claim_tokens_booking ON public.account_claim_tokens(booking_id);