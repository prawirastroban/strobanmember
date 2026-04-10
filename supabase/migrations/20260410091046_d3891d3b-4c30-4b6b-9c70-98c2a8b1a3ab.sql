
CREATE OR REPLACE FUNCTION public.verify_user(_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid;
  v_user_name text;
  v_caller_is_staff boolean;
BEGIN
  v_caller_id := auth.uid();
  
  SELECT has_role(v_caller_id, 'admin') OR has_role(v_caller_id, 'staff')
  INTO v_caller_is_staff;
  
  IF NOT v_caller_is_staff THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get user name
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Update verified status
  UPDATE public.profiles SET is_verified = true WHERE id = _user_id;

  -- Create notification for the user
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, 'Akun Terverifikasi', 'Akun Anda telah diverifikasi. Anda sekarang dapat melakukan booking.', 'verification');

  -- Log activity with email bypass message
  INSERT INTO public.activity_logs (type, description, user_id, metadata)
  VALUES ('customer', 'User verified and email bypass activated: ' || COALESCE(v_user_name, 'Unknown'), v_caller_id,
    jsonb_build_object('verified_user_id', _user_id, 'verified_by', v_caller_id, 'email_bypass', true));

  RETURN json_build_object('success', true, 'message', 'User verified successfully');
END;
$function$;
