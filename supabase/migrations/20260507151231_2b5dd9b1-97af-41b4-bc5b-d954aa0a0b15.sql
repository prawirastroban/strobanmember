
-- Bank accounts
CREATE TABLE public.manual_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  branch_label text,
  logo_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bank accounts" ON public.manual_payment_accounts
  FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can view all bank accounts" ON public.manual_payment_accounts
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert bank accounts" ON public.manual_payment_accounts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update bank accounts" ON public.manual_payment_accounts
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete bank accounts" ON public.manual_payment_accounts
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER trg_manual_payment_accounts_updated
  BEFORE UPDATE ON public.manual_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QRIS entries
CREATE TABLE public.manual_payment_qris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  qris_image_url text NOT NULL,
  merchant_name text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_payment_qris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active qris" ON public.manual_payment_qris
  FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can view all qris" ON public.manual_payment_qris
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can insert qris" ON public.manual_payment_qris
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update qris" ON public.manual_payment_qris
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete qris" ON public.manual_payment_qris
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER trg_manual_payment_qris_updated
  BEFORE UPDATE ON public.manual_payment_qris
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proofs
CREATE TABLE public.manual_payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  payment_id uuid,
  user_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('transfer','qris')),
  bank_account_id uuid REFERENCES public.manual_payment_accounts(id) ON DELETE SET NULL,
  qris_id uuid REFERENCES public.manual_payment_qris(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  sender_bank text,
  transfer_amount numeric NOT NULL,
  transfer_date date NOT NULL,
  proof_url text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mpp_booking ON public.manual_payment_proofs(booking_id);
CREATE INDEX idx_mpp_user ON public.manual_payment_proofs(user_id);
CREATE INDEX idx_mpp_status ON public.manual_payment_proofs(status);

ALTER TABLE public.manual_payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own proofs" ON public.manual_payment_proofs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own proofs" ON public.manual_payment_proofs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff view all proofs" ON public.manual_payment_proofs
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff update all proofs" ON public.manual_payment_proofs
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER trg_manual_payment_proofs_updated
  BEFORE UPDATE ON public.manual_payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets (public)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('payment-assets','payment-assets', true),
  ('payment-proofs','payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- payment-assets policies (logos, QRIS images)
CREATE POLICY "Public read payment-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-assets');
CREATE POLICY "Staff manage payment-assets" ON storage.objects
  FOR ALL USING (
    bucket_id = 'payment-assets' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  ) WITH CHECK (
    bucket_id = 'payment-assets' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  );

-- payment-proofs policies (user uploads to own folder)
CREATE POLICY "Public read payment-proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs');
CREATE POLICY "Users upload own proof" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users update own proof" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Staff manage all proofs" ON storage.objects
  FOR ALL USING (
    bucket_id = 'payment-proofs' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  ) WITH CHECK (
    bucket_id = 'payment-proofs' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'staff'))
  );

-- RPC: submit manual payment proof
CREATE OR REPLACE FUNCTION public.submit_manual_payment_proof(
  _booking_id uuid,
  _method text,
  _bank_account_id uuid,
  _qris_id uuid,
  _sender_name text,
  _sender_bank text,
  _transfer_amount numeric,
  _transfer_date date,
  _proof_url text,
  _notes text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_booking RECORD;
  v_payment_id uuid;
  v_proof_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF _method NOT IN ('transfer','qris') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid method');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;
  IF v_booking.user_id <> v_user THEN
    RETURN json_build_object('success', false, 'error', 'Not your booking');
  END IF;

  -- upsert payment
  SELECT id INTO v_payment_id FROM public.payments WHERE booking_id = _booking_id;
  IF v_payment_id IS NULL THEN
    INSERT INTO public.payments (booking_id, user_id, amount, payment_method, payment_status)
    VALUES (_booking_id, v_user, _transfer_amount, _method, 'pending')
    RETURNING id INTO v_payment_id;
  ELSE
    UPDATE public.payments
      SET amount = _transfer_amount,
          payment_method = _method,
          payment_status = 'pending',
          updated_at = now()
      WHERE id = v_payment_id;
  END IF;

  INSERT INTO public.manual_payment_proofs (
    booking_id, payment_id, user_id, method,
    bank_account_id, qris_id, sender_name, sender_bank,
    transfer_amount, transfer_date, proof_url, notes
  ) VALUES (
    _booking_id, v_payment_id, v_user, _method,
    _bank_account_id, _qris_id, _sender_name, _sender_bank,
    _transfer_amount, _transfer_date, _proof_url, _notes
  ) RETURNING id INTO v_proof_id;

  UPDATE public.bookings
    SET payment_status = 'awaiting_confirmation', updated_at = now()
    WHERE id = _booking_id;

  RETURN json_build_object('success', true, 'proof_id', v_proof_id, 'payment_id', v_payment_id);
END;
$$;

-- RPC: approve manual proof
CREATE OR REPLACE FUNCTION public.approve_manual_payment_proof(_proof_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_staff boolean;
  v_proof RECORD;
BEGIN
  SELECT has_role(v_caller,'admin') OR has_role(v_caller,'staff') INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_proof FROM public.manual_payment_proofs WHERE id = _proof_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Proof not found');
  END IF;
  IF v_proof.status = 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'Already approved');
  END IF;

  UPDATE public.manual_payment_proofs
    SET status = 'approved',
        reviewed_by = v_caller,
        reviewed_at = now(),
        reject_reason = NULL,
        updated_at = now()
    WHERE id = _proof_id;

  IF v_proof.payment_id IS NOT NULL THEN
    UPDATE public.payments
      SET payment_status = 'success', updated_at = now()
      WHERE id = v_proof.payment_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (v_proof.user_id, 'Pembayaran Disetujui',
    'Bukti transfer Anda telah diverifikasi & pembayaran berhasil.',
    'payment',
    jsonb_build_object('proof_id', _proof_id, 'booking_id', v_proof.booking_id));

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: reject manual proof
CREATE OR REPLACE FUNCTION public.reject_manual_payment_proof(_proof_id uuid, _reason text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_staff boolean;
  v_proof RECORD;
BEGIN
  SELECT has_role(v_caller,'admin') OR has_role(v_caller,'staff') INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_proof FROM public.manual_payment_proofs WHERE id = _proof_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Proof not found');
  END IF;

  UPDATE public.manual_payment_proofs
    SET status = 'rejected',
        reject_reason = _reason,
        reviewed_by = v_caller,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = _proof_id;

  IF v_proof.payment_id IS NOT NULL THEN
    UPDATE public.payments
      SET payment_status = 'failed', updated_at = now()
      WHERE id = v_proof.payment_id;
  END IF;

  UPDATE public.bookings
    SET payment_status = 'unpaid', updated_at = now()
    WHERE id = v_proof.booking_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (v_proof.user_id, 'Bukti Pembayaran Ditolak',
    'Bukti transfer Anda ditolak. ' || COALESCE('Alasan: ' || _reason, 'Silakan upload ulang.'),
    'payment',
    jsonb_build_object('proof_id', _proof_id, 'booking_id', v_proof.booking_id, 'reason', _reason));

  RETURN json_build_object('success', true);
END;
$$;
