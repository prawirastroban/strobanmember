-- 1. Add applicable_categories to rewards and promos
ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS applicable_categories text[] DEFAULT '{}'::text[];

ALTER TABLE public.promos
  ADD COLUMN IF NOT EXISTS applicable_categories text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.rewards.applicable_categories IS 'Empty array = applies to all service categories. Otherwise restricts redemption to listed service.category values (e.g. oil, tire, brake, ac, electrical, body, maintenance).';
COMMENT ON COLUMN public.promos.applicable_categories IS 'Empty array = applies to all service categories. Otherwise restricts to listed service.category values.';

-- 2. Enhanced confirm_manual_payment: for pay_at_workshop, also auto-confirm booking
CREATE OR REPLACE FUNCTION public.confirm_manual_payment(_payment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_admin boolean;
  v_is_staff boolean;
  v_payment RECORD;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT public.has_role(v_caller, 'admin') INTO v_is_admin;
  SELECT public.has_role(v_caller, 'staff') INTO v_is_staff;
  IF NOT (v_is_admin OR v_is_staff) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: only admin or staff can confirm payments');
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.payment_method = 'midtrans' THEN
    RETURN json_build_object('success', false, 'error', 'Midtrans payments are auto-confirmed via webhook');
  END IF;

  IF v_payment.payment_status = 'success' THEN
    RETURN json_build_object('success', false, 'error', 'Payment already confirmed');
  END IF;

  UPDATE public.payments
    SET payment_status = 'success',
        updated_at = now()
    WHERE id = _payment_id;

  -- For pay_at_workshop confirmed by admin: also auto-confirm the booking
  -- (skip the staff "waiting_confirmation" intermediate step)
  IF v_payment.payment_method = 'pay_at_workshop' AND v_is_admin THEN
    UPDATE public.bookings
      SET status = 'confirmed',
          service_status = 'confirmed',
          payment_status = 'paid',
          updated_at = now()
      WHERE id = v_payment.booking_id
        AND status NOT IN ('completed', 'cancelled');
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;