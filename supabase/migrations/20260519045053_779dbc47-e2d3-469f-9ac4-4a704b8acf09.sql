
ALTER TABLE public.wa_password_resets
  ADD COLUMN IF NOT EXISTS triggered_by_admin uuid;

CREATE INDEX IF NOT EXISTS idx_wa_password_resets_triggered_by_admin
  ON public.wa_password_resets(triggered_by_admin);
