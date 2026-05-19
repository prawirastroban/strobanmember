-- Restore staff notifications on new booking + fix duplicate trigger
-- 1) Drop duplicate trigger that fires the status-change function twice on UPDATE
DROP TRIGGER IF EXISTS trg_notify_booking_status_change ON public.bookings;

-- 2) Function to notify owner staff (admin/staff) for every booking and
--    branch admins (admin_cabang) only when the booking belongs to their branch
CREATE OR REPLACE FUNCTION public.notify_staff_on_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_rec RECORD;
  branch_label TEXT;
  notif_message TEXT;
BEGIN
  branch_label := COALESCE(NULLIF(NEW.branch, ''), 'cabang belum dipilih');
  notif_message :=
    'Booking baru dari ' || COALESCE(NEW.customer_name, 'pelanggan')
    || ' — ' || COALESCE(NEW.service_name, 'layanan')
    || ' (' || branch_label || ') '
    || ' pada ' || NEW.booking_date::text || ' ' || COALESCE(NEW.booking_time, '');

  -- Owner-level staff: admin & staff get every new booking
  FOR staff_rec IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      staff_rec.user_id,
      'Booking Baru',
      notif_message,
      'booking',
      jsonb_build_object(
        'booking_id', NEW.id,
        'reference_id', NEW.id,
        'customer_name', NEW.customer_name,
        'service_name', NEW.service_name,
        'booking_date', NEW.booking_date,
        'booking_time', NEW.booking_time,
        'branch', NEW.branch,
        'redirect_to', '/dashboard/bookings'
      )
    );
  END LOOP;

  -- Branch admins: only when assigned_branch matches the booking's branch
  IF NEW.branch IS NOT NULL AND NEW.branch <> '' THEN
    FOR staff_rec IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.role = 'admin_cabang'
        AND p.assigned_branch IS NOT NULL
        AND lower(trim(p.assigned_branch)) = lower(trim(NEW.branch))
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, metadata)
      VALUES (
        staff_rec.user_id,
        'Booking Baru di Cabang Anda',
        notif_message,
        'booking',
        jsonb_build_object(
          'booking_id', NEW.id,
          'reference_id', NEW.id,
          'customer_name', NEW.customer_name,
          'service_name', NEW.service_name,
          'booking_date', NEW.booking_date,
          'booking_time', NEW.booking_time,
          'branch', NEW.branch,
          'redirect_to', '/dashboard/bookings'
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_staff_on_new_booking failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_staff_new_booking
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_on_new_booking();