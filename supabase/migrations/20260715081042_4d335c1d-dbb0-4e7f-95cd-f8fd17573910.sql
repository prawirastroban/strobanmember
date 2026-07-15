
-- Branch-scoped read/update for mekanik & head_mekanik; block create.

CREATE OR REPLACE FUNCTION public.is_spk_mekanik(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('mekanik','head_mekanik')
  );
$$;

CREATE OR REPLACE FUNCTION public.spk_branch_matches(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.branches b ON b.id = _branch_id
    WHERE p.id = _user_id
      AND p.assigned_branch IS NOT NULL
      AND (
        lower(p.assigned_branch) = lower(b.slug)
        OR lower(p.assigned_branch) = lower(b.name)
      )
  );
$$;

DROP POLICY IF EXISTS "spk_orders mekanik read" ON public.spk_orders;
CREATE POLICY "spk_orders mekanik read"
  ON public.spk_orders FOR SELECT
  USING (public.is_spk_mekanik(auth.uid()) AND public.spk_branch_matches(auth.uid(), branch_id));

DROP POLICY IF EXISTS "spk_orders mekanik update" ON public.spk_orders;
CREATE POLICY "spk_orders mekanik update"
  ON public.spk_orders FOR UPDATE
  USING (public.is_spk_mekanik(auth.uid()) AND public.spk_branch_matches(auth.uid(), branch_id))
  WITH CHECK (public.is_spk_mekanik(auth.uid()) AND public.spk_branch_matches(auth.uid(), branch_id));

-- Insert stays staff-only via existing "spk_orders staff insert" policy (is_spk_staff excludes mekanik).
