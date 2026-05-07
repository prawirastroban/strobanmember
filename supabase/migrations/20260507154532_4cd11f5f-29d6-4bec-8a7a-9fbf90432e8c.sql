-- Allow admin_cabang to insert/update payments for bookings in their branch
CREATE POLICY "Admin cabang can insert branch payments"
ON public.payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = payments.booking_id
      AND is_admin_cabang_for(b.branch)
  )
);

CREATE POLICY "Admin cabang can update branch payments"
ON public.payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = payments.booking_id
      AND is_admin_cabang_for(b.branch)
  )
);