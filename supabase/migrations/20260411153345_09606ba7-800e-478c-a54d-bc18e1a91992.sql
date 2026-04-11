
-- Drop overly permissive policies
DROP POLICY IF EXISTS "System can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "System can update invoices" ON public.invoices;

-- Replace with staff-only policies (triggers use SECURITY DEFINER so bypass RLS)
CREATE POLICY "Staff can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update invoices"
ON public.invoices FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
