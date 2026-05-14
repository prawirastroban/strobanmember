
DROP POLICY IF EXISTS "Admin can update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin can insert app_settings" ON public.app_settings;

CREATE POLICY "Staff can update app_settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert app_settings"
ON public.app_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
