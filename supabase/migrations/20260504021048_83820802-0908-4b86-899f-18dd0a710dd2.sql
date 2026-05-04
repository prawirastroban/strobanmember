-- Replace admin-only write policies with admin-OR-staff (but staff cannot touch admin role)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins or staff (non-admin) can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'staff'::app_role) AND role <> 'admin'::app_role)
);

CREATE POLICY "Admins or staff (non-admin) can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'staff'::app_role) AND role <> 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'staff'::app_role) AND role <> 'admin'::app_role)
);

CREATE POLICY "Admins or staff (non-admin) can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'staff'::app_role) AND role <> 'admin'::app_role)
);