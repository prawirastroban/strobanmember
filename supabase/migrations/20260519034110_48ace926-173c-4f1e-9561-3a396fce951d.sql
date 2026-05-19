-- Change bookings.payment_method vocabulary to cash/transfer/qris
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
UPDATE public.bookings SET payment_method = 'cash' WHERE payment_method = 'onsite';
UPDATE public.bookings SET payment_method = NULL WHERE payment_method = 'online';
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash','transfer','qris'));