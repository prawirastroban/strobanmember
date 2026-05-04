CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_google_signup boolean := false;
BEGIN
  IF NEW.raw_app_meta_data ? 'provider' THEN
    is_google_signup := (NEW.raw_app_meta_data->>'provider' = 'google')
      OR COALESCE((NEW.raw_app_meta_data->'providers') ? 'google', false);
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, phone, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NEW.phone,
    is_google_signup
  )
  ON CONFLICT (id) DO UPDATE
    SET is_verified = public.profiles.is_verified OR EXCLUDED.is_verified,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer'::app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    NEW.id,
    CASE
      WHEN is_google_signup THEN 'Akun Terverifikasi'
      ELSE 'Verifikasi Sedang Ditinjau'
    END,
    CASE
      WHEN is_google_signup THEN 'Pendaftaran dengan Google berhasil. Akun Anda sudah aktif dan siap digunakan.'
      ELSE 'Pendaftaran berhasil. Verifikasi akun Anda sedang ditinjau admin. Anda akan mendapat notifikasi setelah disetujui.'
    END,
    CASE
      WHEN is_google_signup THEN 'verification'
      ELSE 'info'
    END,
    jsonb_build_object(
      'source', CASE WHEN is_google_signup THEN 'google_signup' ELSE 'manual_signup' END,
      'redirect_to', '/'
    )
  );

  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET is_verified = true,
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND p.is_verified = false
  AND (
    (u.raw_app_meta_data->>'provider') = 'google'
    OR COALESCE((u.raw_app_meta_data->'providers') ? 'google', false)
  );

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'customer'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = u.id
);