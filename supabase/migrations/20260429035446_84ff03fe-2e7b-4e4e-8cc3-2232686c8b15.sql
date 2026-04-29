-- Add assigned_branch column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_branch text;

-- Helper: read current user's branch
CREATE OR REPLACE FUNCTION public.get_user_branch()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assigned_branch FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper: is admin_cabang AND assigned to this branch
CREATE OR REPLACE FUNCTION public.is_admin_cabang_for(_branch text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin_cabang'::public.app_role)
    AND _branch IS NOT NULL
    AND public.get_user_branch() = _branch
$$;

-- Bookings
DROP POLICY IF EXISTS "Admin cabang can view branch bookings" ON public.bookings;
CREATE POLICY "Admin cabang can view branch bookings"
  ON public.bookings FOR SELECT
  USING (public.is_admin_cabang_for(branch));

DROP POLICY IF EXISTS "Admin cabang can update branch bookings" ON public.bookings;
CREATE POLICY "Admin cabang can update branch bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_admin_cabang_for(branch));

DROP POLICY IF EXISTS "Admin cabang can insert branch bookings" ON public.bookings;
CREATE POLICY "Admin cabang can insert branch bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (public.is_admin_cabang_for(branch));

-- Tire orders
DROP POLICY IF EXISTS "Admin cabang can view branch tire orders" ON public.tire_orders;
CREATE POLICY "Admin cabang can view branch tire orders"
  ON public.tire_orders FOR SELECT
  USING (public.is_admin_cabang_for(branch));

DROP POLICY IF EXISTS "Admin cabang can update branch tire orders" ON public.tire_orders;
CREATE POLICY "Admin cabang can update branch tire orders"
  ON public.tire_orders FOR UPDATE
  USING (public.is_admin_cabang_for(branch));

-- Payments
DROP POLICY IF EXISTS "Admin cabang can view branch payments" ON public.payments;
CREATE POLICY "Admin cabang can view branch payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND public.is_admin_cabang_for(b.branch)
    )
  );

-- Invoices
DROP POLICY IF EXISTS "Admin cabang can view branch invoices" ON public.invoices;
CREATE POLICY "Admin cabang can view branch invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = invoices.booking_id
        AND public.is_admin_cabang_for(b.branch)
    )
  );

-- Profiles
DROP POLICY IF EXISTS "Admin cabang can view branch customer profiles" ON public.profiles;
CREATE POLICY "Admin cabang can view branch customer profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin_cabang'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.user_id = profiles.id
        AND public.is_admin_cabang_for(b.branch)
    )
  );
