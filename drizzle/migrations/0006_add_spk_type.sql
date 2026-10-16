ALTER TABLE public.spk_orders ADD COLUMN IF NOT EXISTS spk_type text NOT NULL DEFAULT 'service';
ALTER TABLE public.spk_orders ADD CONSTRAINT spk_orders_spk_type_check CHECK (spk_type IN ('service','ban'));
CREATE INDEX IF NOT EXISTS idx_spk_orders_spk_type ON public.spk_orders(spk_type);