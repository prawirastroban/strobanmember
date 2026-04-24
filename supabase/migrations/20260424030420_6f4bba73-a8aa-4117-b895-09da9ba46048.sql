
-- PROMOS TABLE
CREATE TABLE public.promos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed' | 'free_service'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  voucher_prefix TEXT NOT NULL DEFAULT 'PROMO',
  terms TEXT,
  min_purchase NUMERIC NOT NULL DEFAULT 0,
  max_claims INTEGER, -- NULL = unlimited
  claims_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  badge TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promos"
ON public.promos FOR SELECT
USING (
  is_active = true
  AND starts_at <= now()
  AND (ends_at IS NULL OR ends_at >= now())
);

CREATE POLICY "Staff can view all promos"
ON public.promos FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert promos"
ON public.promos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update promos"
ON public.promos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete promos"
ON public.promos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_promos_updated_at
BEFORE UPDATE ON public.promos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROMO CLAIMS TABLE
CREATE TABLE public.promo_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  voucher_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'used' | 'expired'
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE (promo_id, user_id)
);

ALTER TABLE public.promo_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
ON public.promo_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all claims"
ON public.promo_claims FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update claims"
ON public.promo_claims FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE INDEX idx_promo_claims_user ON public.promo_claims(user_id);
CREATE INDEX idx_promo_claims_promo ON public.promo_claims(promo_id);

-- CLAIM FUNCTION (security definer to safely increment + insert)
CREATE OR REPLACE FUNCTION public.claim_promo(_promo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _promo public.promos;
  _existing public.promo_claims;
  _code TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _promo FROM public.promos WHERE id = _promo_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF NOT _promo.is_active
     OR _promo.starts_at > now()
     OR (_promo.ends_at IS NOT NULL AND _promo.ends_at < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive_or_expired');
  END IF;

  IF _promo.max_claims IS NOT NULL AND _promo.claims_count >= _promo.max_claims THEN
    RETURN jsonb_build_object('success', false, 'error', 'fully_claimed');
  END IF;

  SELECT * INTO _existing FROM public.promo_claims
    WHERE promo_id = _promo_id AND user_id = _user_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_claimed',
      'voucher_code', _existing.voucher_code
    );
  END IF;

  _code := COALESCE(NULLIF(_promo.voucher_prefix, ''), 'PROMO')
           || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.promo_claims (promo_id, user_id, voucher_code, expires_at)
  VALUES (_promo_id, _user_id, _code, _promo.ends_at);

  UPDATE public.promos
  SET claims_count = claims_count + 1
  WHERE id = _promo_id;

  RETURN jsonb_build_object(
    'success', true,
    'voucher_code', _code,
    'expires_at', _promo.ends_at
  );
END;
$$;

-- SEED a few sample promos so the page is not empty
INSERT INTO public.promos (title, description, discount_type, discount_value, voucher_prefix, terms, min_purchase, max_claims, ends_at, badge, sort_order)
VALUES
  ('Diskon 20% Ganti Oli', 'Hemat 20% untuk semua paket ganti oli mesin di seluruh cabang Stroban.', 'percentage', 20, 'OLI20',
   E'• Berlaku untuk member terdaftar\n• Min. transaksi Rp 250.000\n• Tidak bisa digabung dengan promo lain\n• Berlaku di seluruh cabang', 250000, 100, now() + interval '30 days', 'HEMAT', 1),
  ('Gratis Spooring + Balancing', 'Setiap pembelian 4 ban baru dapat gratis spooring & balancing.', 'free_service', 0, 'BAN4FREE',
   E'• Pembelian minimal 4 ban baru\n• Berlaku saat instalasi di cabang\n• Booking minimal H-1', 0, 50, now() + interval '60 days', 'POPULER', 2),
  ('Cashback Rp 50.000', 'Cashback Rp 50.000 untuk tune up + servis berkala.', 'fixed', 50000, 'TUNEUP50',
   E'• Berlaku untuk paket tune up + berkala\n• Min. transaksi Rp 500.000\n• Maks. 1x klaim per pengguna', 500000, 200, now() + interval '14 days', 'TERBATAS', 3);
