
CREATE TABLE public.tires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  type text NOT NULL,
  size text NOT NULL,
  description text,
  oem_compatibility text[] DEFAULT '{}',
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tires" ON public.tires
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Staff can view all tires" ON public.tires
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert tires" ON public.tires
  FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update tires" ON public.tires
  FOR UPDATE TO public USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can delete tires" ON public.tires
  FOR DELETE TO public USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER update_tires_updated_at
  BEFORE UPDATE ON public.tires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
