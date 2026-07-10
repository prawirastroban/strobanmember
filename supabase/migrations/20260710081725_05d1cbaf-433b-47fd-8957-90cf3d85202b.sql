-- Simplify SPK workflow to 3-hop: Admin -> Customer -> QC -> Closed
DO $$
DECLARE wf uuid;
BEGIN
  SELECT id INTO wf FROM public.spk_workflow_definitions WHERE code = 'spk_default' LIMIT 1;
  IF wf IS NULL THEN
    INSERT INTO public.spk_workflow_definitions (code, name, is_active)
    VALUES ('spk_default', 'SPK Default Workflow (Simple 3-Step)', true)
    RETURNING id INTO wf;
  END IF;

  DELETE FROM public.spk_workflow_transitions WHERE workflow_id = wf;

  -- Step 1: Admin submits to customer for approval
  INSERT INTO public.spk_workflow_transitions (workflow_id, from_status, to_status, actor_role) VALUES
    (wf, 'draft', 'awaiting_customer_approval', 'admin'),
    (wf, 'draft', 'awaiting_customer_approval', 'admin_cabang'),
    (wf, 'draft', 'awaiting_customer_approval', 'owner'),
    (wf, 'draft', 'awaiting_customer_approval', 'reception'),

  -- Step 2: Customer approves -> goes to QC
    (wf, 'awaiting_customer_approval', 'qc_pending', 'admin'),
    (wf, 'awaiting_customer_approval', 'qc_pending', 'admin_cabang'),
    (wf, 'awaiting_customer_approval', 'qc_pending', 'owner'),
    (wf, 'awaiting_customer_approval', 'qc_pending', 'reception'),
    (wf, 'awaiting_customer_approval', 'qc_pending', 'system'),

  -- Step 3: Mechanic/QC closes SPK
    (wf, 'qc_pending', 'closed', 'mechanic'),
    (wf, 'qc_pending', 'closed', 'qc'),
    (wf, 'qc_pending', 'closed', 'admin'),
    (wf, 'qc_pending', 'closed', 'admin_cabang'),
    (wf, 'qc_pending', 'closed', 'owner'),

  -- Rework: QC bounces back to customer
    (wf, 'qc_pending', 'awaiting_customer_approval', 'mechanic'),
    (wf, 'qc_pending', 'awaiting_customer_approval', 'admin'),
    (wf, 'qc_pending', 'awaiting_customer_approval', 'admin_cabang'),
    (wf, 'qc_pending', 'awaiting_customer_approval', 'owner'),

  -- Cancel from any early stage
    (wf, 'draft', 'cancelled', 'admin'),
    (wf, 'draft', 'cancelled', 'admin_cabang'),
    (wf, 'draft', 'cancelled', 'owner'),
    (wf, 'awaiting_customer_approval', 'cancelled', 'admin'),
    (wf, 'awaiting_customer_approval', 'cancelled', 'admin_cabang'),
    (wf, 'awaiting_customer_approval', 'cancelled', 'owner');
END $$;

-- Update default approval matrix to reflect simplified flow
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('spk.approval_matrix', jsonb_build_object(
  'qc_required', true,
  'manager_approval', false,
  'final_approval', true
), now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();