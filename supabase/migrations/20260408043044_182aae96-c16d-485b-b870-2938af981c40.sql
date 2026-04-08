
-- Add staff RLS policies for user_roles table
CREATE POLICY "Staff can view all roles"
ON public.user_roles
FOR SELECT
TO public
USING (has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert roles"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update roles"
ON public.user_roles
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete roles"
ON public.user_roles
FOR DELETE
TO public
USING (has_role(auth.uid(), 'staff'::app_role));
