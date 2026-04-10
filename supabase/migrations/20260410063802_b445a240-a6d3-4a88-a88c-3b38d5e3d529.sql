
-- 1. Add is_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

-- 2. Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Staff/admin can view all notifications
CREATE POLICY "Staff can view all notifications"
ON public.notifications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Staff/admin can insert notifications
CREATE POLICY "Staff can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. Function to verify a user (security definer so it bypasses RLS)
CREATE OR REPLACE FUNCTION public.verify_user(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Log activity
  INSERT INTO public.activity_logs (type, description, user_id, metadata)
  VALUES ('customer', 'User verified: ' || COALESCE(v_user_name, 'Unknown'), v_caller_id,
    jsonb_build_object('verified_user_id', _user_id, 'verified_by', v_caller_id));

  RETURN json_build_object('success', true, 'message', 'User verified successfully');
END;
$$;

-- 4. Trigger to notify staff when new user registers
CREATE OR REPLACE FUNCTION public.notify_staff_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  staff_record RECORD;
BEGIN
  -- Insert notification for all staff and admin users
  FOR staff_record IN 
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'staff')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (staff_record.user_id, 'Pendaftaran Baru', 'User baru mendaftar: ' || COALESCE(NEW.full_name, 'Unknown'), 'new_registration',
      jsonb_build_object('registered_user_id', NEW.id));
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_user_registration
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_new_registration();
