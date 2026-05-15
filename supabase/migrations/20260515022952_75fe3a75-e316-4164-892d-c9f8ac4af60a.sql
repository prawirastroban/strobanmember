-- Seed default loyalty earn rate (Rp per 1 point); preserve admin overrides
INSERT INTO public.app_settings (key, value)
VALUES ('loyalty_earn_rate', jsonb_build_object('rupiah_per_point', 100000))
ON CONFLICT (key) DO NOTHING;

-- Update award function: floor(price/rate); skip if zero
CREATE OR REPLACE FUNCTION public.award_points_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric := 100000;
  v_points integer := 0;
  v_setting jsonb;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT value INTO v_setting FROM public.app_settings WHERE key = 'loyalty_earn_rate';
    IF v_setting IS NOT NULL AND (v_setting->>'rupiah_per_point') IS NOT NULL THEN
      v_rate := GREATEST((v_setting->>'rupiah_per_point')::numeric, 1);
    END IF;

    v_points := FLOOR(COALESCE(NEW.service_price, 0) / v_rate)::int;

    IF v_points <= 0 THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.loyalty_points (user_id, total_points)
    VALUES (NEW.user_id, v_points)
    ON CONFLICT (user_id)
    DO UPDATE SET total_points = public.loyalty_points.total_points + v_points,
                  updated_at = now();

    INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description)
    VALUES (
      NEW.user_id,
      v_points,
      'earned',
      'Servis selesai: ' || COALESCE(NEW.service_name, '-') ||
      ' (Rp ' || to_char(COALESCE(NEW.service_price,0), 'FM999G999G999') ||
      ' / Rp ' || to_char(v_rate, 'FM999G999G999') || ' per poin)'
    );
  END IF;
  RETURN NEW;
END;
$$;