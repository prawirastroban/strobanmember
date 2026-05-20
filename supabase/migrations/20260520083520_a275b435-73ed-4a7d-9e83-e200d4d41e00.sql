CREATE POLICY "Admin cabang can view branch proofs"
ON public.manual_payment_proofs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = manual_payment_proofs.booking_id
      AND is_admin_cabang_for(b.branch)
  )
);

CREATE POLICY "Admin cabang can update branch proofs"
ON public.manual_payment_proofs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = manual_payment_proofs.booking_id
      AND is_admin_cabang_for(b.branch)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = manual_payment_proofs.booking_id
      AND is_admin_cabang_for(b.branch)
  )
);