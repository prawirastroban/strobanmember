
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  license_plate TEXT NOT NULL,
  transmission TEXT,
  fuel_type TEXT,
  tire_size TEXT,
  oem_tire TEXT,
  image_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  last_service_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicles"
ON public.vehicles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vehicles"
ON public.vehicles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles"
ON public.vehicles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles"
ON public.vehicles FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all vehicles"
ON public.vehicles FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
