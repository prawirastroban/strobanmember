CREATE OR REPLACE FUNCTION public.get_public_spk(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN s.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'spk', jsonb_build_object(
        'id', s.id,
        'spk_number', s.spk_number,
        'status', s.status,
        'priority', s.priority,
        'data', s.data,
        'notes', s.notes,
        'opened_at', s.opened_at,
        'closed_at', s.closed_at,
        'created_at', s.created_at,
        'updated_at', s.updated_at,
        'branch_id', s.branch_id,
        'ai_health_report', s.ai_health_report
      ),
      'branch', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'address', b.address,
        'phone', b.phone
      ) END,
      'timeline', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', t.id,
          'spk_id', t.spk_id,
          'event_type', t.event_type,
          'title', t.title,
          'description', t.description,
          'actor_role', t.actor_role,
          'icon', t.icon,
          'meta', t.meta,
          'occurred_at', t.occurred_at,
          'created_at', t.created_at
        ) ORDER BY t.created_at ASC)
        FROM public.spk_timeline t
        WHERE t.spk_id = s.id
      ), '[]'::jsonb)
    )
  END
  FROM public.spk_orders s
  LEFT JOIN public.branches b ON b.id = s.branch_id
  WHERE s.id = p_id
    AND s.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_spk(uuid) TO anon, authenticated;