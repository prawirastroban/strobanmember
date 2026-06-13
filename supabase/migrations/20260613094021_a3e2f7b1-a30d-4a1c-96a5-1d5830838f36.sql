CREATE OR REPLACE FUNCTION public.notify_staff_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_record RECORD;
  v_action TEXT;
  v_body TEXT;
  v_meta jsonb;
  v_email TEXT;
BEGIN
  v_action := '/dashboard/customers/' || NEW.id::text;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NOT NULL AND v_email LIKE '%@phone.bengkelstroban.com' THEN
    v_email := NULL;
  END IF;
  IF v_email IS NOT NULL AND v_email LIKE '%@phone.local' THEN
    v_email := NULL;
  END IF;

  v_body := COALESCE(NEW.full_name, 'Pengguna baru') ||
            CASE WHEN NEW.phone IS NOT NULL AND NEW.phone <> '' THEN E'\n' || NEW.phone ELSE '' END ||
            CASE WHEN v_email IS NOT NULL AND v_email <> '' THEN E'\n' || v_email ELSE '' END;

  v_meta := jsonb_build_object(
    'group_key', 'customer',
    'registered_user_id', NEW.id,
    'reference_id', NEW.id,
    'redirect_to', v_action
  );

  FOR staff_record IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff','admin_cabang')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, priority, category, metadata, action_url)
    VALUES (staff_record.user_id, 'Customer Baru', v_body, 'new_registration', 'medium', 'customer', v_meta, v_action);
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_staff_new_registration failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;