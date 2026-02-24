
-- Create services table for the service catalog
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'maintenance',
  price NUMERIC NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 60,
  rating NUMERIC NOT NULL DEFAULT 5.0,
  reviews INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  icon TEXT NOT NULL DEFAULT 'Wrench',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  booking_service_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Everyone can view active services (public catalog)
CREATE POLICY "Anyone can view active services"
ON public.services FOR SELECT
USING (is_active = true);

-- Staff/Admin can view all services (including inactive)
CREATE POLICY "Staff can view all services"
ON public.services FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Staff/Admin can manage services
CREATE POLICY "Staff can insert services"
ON public.services FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update services"
ON public.services FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can delete services"
ON public.services FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Trigger for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with existing hardcoded services
INSERT INTO public.services (name, description, category, price, duration, rating, reviews, badge, icon, is_popular, booking_service_id, sort_order) VALUES
('Oil Change', 'Premium engine oil replacement with filter check', 'maintenance', 150000, 60, 4.9, 312, 'Best Seller', 'Droplets', true, 'oil-change', 1),
('Full Service', 'Comprehensive vehicle service and inspection', 'maintenance', 450000, 180, 4.8, 187, 'Recommended', 'Wrench', true, 'full-service', 2),
('Brake Inspection', 'Complete brake system check and adjustment', 'maintenance', 100000, 90, 4.7, 98, NULL, 'ShieldCheck', false, 'brake-inspection', 3),
('Tire Rotation', 'Professional tire rotation for even wear', 'tires', 80000, 45, 4.8, 224, NULL, 'RotateCcw', true, 'tire-rotation', 4),
('Tire Balancing', 'Wheel balancing and alignment check for a smooth ride', 'tires', 60000, 30, 4.6, 145, NULL, 'Car', false, 'full-service', 5),
('Battery Check', 'Comprehensive battery health check and terminal cleaning', 'electrical', 50000, 30, 4.7, 76, 'Free Check', 'Zap', false, 'full-service', 6),
('AC Service', 'Full AC system service including filter and refrigerant check', 'ac', 250000, 120, 4.9, 203, 'Popular', 'Wind', true, 'full-service', 7),
('AC Recharge', 'Refrigerant top-up with leak inspection for optimal cooling', 'ac', 180000, 60, 4.8, 134, NULL, 'ThermometerSun', false, 'full-service', 8);
