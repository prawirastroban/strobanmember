CREATE OR REPLACE FUNCTION public.get_push_token_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_priv boolean;
  result jsonb;
BEGIN
  is_priv := public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'staff')
          OR public.has_role(auth.uid(), 'admin_cabang');

  IF is_priv THEN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'unique_users', COUNT(DISTINCT user_id),
      'by_platform', COALESCE(
        (SELECT jsonb_object_agg(platform, c)
         FROM (SELECT platform, COUNT(*) AS c FROM public.push_tokens GROUP BY platform) p),
        '{}'::jsonb
      ),
      'scope', 'global'
    ) INTO result
    FROM public.push_tokens;
  ELSE
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'unique_users', CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END,
      'by_platform', COALESCE(
        (SELECT jsonb_object_agg(platform, c)
         FROM (SELECT platform, COUNT(*) AS c FROM public.push_tokens WHERE user_id = auth.uid() GROUP BY platform) p),
        '{}'::jsonb
      ),
      'scope', 'self'
    ) INTO result
    FROM public.push_tokens WHERE user_id = auth.uid();
  END IF;

  RETURN COALESCE(result, jsonb_build_object('total', 0, 'unique_users', 0, 'by_platform', '{}'::jsonb, 'scope', 'self'));
END;
$$;

REVOKE ALL ON FUNCTION public.get_push_token_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_push_token_stats() TO authenticated;