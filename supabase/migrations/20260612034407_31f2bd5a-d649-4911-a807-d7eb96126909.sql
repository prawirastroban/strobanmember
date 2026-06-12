
-- Standardize push-notification titles, bodies, and metadata across 7 events.
-- Adds group_key (used by dispatcher for FCM tag / APNS thread-id) and a
-- per-record action_url so taps land on the exact detail page.

-- 1) NEW BOOKING ----------------------------------------------------------
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
    'group_key',     'booking',
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

  FOR staff_rec IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, priority, category, metadata, action_url)
    VALUES (staff_rec.user_id, 'Booking Baru', v_body, 'booking', 'high', 'booking', v_meta, v_action);
  END LOOP;

  IF NEW.branch IS NOT NULL AND NEW.branch <> '' THEN
    FOR staff_rec IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.role = 'admin_cabang'
        AND p.assigned_branch IS NOT NULL
        AND lower(trim(p.assigned_branch)) = lower(trim(NEW.branch))
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, priority, category, metadata, action_url)
      VALUES (staff_rec.user_id, 'Booking Baru', v_body, 'booking', 'high', 'booking', v_meta, v_action);
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_staff_on_new_booking failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;


-- 2) NEW CUSTOMER REGISTRATION -------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_staff_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_record RECORD;
  v_action TEXT;
  v_body TEXT;
  v_meta jsonb;
BEGIN
  v_action := '/dashboard/customers/' || NEW.id::text;
  v_body := COALESCE(NEW.full_name, 'Pengguna baru') ||
            CASE WHEN NEW.phone IS NOT NULL AND NEW.phone <> '' THEN E'\n' || NEW.phone ELSE '' END ||
            CASE WHEN NEW.email IS NOT NULL AND NEW.email <> '' THEN E'\n' || NEW.email ELSE '' END;
  v_meta := jsonb_build_object(
    'group_key', 'customer',
    'registered_user_id', NEW.id,
    'reference_id', NEW.id,
    'redirect_to', v_action
  );

  FOR staff_record IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff','admin_cabang')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, priority, category, metadata, action_url)
    VALUES (staff_record.user_id, 'Customer Baru', v_body, 'new_registration', 'medium', 'customer', v_meta, v_action);
  END LOOP;
  RETURN NEW;
END;
$function$;


-- 3) PAYMENT STATUS ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_service TEXT;
  v_branch TEXT;
  v_priority TEXT;
  v_action TEXT;
  v_meta jsonb;
  v_amount_text TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN
    RETURN NEW;
  END IF;

  SELECT service_name, branch INTO v_service, v_branch FROM public.bookings WHERE id = NEW.booking_id;
  v_amount_text := 'Rp ' || to_char(COALESCE(NEW.amount,0), 'FM999G999G999');
  v_action := '/profile/history-perawatan';
  v_priority := 'high';

  CASE NEW.payment_status
    WHEN 'success', 'paid' THEN v_title := 'Pembayaran Berhasil';
    WHEN 'failed'           THEN v_title := 'Pembayaran Gagal';
    WHEN 'pending'          THEN v_title := 'Pembayaran Pending'; v_priority := 'medium';
    ELSE v_title := 'Update Pembayaran';
  END CASE;

  v_body :=
    v_amount_text || E'\n' ||
    COALESCE(v_service, 'Layanan') ||
    CASE WHEN v_branch IS NOT NULL THEN E'\nCabang ' || initcap(v_branch) ELSE '' END;

  v_meta := jsonb_build_object(
    'group_key',    'payment',
    'reference_id', NEW.id,
    'payment_id',   NEW.id,
    'booking_id',   NEW.booking_id,
    'status',       NEW.payment_status,
    'amount',       NEW.amount,
    'redirect_to',  v_action
  );

  INSERT INTO public.notifications (user_id, title, message, type, priority, category, metadata, action_url)
  VALUES (NEW.user_id, v_title, v_body, 'payment', v_priority, 'finance', v_meta, v_action);
  RETURN NEW;
END;
$function$;


-- 4) PROMO USED ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_promo_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_promo_title text;
  v_staff record;
  v_action_staff text;
  v_action_user  text;
  v_body_staff text;
  v_body_user  text;
