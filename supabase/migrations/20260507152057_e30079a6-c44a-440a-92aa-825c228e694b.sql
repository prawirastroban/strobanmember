ALTER TABLE public.manual_payment_qris ADD COLUMN IF NOT EXISTS branch text;
COMMENT ON COLUMN public.manual_payment_qris.branch IS 'Branch slug; NULL = applies to all branches';