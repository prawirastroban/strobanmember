CREATE OR REPLACE FUNCTION public.customer_approve_spk(_spk_id uuid, _signature text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.spk_orders%ROWTYPE;
  v_owner uuid;
  v_patch jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO v_row FROM public.spk_orders WHERE id = _spk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'spk_not_found'; END IF;
  IF v_row.booking_id IS NULL THEN RAISE EXCEPTION 'not_app_booking'; END IF;

  SELECT b.user_id INTO v_owner FROM public.bookings b WHERE b.id = v_row.booking_id;
  IF v_owner IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'not_spk_owner'; END IF;

  v_patch := jsonb_build_object(
    'customer_approved', true,
    'customer_approval_source', 'app',
    'customer_approved_at', now()
  );
  IF _signature IS NOT NULL AND length(_signature) >= 32 THEN
    v_patch := v_patch || jsonb_build_object(
      'signature_customer', _signature,
      'signature_customer_source', 'app',
      'signature_customer_signed_at', now()
    );
  END IF;

  IF v_row.status <> 'awaiting_customer_approval'::spk_status THEN
    UPDATE public.spk_orders
       SET data = COALESCE(data, '{}'::jsonb) || v_patch
     WHERE id = _spk_id;
    RETURN;
  END IF;

  UPDATE public.spk_orders
     SET data = COALESCE(data, '{}'::jsonb) || v_patch,
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
$function$;