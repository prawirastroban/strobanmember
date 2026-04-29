-- Update handle_new_user trigger so Google signups are auto-verified
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_google_signup BOOLEAN := false;
BEGIN
  -- Detect Google provider from raw_app_meta_data
  IF NEW.raw_app_meta_data ? 'provider' THEN
    is_google_signup := (NEW.raw_app_meta_data->>'provider' = 'google')
      OR (NEW.raw_app_meta_data->'providers' ? 'google');
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
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  -- Default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: mark existing Google users as verified
UPDATE public.profiles p
SET is_verified = true
FROM auth.users u
WHERE p.id = u.id
  AND p.is_verified = false
  AND (
    (u.raw_app_meta_data->>'provider') = 'google'
    OR (u.raw_app_meta_data->'providers') ? 'google'
  );
