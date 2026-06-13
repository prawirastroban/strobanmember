
-- 1. Default semua profil baru ke verified
ALTER TABLE public.profiles ALTER COLUMN is_verified SET DEFAULT true;

-- 2. Backfill seluruh akun lama menjadi verified
UPDATE public.profiles SET is_verified = true WHERE is_verified = false;

-- 3. Index untuk deteksi duplikat plat nomor (non-unique karena data lama mungkin punya kembar)
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_upper
  ON public.vehicles ((UPPER(license_plate)));

-- 4. Re-write trigger handle_new_user:
--    - selalu verified
--    - simpan acquisition_source (google | email | whatsapp) bila kolom belum terisi
--    - notifikasi sukses untuk semua metode signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_google_signup boolean := false;
  is_phone_signup boolean := false;
  detected_source text := 'direct';
  meta_source text;
BEGIN
  IF NEW.raw_app_meta_data ? 'provider' THEN
    is_google_signup := (NEW.raw_app_meta_data->>'provider' = 'google')
      OR COALESCE((NEW.raw_app_meta_data->'providers') ? 'google', false);
  END IF;

  -- akun phone memakai synthetic email @phone.bengkelstroban.com / @phone.local
  IF NEW.email ILIKE '%@phone.bengkelstroban.com' OR NEW.email ILIKE '%@phone.local' THEN
    is_phone_signup := true;
  END IF;

  meta_source := NULLIF(NEW.raw_user_meta_data->>'registration_source', '');

  detected_source := COALESCE(
    meta_source,
    CASE
      WHEN is_google_signup THEN 'google'
      WHEN is_phone_signup  THEN 'whatsapp'
      ELSE 'email'
    END
  );

  INSERT INTO public.profiles (id, full_name, avatar_url, phone, is_verified, acquisition_source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NEW.phone,
    true,
    detected_source
  )
  ON CONFLICT (id) DO UPDATE
    SET is_verified        = true,
        avatar_url         = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        full_name          = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        phone              = COALESCE(public.profiles.phone, EXCLUDED.phone),
        acquisition_source = COALESCE(public.profiles.acquisition_source, EXCLUDED.acquisition_source);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer'::app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    NEW.id,
    'Akun Aktif',
    'Pendaftaran berhasil. Akun Anda sudah aktif dan siap digunakan untuk booking servis.',
    'verification',
    jsonb_build_object(
      'source', detected_source,
      'redirect_to', '/'
    )
  );

  RETURN NEW;
END;
$$;
