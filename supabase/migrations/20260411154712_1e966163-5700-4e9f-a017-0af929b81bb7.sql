
-- 1. Notify customer on booking status change
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
  -- Only on status change
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        v_title := 'Booking Dikonfirmasi';
        v_message := 'Booking ' || NEW.service_name || ' pada ' || NEW.booking_date || ' telah dikonfirmasi.';
      WHEN 'in_progress' THEN
        v_title := 'Servis Dimulai';
        v_message := 'Servis ' || NEW.service_name || ' untuk kendaraan Anda sedang dikerjakan.';
      WHEN 'completed' THEN
        v_title := 'Servis Selesai';
        v_message := 'Servis ' || NEW.service_name || ' telah selesai. Terima kasih!';
      WHEN 'cancelled' THEN
        v_title := 'Booking Dibatalkan';
        v_message := 'Booking ' || NEW.service_name || ' pada ' || NEW.booking_date || ' telah dibatalkan.';
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

    -- Notify customer
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, v_title, v_message, 'booking',
      jsonb_build_object('booking_id', NEW.id, 'status', NEW.status));
  END IF;

  -- Notify staff on new booking
  IF TG_OP = 'INSERT' THEN
    FOR staff_record IN 
      SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'staff')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, metadata)
      VALUES (staff_record.user_id, 'Booking Baru', 'Booking baru dari ' || NEW.customer_name || ': ' || NEW.service_name,
        'booking', jsonb_build_object('booking_id', NEW.id, 'customer_name', NEW.customer_name));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_booking_status
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_status_change();

-- 2. Notify customer on payment status change
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_service_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    SELECT service_name INTO v_service_name FROM public.bookings WHERE id = NEW.booking_id;

    CASE NEW.payment_status
      WHEN 'success' THEN
        v_title := 'Pembayaran Berhasil';
        v_message := 'Pembayaran Rp ' || NEW.amount || ' untuk ' || COALESCE(v_service_name, 'layanan') || ' berhasil.';
      WHEN 'failed' THEN
        v_title := 'Pembayaran Gagal';
        v_message := 'Pembayaran Rp ' || NEW.amount || ' untuk ' || COALESCE(v_service_name, 'layanan') || ' gagal. Silakan coba lagi.';
      WHEN 'pending' THEN
        v_title := 'Pembayaran Pending';
        v_message := 'Pembayaran Rp ' || NEW.amount || ' sedang diproses.';
      ELSE
        v_title := 'Update Pembayaran';
        v_message := 'Status pembayaran diperbarui menjadi ' || NEW.payment_status || '.';
    END CASE;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, v_title, v_message, 'payment',
      jsonb_build_object('payment_id', NEW.id, 'booking_id', NEW.booking_id, 'status', NEW.payment_status, 'amount', NEW.amount));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_status
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_status_change();

-- 3. Notify customer on loyalty points earned
CREATE OR REPLACE FUNCTION public.notify_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.points > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, 'Poin Diperoleh! 🎉', 'Anda mendapatkan ' || NEW.points || ' poin. ' || COALESCE(NEW.description, ''),
      'loyalty', jsonb_build_object('points', NEW.points, 'type', NEW.transaction_type));
  ELSIF NEW.transaction_type = 'reward_redeemed' THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, 'Reward Ditukar', 'Anda menukar ' || ABS(NEW.points) || ' poin. ' || COALESCE(NEW.description, ''),
      'loyalty', jsonb_build_object('points', NEW.points, 'type', NEW.transaction_type));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_loyalty
AFTER INSERT ON public.loyalty_transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_loyalty_points();

-- 4. Notify customer when vehicle registered
CREATE OR REPLACE FUNCTION public.notify_vehicle_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (NEW.user_id, 'Kendaraan Terdaftar', NEW.brand || ' ' || NEW.model || ' (' || NEW.license_plate || ') berhasil ditambahkan.',
    'info', jsonb_build_object('vehicle_id', NEW.id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_vehicle_added
AFTER INSERT ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.notify_vehicle_added();

-- 5. Notify customer when invoice created
CREATE OR REPLACE FUNCTION public.notify_invoice_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (NEW.user_id, 'Invoice Dibuat', 'Invoice ' || NEW.invoice_number || ' sebesar Rp ' || NEW.amount || ' telah dibuat.',
    'info', jsonb_build_object('invoice_id', NEW.id, 'invoice_number', NEW.invoice_number, 'booking_id', NEW.booking_id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_invoice_created
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.notify_invoice_created();
