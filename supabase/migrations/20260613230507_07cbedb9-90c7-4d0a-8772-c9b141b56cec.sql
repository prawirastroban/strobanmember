
-- A. Public booking tracking token
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS public_track_token text;
UPDATE public.bookings SET public_track_token = replace(gen_random_uuid()::text,'-','') WHERE public_track_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_public_track_token_key ON public.bookings(public_track_token);

CREATE OR REPLACE FUNCTION public.set_booking_track_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_track_token IS NULL OR length(NEW.public_track_token) = 0 THEN
    NEW.public_track_token := replace(gen_random_uuid()::text,'-','');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_track_token ON public.bookings;
CREATE TRIGGER trg_set_booking_track_token
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_booking_track_token();

-- Public RPC: minimal safe fields
CREATE OR REPLACE FUNCTION public.get_public_booking_by_token(_token text)
RETURNS TABLE (
  id uuid,
  status text,
  service_status text,
  payment_status text,
  service_name text,
  service_type text,
  booking_date date,
  booking_time text,
  branch text,
  car_plate_masked text,
  customer_first_name text,
  pickup_status text,
  service_location text,
  queue_estimated_start timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.status,
    b.service_status,
    b.payment_status,
    b.service_name,
    b.service_type,
    b.booking_date,
    b.booking_time,
    b.branch,
    CASE
      WHEN b.car_plate_number IS NULL OR length(b.car_plate_number) <= 3 THEN b.car_plate_number
      ELSE substr(b.car_plate_number,1,2) || repeat('•', greatest(length(b.car_plate_number)-4,1)) || right(b.car_plate_number,2)
    END AS car_plate_masked,
    split_part(coalesce(b.customer_name,''), ' ', 1) AS customer_first_name,
    b.pickup_status,
    b.service_location,
    b.queue_estimated_start,
    b.created_at,
    b.updated_at
  FROM public.bookings b
  WHERE b.public_track_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_by_token(text) TO anon, authenticated;

-- B. Phone OTP codes (WA login)
CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otp_codes_phone_idx ON public.phone_otp_codes(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS phone_otp_codes_expires_idx ON public.phone_otp_codes(expires_at);

GRANT ALL ON public.phone_otp_codes TO service_role;
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge functions) may access; anon/authenticated are blocked by RLS.

-- Add acquisition_source enum value usage already free-text (no enum). No further change.
