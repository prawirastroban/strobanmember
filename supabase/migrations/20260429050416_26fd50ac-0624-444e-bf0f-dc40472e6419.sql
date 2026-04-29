CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  hours text NOT NULL DEFAULT '08:00 – 17:00 WIB',
  image_url text,
  directions_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active branches"
  ON public.branches FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff can view all branches"
  ON public.branches FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin_cabang'::app_role));

CREATE POLICY "Staff can insert branches"
  ON public.branches FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update branches"
  ON public.branches FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete branches"
  ON public.branches FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.branches (slug, name, address, phone, whatsapp, hours, directions_url, sort_order)
VALUES
  ('bandung', 'Stroban Bandung', 'Jl. Riau No. 123, Bandung', '+62 22 1234567', '628973700800', '08:00 – 17:00 WIB',
    'https://www.google.com/maps/dir/?api=1&destination=Jl.+Riau+No.+123,+Bandung', 1),
  ('tasikmalaya', 'Stroban Tasikmalaya', 'Jl. HZ Mustofa No. 45, Tasikmalaya', '+62 265 123456', '628973700800', '08:00 – 17:00 WIB',
    'https://www.google.com/maps/dir/?api=1&destination=Jl.+HZ+Mustofa+No.+45,+Tasikmalaya', 2),
  ('cirebon', 'Stroban Cirebon', 'Jl. Siliwangi No. 78, Cirebon', '+62 231 234567', '628973700800', '08:00 – 17:00 WIB',
    'https://www.google.com/maps/dir/?api=1&destination=Jl.+Siliwangi+No.+78,+Cirebon', 3),
  ('yogyakarta', 'Stroban Yogyakarta', 'Jl. Malioboro No. 56, Yogyakarta', '+62 274 123456', '628973700800', '08:00 – 17:00 WIB',
    'https://www.google.com/maps/dir/?api=1&destination=Jl.+Malioboro+No.+56,+Yogyakarta', 4)
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_branches_active_sort ON public.branches(is_active, sort_order);