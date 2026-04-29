-- Allow Staff (Owner) to manage user_roles, not only DB-admins.
-- Existing policies only allowed users with DB role 'admin' (which we now map to "CS Pusat").
-- In the new mapping, "Staff" is the Owner with full access and must be able to assign roles.

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Staff and admin can view all roles"
  ON public.user_roles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Staff can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Staff can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'staff'::public.app_role));
