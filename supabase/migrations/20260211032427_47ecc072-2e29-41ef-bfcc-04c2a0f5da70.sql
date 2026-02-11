
-- Allow staff/admins to view all profiles for loyalty management
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
