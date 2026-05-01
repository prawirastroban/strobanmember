ALTER TABLE public.promos
  ADD COLUMN IF NOT EXISTS applicable_service_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS applicable_service_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_promos_applicable_service_ids
  ON public.promos USING GIN (applicable_service_ids);

CREATE INDEX IF NOT EXISTS idx_rewards_applicable_service_ids
  ON public.rewards USING GIN (applicable_service_ids);