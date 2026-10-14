INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role, display_order)
SELECT d.id, v.from_status::spk_status, v.to_status::spk_status, v.actor_role::spk_workflow_actor, v.display_order
FROM public.spk_workflow_definitions d
CROSS JOIN (
  VALUES
    ('qc_pending', 'qc_passed',  'admin_cabang', 10),
    ('qc_pending', 'qc_failed',  'admin_cabang', 11),
    ('qc_failed',  'in_progress','admin_cabang', 12),
    ('qc_pending', 'qc_passed',  'owner',        10),
    ('qc_pending', 'qc_failed',  'owner',        11),
    ('qc_failed',  'in_progress','owner',        12),
    ('qc_pending', 'qc_passed',  'admin',        10),
    ('qc_pending', 'qc_failed',  'admin',        11),
    ('qc_failed',  'in_progress','admin',        12)
) AS v(from_status, to_status, actor_role, display_order)
WHERE d.code = 'spk_default'
  AND NOT EXISTS (
    SELECT 1 FROM public.spk_workflow_transitions t
    WHERE t.workflow_id = d.id
      AND t.from_status = v.from_status::spk_status
      AND t.to_status = v.to_status::spk_status
      AND t.actor_role = v.actor_role::spk_workflow_actor
  );