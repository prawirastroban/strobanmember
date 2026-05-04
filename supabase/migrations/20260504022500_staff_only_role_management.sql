DROP POLICY IF EXISTS "Admins or staff (non-admin) can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins or staff (non-admin) can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins or staff (non-admin) can delete roles" ON public.user_roles;

CREATE POLICY "Staff only can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff only can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff only can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::public.app_role));
