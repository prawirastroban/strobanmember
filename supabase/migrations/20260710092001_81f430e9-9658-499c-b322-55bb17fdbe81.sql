
-- RPC: customer_approve_spk — allows an authenticated customer to approve their
-- own SPK (originated from an app booking). Bundles: save signature, flip
-- status awaiting_customer_approval -> qc_pending, log event.
CREATE OR REPLACE FUNCTION public.customer_approve_spk(
  _spk_id uuid,
  _signature text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.spk_orders%ROWTYPE;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _signature IS NULL OR length(_signature) < 32 THEN RAISE EXCEPTION 'signature_required'; END IF;

  SELECT * INTO v_row FROM public.spk_orders WHERE id = _spk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'spk_not_found'; END IF;
  IF v_row.booking_id IS NULL THEN RAISE EXCEPTION 'not_app_booking'; END IF;

  SELECT b.user_id INTO v_owner FROM public.bookings b WHERE b.id = v_row.booking_id;
  IF v_owner IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'not_spk_owner'; END IF;

  IF v_row.status <> 'awaiting_customer_approval'::spk_status THEN
    -- idempotent: if already advanced, still store signature but don't error
    UPDATE public.spk_orders
       SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
             'signature_customer', _signature,
             'signature_customer_source', 'app',
             'signature_customer_signed_at', now()
           )
     WHERE id = _spk_id;
    RETURN;
  END IF;

  UPDATE public.spk_orders
     SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
           'signature_customer', _signature,
           'signature_customer_source', 'app',
           'signature_customer_signed_at', now()
         ),
         status = 'qc_pending'::spk_status
   WHERE id = _spk_id;

  INSERT INTO public.spk_events (spk_id, event_type, payload, actor_role, actor_user_id)
  VALUES (
    _spk_id,
    'status_changed',
    jsonb_build_object(
      'from', 'awaiting_customer_approval',
      'to', 'qc_pending',
      'reason', 'customer_approved_via_app',
      'workflow_code', 'spk_default'
    ),
    'system'::spk_workflow_actor,
    v_uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_approve_spk(uuid, text) TO authenticated;

-- RPC: customer_request_spk_revision — customer asks the shop to revise the SPK
CREATE OR REPLACE FUNCTION public.customer_request_spk_revision(
  _spk_id uuid,
  _note text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.spk_orders%ROWTYPE;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _note IS NULL OR length(btrim(_note)) = 0 THEN RAISE EXCEPTION 'note_required'; END IF;

  SELECT * INTO v_row FROM public.spk_orders WHERE id = _spk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'spk_not_found'; END IF;
  IF v_row.booking_id IS NULL THEN RAISE EXCEPTION 'not_app_booking'; END IF;

  SELECT b.user_id INTO v_owner FROM public.bookings b WHERE b.id = v_row.booking_id;
  IF v_owner IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'not_spk_owner'; END IF;

  UPDATE public.spk_orders
     SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
           'customer_revision_note', _note,
           'customer_revision_requested_at', now()
         )
   WHERE id = _spk_id;

  INSERT INTO public.spk_events (spk_id, event_type, payload, actor_role, actor_user_id)
  VALUES (
    _spk_id,
    'note_added',
    jsonb_build_object('kind', 'customer_revision_request', 'note', _note),
    'system'::spk_workflow_actor,
    v_uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_request_spk_revision(uuid, text) TO authenticated;
