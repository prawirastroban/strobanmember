-- Update notify_staff_new_registration: tambahkan redirect_to ke customer detail
CREATE OR REPLACE FUNCTION public.notify_staff_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  staff_record RECORD;
BEGIN
  FOR staff_record IN 
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'staff', 'admin_cabang')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      staff_record.user_id,
      'Pendaftaran Baru',
      'User baru mendaftar: ' || COALESCE(NEW.full_name, 'Unknown'),
      'new_registration',
      jsonb_build_object(
        'registered_user_id', NEW.id,
        'reference_id', NEW.id,
        'redirect_to', '/dashboard/customers/' || NEW.id::text
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Update notify_booking_status_change (the one in 20260411154712 that handles INSERT/UPDATE on bookings
-- and notifies both customer and staff). We preserve all existing behavior and only add
-- customer_user_id + redirect_to in staff "Booking Baru" metadata.
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  staff_record RECORD;
BEGIN
  -- Notify customer on status change
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    CASE NEW.status
      WHEN 'pending' THEN
        v_title := 'Booking Diterima';
        v_message := 'Booking ' || NEW.service_name || ' telah diterima dan menunggu pembayaran.';
      WHEN 'confirmed' THEN
        v_title := 'Booking Dikonfirmasi';
        v_message := NEW.service_name || ' telah dikonfirmasi. Sampai jumpa di bengkel!';
      WHEN 'in_progress' THEN
        v_title := 'Servis Dimulai';
        v_message := 'Servis ' || NEW.service_name || ' sedang dikerjakan.';
      WHEN 'completed' THEN
        v_title := 'Servis Selesai';
        v_message := 'Servis ' || NEW.service_name || ' telah selesai.';
      WHEN 'cancelled' THEN
        v_title := 'Booking Dibatalkan';
        v_message := 'Booking ' || NEW.service_name || ' telah dibatalkan.';
      WHEN 'ready' THEN
        v_title := 'Pesanan Siap';
        v_message := NEW.service_name || ' siap untuk diambil/dipasang.';
      WHEN 'installed' THEN
        v_title := 'Pemasangan Selesai';
        v_message := NEW.service_name || ' telah terpasang pada kendaraan Anda.';
      ELSE
        v_title := 'Update Booking';
        v_message := 'Status booking ' || NEW.service_name || ' diperbarui menjadi ' || NEW.status || '.';
    END CASE;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, v_title, v_message, 'booking',
      jsonb_build_object('booking_id', NEW.id, 'status', NEW.status));
  END IF;

  -- Notify staff on new booking → include customer_user_id + redirect_to customer detail
  IF TG_OP = 'INSERT' THEN
    FOR staff_record IN 
      SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'staff', 'admin_cabang')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, metadata)
      VALUES (
        staff_record.user_id,
        'Booking Baru',
        'Booking baru dari ' || NEW.customer_name || ': ' || NEW.service_name,
        'booking',
        jsonb_build_object(
          'booking_id', NEW.id,
          'customer_user_id', NEW.user_id,
          'customer_name', NEW.customer_name,
          'reference_id', NEW.user_id,
          'redirect_to', '/dashboard/customers/' || NEW.user_id::text
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;