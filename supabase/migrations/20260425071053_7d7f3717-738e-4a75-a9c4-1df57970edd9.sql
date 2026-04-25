
CREATE TABLE public.vehicle_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  customer_name TEXT NULL,
  customer_phone TEXT NULL,
  vehicle_brand TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  vehicle_transmission TEXT NULL,
  vehicle_mileage INTEGER NULL,
  vehicle_plate TEXT NULL,
  complaint TEXT NOT NULL,
  ai_response TEXT NULL,
  recommended_service_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  staff_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_complaints_status ON public.vehicle_complaints(status);
CREATE INDEX idx_vehicle_complaints_user ON public.vehicle_complaints(user_id);
CREATE INDEX idx_vehicle_complaints_created ON public.vehicle_complaints(created_at DESC);

ALTER TABLE public.vehicle_complaints ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. guests) can insert a complaint
CREATE POLICY "Anyone can submit a complaint"
ON public.vehicle_complaints
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- if user_id provided, must match auth.uid; else (guest) it must be NULL
  (user_id IS NULL) OR (auth.uid() = user_id)
);

-- Users can view their own
CREATE POLICY "Users can view own complaints"
ON public.vehicle_complaints
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Staff can view all
CREATE POLICY "Staff can view all complaints"
ON public.vehicle_complaints
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Staff can update
CREATE POLICY "Staff can update complaints"
ON public.vehicle_complaints
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Staff can delete
CREATE POLICY "Staff can delete complaints"
ON public.vehicle_complaints
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER trg_vehicle_complaints_updated
BEFORE UPDATE ON public.vehicle_complaints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
