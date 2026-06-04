CREATE POLICY "Staff and admins can create vehicles for any user"
ON public.vehicles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'admin_cabang'::app_role)
);

CREATE POLICY "Staff and admins can update any vehicle"
ON public.vehicles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'admin_cabang'::app_role)
);

DROP POLICY IF EXISTS "Staff can view all vehicles" ON public.vehicles;
CREATE POLICY "Staff and admins can view all vehicles"
ON public.vehicles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'admin_cabang'::app_role)
);