BEGIN
  IF NEW.status <> 'used' OR (TG_OP='UPDATE' AND OLD.status='used') THEN RETURN NEW; END IF;
  SELECT title INTO v_promo_title FROM public.promos WHERE id = NEW.promo_id;
  v_action_staff := '/dashboard/marketing/promos/' || NEW.promo_id::text;
  v_action_user  := '/promo';
  v_body_user  := COALESCE('Voucher "' || v_promo_title || '"', 'Voucher promo') || E'\nKode ' || COALESCE(NEW.voucher_code,'-');
  v_body_staff := COALESCE('Voucher "' || v_promo_title || '"', 'Voucher promo') || E'\nKode ' || COALESCE(NEW.voucher_code,'-') || E'\nDigunakan oleh pelanggan';

  PERFORM public.create_notification(
    NEW.user_id, 'Promo Digunakan', v_body_user,
    'promo_used','marketing','medium', v_action_user,
    jsonb_build_object('group_key','promo','reference_id', NEW.promo_id, 'promo_id', NEW.promo_id, 'voucher_code', NEW.voucher_code, 'redirect_to', v_action_user),
    'trigger'
  );
  FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','staff','admin_cabang') LOOP
    PERFORM public.create_notification(
      v_staff.user_id, 'Promo Digunakan', v_body_staff,
      'promo_used','marketing','medium', v_action_staff,
      jsonb_build_object('group_key','promo','reference_id', NEW.promo_id, 'promo_id', NEW.promo_id, 'customer_user_id', NEW.user_id, 'redirect_to', v_action_staff),
      'trigger'
    );
  END LOOP;
  RETURN NEW;
END $function$;


-- 5) REFERRAL COMMISSION -------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_amount_text text;
BEGIN
  IF NEW.status NOT IN ('awarded','available') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  v_amount_text := 'Rp ' || to_char(COALESCE(NEW.amount,0), 'FM999G999G999');
  PERFORM public.create_notification(
    NEW.referrer_id, 'Referral Berhasil',
    'Komisi ' || v_amount_text || E'\nMasuk ke saldo referral Anda',
    'referral_commission','marketing','medium', '/referral',
    jsonb_build_object('group_key','referral','reference_id', NEW.id, 'amount', NEW.amount, 'booking_id', NEW.booking_id, 'redirect_to','/referral'),
    'trigger'
  );
  RETURN NEW;
END $function$;


-- 6) BUG / INTERNAL REPORT ----------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_internal_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff record;
  v_action text;
  v_body text;
BEGIN
  v_action := '/dashboard/feedback/' || NEW.id::text;
  v_body :=
    COALESCE(NEW.title,'(tanpa judul)') || E'\n' ||
    COALESCE('Dari ' || NEW.reporter_name, 'Dari pelapor') ||
    CASE WHEN NEW.category IS NOT NULL THEN E'\nKategori: ' || NEW.category ELSE '' END;
  FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','staff','admin_cabang') LOOP
    PERFORM public.create_notification(
      v_staff.user_id, 'Bug & Masukan', v_body,
      'bug_report','operations','medium', v_action,
      jsonb_build_object('group_key','bug','reference_id', NEW.id, 'category', NEW.category, 'reporter_id', NEW.reporter_id, 'redirect_to', v_action),
      'trigger'
    );
  END LOOP;
  RETURN NEW;
END $function$;


-- 7) STATUS CHANGE / CANCEL REQUEST -------------------------------------
CREATE OR REPLACE FUNCTION public.request_booking_cancellation(_booking_id uuid, _reason text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_owner uuid;
  v_status text;
  v_service text;
  v_branch text;
  v_action text;
  v_body text;
  staff_record RECORD;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT user_id, status, service_name, branch INTO v_owner, v_status, v_service, v_branch
    FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Booking not found'); END IF;
  IF v_owner <> v_caller THEN RETURN json_build_object('success', false, 'error', 'Not your booking'); END IF;
  IF v_status IN ('completed','cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Booking sudah ' || v_status);
  END IF;

  UPDATE public.bookings
    SET cancel_requested = true,
        cancel_reason = COALESCE(NULLIF(btrim(_reason), ''), 'Tidak ada alasan'),
        cancel_requested_at = now(),
        updated_at = now()
    WHERE id = _booking_id;

  v_action := '/dashboard/bookings/' || _booking_id::text;
  v_body :=
    COALESCE(v_service,'Layanan') ||
    CASE WHEN v_branch IS NOT NULL THEN E'\nCabang ' || initcap(v_branch) ELSE '' END ||
    E'\nAlasan: ' || COALESCE(NULLIF(btrim(_reason), ''), 'Tidak ada alasan');

  FOR staff_record IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, priority, category, metadata, action_url)
    VALUES (staff_record.user_id, 'Permintaan Koreksi', v_body, 'cancel_request', 'high', 'booking',
      jsonb_build_object('group_key','status_change','reference_id', _booking_id, 'booking_id', _booking_id, 'reason', _reason, 'redirect_to', v_action),
      v_action);
  END LOOP;

  RETURN json_build_object('success', true);
END;
$function$;
