-- Remove Permintaan Koreksi feature (table + RPCs) and update forward-only messages.
DROP FUNCTION IF EXISTS public.apply_status_change_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.reject_status_change_request(uuid, text) CASCADE;
DROP TABLE IF EXISTS public.status_change_requests CASCADE;

-- Refresh forward-only trigger messages (no more "Ajukan koreksi ke Owner").
CREATE OR REPLACE FUNCTION public.enforce_forward_only_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'staff') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('completed','cancelled') THEN
      RAISE EXCEPTION 'FORWARD_ONLY_BOOKING_STATUS: Status sudah final (%). Tidak dapat diubah.', OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status <> 'cancelled'
       AND public.booking_status_ordinal(NEW.status) < public.booking_status_ordinal(OLD.status) THEN
      RAISE EXCEPTION 'FORWARD_ONLY_BOOKING_STATUS: Status tidak dapat dimundurkan dari % ke %.', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF OLD.payment_status = 'paid' AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'FORWARD_ONLY_PAYMENT_STATUS: Pembayaran sudah Lunas dan tidak dapat diubah.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_forward_only_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'staff') THEN
    RETURN NEW;
  END IF;
  IF OLD.payment_status = 'paid' AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'FORWARD_ONLY_PAYMENT_STATUS: Pembayaran sudah Lunas dan tidak dapat diubah.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;