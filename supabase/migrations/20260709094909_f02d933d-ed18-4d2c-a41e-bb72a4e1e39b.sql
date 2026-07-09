
DO $$
DECLARE
  wf_id uuid;
  actor spk_workflow_actor;
  operational_actors spk_workflow_actor[] := ARRAY['owner','admin','admin_cabang']::spk_workflow_actor[];
BEGIN
  INSERT INTO public.spk_workflow_definitions (code, name, description, is_active)
  VALUES (
    'spk_default',
    'Standard SPK Workflow',
    'Default workshop flow: Intake → Approval → Assignment → Inspection → QC → Invoice → Payment → Closed',
    true
  )
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO wf_id FROM public.spk_workflow_definitions WHERE code = 'spk_default';

  -- Reception intake + cancel
  INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role, display_order)
  VALUES
    (wf_id, 'draft'::spk_status, 'awaiting_customer_approval'::spk_status, 'reception'::spk_workflow_actor, 10),
    (wf_id, 'awaiting_customer_approval'::spk_status, 'approved'::spk_status, 'reception'::spk_workflow_actor, 20),
    (wf_id, 'approved'::spk_status, 'assigned'::spk_status, 'reception'::spk_workflow_actor, 30),
    (wf_id, 'draft'::spk_status, 'cancelled'::spk_status, 'reception'::spk_workflow_actor, 90),
    (wf_id, 'awaiting_customer_approval'::spk_status, 'cancelled'::spk_status, 'reception'::spk_workflow_actor, 90)
  ON CONFLICT DO NOTHING;

  -- Mechanic
  INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role, display_order)
  VALUES
    (wf_id, 'assigned'::spk_status, 'in_progress'::spk_status, 'mechanic'::spk_workflow_actor, 10),
    (wf_id, 'in_progress'::spk_status, 'work_completed'::spk_status, 'mechanic'::spk_workflow_actor, 20),
    (wf_id, 'work_completed'::spk_status, 'qc_pending'::spk_status, 'mechanic'::spk_workflow_actor, 30),
    (wf_id, 'qc_failed'::spk_status, 'in_progress'::spk_status, 'mechanic'::spk_workflow_actor, 40)
  ON CONFLICT DO NOTHING;

  -- QC
  INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role, display_order)
  VALUES
    (wf_id, 'qc_pending'::spk_status, 'qc_passed'::spk_status, 'qc'::spk_workflow_actor, 10),
    (wf_id, 'qc_pending'::spk_status, 'qc_failed'::spk_status, 'qc'::spk_workflow_actor, 20),
    (wf_id, 'work_completed'::spk_status, 'qc_pending'::spk_status, 'qc'::spk_workflow_actor, 5)
  ON CONFLICT DO NOTHING;

  -- Cashier
  INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role, display_order)
  VALUES
    (wf_id, 'qc_passed'::spk_status, 'invoice_issued'::spk_status, 'cashier'::spk_workflow_actor, 10),
    (wf_id, 'invoice_issued'::spk_status, 'invoice_paid'::spk_status, 'cashier'::spk_workflow_actor, 20)
  ON CONFLICT DO NOTHING;

  -- Owner/Admin/Admin Cabang: full override across every hop above
  FOREACH actor IN ARRAY operational_actors LOOP
    INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role, display_order)
    SELECT wf_id, from_status, to_status, actor, display_order
    FROM public.spk_workflow_transitions
    WHERE workflow_id = wf_id AND actor_role IN ('reception','mechanic','qc','cashier')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role, display_order)
    VALUES
      (wf_id, 'invoice_paid'::spk_status, 'closed'::spk_status, actor, 10),
      (wf_id, 'qc_passed'::spk_status, 'closed'::spk_status, actor, 20)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
