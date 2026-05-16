-- Allow Owner (role 'staff') to delete bookings; others remain unable to delete via RLS.
CREATE POLICY "Owner staff can delete bookings"
ON public.bookings
FOR DELETE
TO public
USING (has_role(auth.uid(), 'staff'::app_role));

-- Helpful index for filtering bookings by customer phone (used in new FilterBar).
CREATE INDEX IF NOT EXISTS bookings_customer_phone_idx
ON public.bookings (customer_phone);
