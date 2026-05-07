CREATE OR REPLACE FUNCTION public.enforce_payment_before_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Tidak bisa menyelesaikan booking: pembayaran belum dikonfirmasi (payment_status=%).', NEW.payment_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_before_complete ON public.bookings;
CREATE TRIGGER trg_enforce_payment_before_complete
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payment_before_complete();