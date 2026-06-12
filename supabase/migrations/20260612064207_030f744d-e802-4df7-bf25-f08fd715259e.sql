
-- 1) Dedupe staff notif: gunakan UNION agar user dengan multi-role hanya dapat 1 row.
CREATE OR REPLACE FUNCTION public.notify_staff_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_rec RECORD;
  v_branch TEXT;
  v_vehicle TEXT;
  v_body TEXT;
  v_meta jsonb;
  v_action TEXT;
BEGIN
  v_branch := COALESCE(NULLIF(NEW.branch, ''), 'Cabang belum dipilih');
  v_vehicle := COALESCE(NULLIF(trim(coalesce(NEW.car_type,'') || ' ' || coalesce(NEW.car_plate_number,'')), ''), 'Kendaraan');
  v_action  := '/dashboard/bookings/' || NEW.id::text;

  v_body :=
    'Cabang ' || initcap(v_branch) || E'\n' ||
    v_vehicle || E'\n' ||
    COALESCE(NEW.service_name,'Layanan') || E'\n' ||
    COALESCE(NEW.customer_name,'Pelanggan');

  v_meta := jsonb_build_object(
    'group_key',     'booking:' || NEW.id::text,
    'reference_id',  NEW.id,
    'booking_id',    NEW.id,
    'customer_name', NEW.customer_name,
    'customer_user_id', NEW.user_id,
    'service_name',  NEW.service_name,
    'booking_date',  NEW.booking_date,
    'booking_time',  NEW.booking_time,
    'branch',        NEW.branch,
    'vehicle',       v_vehicle,
    'redirect_to',   v_action
  );

  -- Satu pass saja: gabungkan admin/staff + admin_cabang yang cocok branch.
  FOR staff_rec IN
    SELECT user_id FROM (
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role IN ('admin','staff')
      UNION
      SELECT ur.user_id
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.role = 'admin_cabang'
        AND NEW.branch IS NOT NULL AND NEW.branch <> ''
        AND p.assigned_branch IS NOT NULL
        AND lower(trim(p.assigned_branch)) = lower(trim(NEW.branch))
    ) s
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, priority, category, metadata, action_url)
    VALUES (staff_rec.user_id, 'Booking Baru', v_body, 'booking', 'high', 'booking', v_meta, v_action);
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_staff_on_new_booking failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- 2) Tambahkan UPDATE policy untuk push_tokens supaya upsert milik sendiri tidak gagal RLS.
DROP POLICY IF EXISTS "Users can update own tokens" ON public.push_tokens;
CREATE POLICY "Users can update own tokens"
  ON public.push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
