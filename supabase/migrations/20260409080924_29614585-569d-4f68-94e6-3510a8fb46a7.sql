
-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_activity_logs_type ON public.activity_logs (type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs (user_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view all activity logs"
ON public.activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- System trigger function can also insert (SECURITY DEFINER triggers bypass RLS)

-- Trigger: bookings
CREATE OR REPLACE FUNCTION public.log_booking_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('booking', 'Booking created: ' || NEW.service_name || ' for ' || NEW.customer_name, NEW.user_id,
      jsonb_build_object('booking_id', NEW.id, 'status', NEW.status, 'service_name', NEW.service_name));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('booking', 'Booking ' || NEW.status || ': ' || NEW.service_name || ' for ' || NEW.customer_name, NEW.user_id,
      jsonb_build_object('booking_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_booking_activity
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_activity();

-- Trigger: tires (inventory)
CREATE OR REPLACE FUNCTION public.log_inventory_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('inventory', 'Tire added: ' || NEW.brand || ' ' || NEW.type || ' ' || NEW.size, NULL,
      jsonb_build_object('tire_id', NEW.id, 'brand', NEW.brand));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('inventory', 'Tire updated: ' || NEW.brand || ' ' || NEW.type || ' ' || NEW.size, NULL,
      jsonb_build_object('tire_id', NEW.id, 'brand', NEW.brand));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('inventory', 'Tire removed: ' || OLD.brand || ' ' || OLD.type || ' ' || OLD.size, NULL,
      jsonb_build_object('tire_id', OLD.id, 'brand', OLD.brand));
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_inventory_activity
AFTER INSERT OR UPDATE OR DELETE ON public.tires
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_activity();

-- Trigger: vehicles
CREATE OR REPLACE FUNCTION public.log_vehicle_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_logs (type, description, user_id, metadata)
  VALUES ('vehicle', 'Vehicle registered: ' || NEW.brand || ' ' || NEW.model || ' (' || NEW.license_plate || ')', NEW.user_id,
    jsonb_build_object('vehicle_id', NEW.id, 'brand', NEW.brand, 'model', NEW.model));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_vehicle_activity
AFTER INSERT ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.log_vehicle_activity();

-- Trigger: profiles (customer registered)
CREATE OR REPLACE FUNCTION public.log_customer_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_logs (type, description, user_id, metadata)
  VALUES ('customer', 'New customer registered: ' || COALESCE(NEW.full_name, 'Unknown'), NEW.id,
    jsonb_build_object('profile_id', NEW.id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_customer_activity
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_customer_activity();

-- Trigger: rewards (promos)
CREATE OR REPLACE FUNCTION public.log_marketing_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('marketing', 'Promo created: ' || NEW.name, NULL,
      jsonb_build_object('reward_id', NEW.id, 'name', NEW.name, 'is_active', NEW.is_active));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      INSERT INTO public.activity_logs (type, description, user_id, metadata)
      VALUES ('marketing', 'Promo deactivated: ' || NEW.name, NULL,
        jsonb_build_object('reward_id', NEW.id, 'name', NEW.name));
    ELSE
      INSERT INTO public.activity_logs (type, description, user_id, metadata)
      VALUES ('marketing', 'Promo updated: ' || NEW.name, NULL,
        jsonb_build_object('reward_id', NEW.id, 'name', NEW.name, 'is_active', NEW.is_active));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_marketing_activity
AFTER INSERT OR UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.log_marketing_activity();
