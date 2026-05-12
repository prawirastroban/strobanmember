
INSERT INTO storage.buckets (id, name, public)
VALUES ('withdrawal-proofs', 'withdrawal-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can view withdrawal proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'withdrawal-proofs'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

CREATE POLICY "Staff can upload withdrawal proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'withdrawal-proofs'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

CREATE POLICY "Staff can update withdrawal proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'withdrawal-proofs'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

CREATE POLICY "Users can view own withdrawal proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'withdrawal-proofs'
  AND EXISTS (
    SELECT 1 FROM public.referral_withdrawals w
    WHERE w.user_id = auth.uid()
      AND w.proof_url LIKE '%' || storage.objects.name || '%'
  )
);
