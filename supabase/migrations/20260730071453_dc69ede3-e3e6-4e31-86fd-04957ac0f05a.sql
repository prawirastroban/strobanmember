CREATE OR REPLACE FUNCTION public.get_spk_load_names(_user_ids uuid[], _branch_ids uuid[])
RETURNS TABLE(kind text, id uuid, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'admin_cabang'::app_role)
    OR has_role(auth.uid(), 'mekanik'::app_role)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 'user'::text, p.id, COALESCE(NULLIF(TRIM(p.full_name), ''), p.email, 'Tanpa nama')
  FROM public.profiles p
  WHERE p.id = ANY(COALESCE(_user_ids, '{}'::uuid[]));

  RETURN QUERY
  SELECT 'branch'::text, b.id, COALESCE(NULLIF(TRIM(b.name), ''), 'Tanpa nama')
  FROM public.branches b
  WHERE b.id = ANY(COALESCE(_branch_ids, '{}'::uuid[]));
END;
$$;

REVOKE ALL ON FUNCTION public.get_spk_load_names(uuid[], uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_spk_load_names(uuid[], uuid[]) TO authenticated;