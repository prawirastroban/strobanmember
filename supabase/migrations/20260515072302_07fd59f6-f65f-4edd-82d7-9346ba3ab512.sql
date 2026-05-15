-- 1) Kolom baru di bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_location text NOT NULL DEFAULT 'workshop',
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS pickup_distance_km numeric,
  ADD COLUMN IF NOT EXISTS pickup_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_return boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_return_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS pickup_driver_id uuid,
  ADD COLUMN IF NOT EXISTS pickup_driver_name text,
  ADD COLUMN IF NOT EXISTS pickup_odometer_start integer,
  ADD COLUMN IF NOT EXISTS pickup_odometer_end integer,
  ADD COLUMN IF NOT EXISTS pickup_handover_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pickup_notes text;

-- Validasi enum lewat trigger (hindari CHECK immutable issue)
CREATE OR REPLACE FUNCTION public.validate_booking_pickup_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.service_location NOT IN ('workshop','pickup') THEN
    RAISE EXCEPTION 'service_location harus workshop atau pickup';
  END IF;
  IF NEW.pickup_status NOT IN ('idle','dispatched','arrived','car_picked','at_workshop','returning','returned') THEN
    RAISE EXCEPTION 'pickup_status tidak valid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_pickup ON public.bookings;
CREATE TRIGGER trg_validate_booking_pickup
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_pickup_fields();

-- Index bantu untuk filter dashboard
CREATE INDEX IF NOT EXISTS idx_bookings_service_location ON public.bookings(service_location);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_status ON public.bookings(pickup_status) WHERE service_location = 'pickup';

-- 2) Storage bucket privat
INSERT INTO storage.buckets (id, name, public)
VALUES ('pickup-handover', 'pickup-handover', false)
ON CONFLICT (id) DO NOTHING;

-- Policies bucket pickup-handover
DROP POLICY IF EXISTS "Staff manage pickup handover" ON storage.objects;
CREATE POLICY "Staff manage pickup handover"
ON storage.objects FOR ALL
USING (
  bucket_id = 'pickup-handover'
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role))
)
WITH CHECK (
  bucket_id = 'pickup-handover'
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role))
);

DROP POLICY IF EXISTS "Owner view own pickup handover" ON storage.objects;
CREATE POLICY "Owner view own pickup handover"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pickup-handover'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.user_id = auth.uid()
  )
);

-- 3) Seed default app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'pickup_service',
  '{"enabled": true, "max_distance_km": 15, "base_fee": 75000, "return_fee": 50000, "fee_mode": "flat"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;