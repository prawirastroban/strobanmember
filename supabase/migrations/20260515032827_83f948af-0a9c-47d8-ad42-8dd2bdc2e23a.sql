-- Status label maps + trigger to send notifications when booking status/payment changes

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_changed boolean := (OLD.status IS DISTINCT FROM NEW.status);
  payment_changed boolean := (OLD.payment_status IS DISTINCT FROM NEW.payment_status);
  status_label text;
  payment_label text;
  notif_title text;
  notif_message text;
  notif_type text := 'booking';
  fn_url text;
  service_role_key text;
BEGIN
  IF NOT status_changed AND NOT payment_changed THEN
    RETURN NEW;
  END IF;

  -- Build status label (Indonesian)
  status_label := CASE NEW.status
    WHEN 'pending' THEN 'Menunggu Pembayaran'
    WHEN 'waiting_confirmation' THEN 'Menunggu Konfirmasi'
    WHEN 'confirmed' THEN 'Dikonfirmasi'
    WHEN 'checked_in' THEN 'Sudah Check-in'
    WHEN 'in_progress' THEN 'Sedang Dikerjakan'
    WHEN 'completed' THEN 'Selesai'
    WHEN 'cancelled' THEN 'Dibatalkan'
    ELSE NEW.status
  END;

  payment_label := CASE NEW.payment_status
    WHEN 'paid' THEN 'Pembayaran Lunas'
    WHEN 'pay_later' THEN 'Bayar di Bengkel'
    WHEN 'refund' THEN 'Dana Dikembalikan'
    WHEN 'pending' THEN 'Menunggu Pembayaran'
    WHEN 'unpaid' THEN 'Belum Lunas'
    ELSE NEW.payment_status
  END;

  IF status_changed THEN
    notif_title := 'Status Booking: ' || status_label;
    notif_message := 'Booking ' || COALESCE(NEW.service_name, '') || ' kini berstatus "' || status_label || '".';
    notif_type := CASE NEW.status
      WHEN 'in_progress' THEN 'service_progress'
      WHEN 'completed' THEN 'service_progress'
      ELSE 'booking'
    END;
  ELSIF payment_changed THEN
    notif_title := payment_label;
    notif_message := 'Pembayaran untuk booking ' || COALESCE(NEW.service_name, '') || ' diperbarui: "' || payment_label || '".';
    notif_type := 'payment_success';
  END IF;

  -- 1. Insert in-app notification
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    NEW.user_id,
    notif_title,
    notif_message,
    notif_type,
    jsonb_build_object(
      'booking_id', NEW.id,
      'reference_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_payment_status', OLD.payment_status,
      'new_payment_status', NEW.payment_status,
      'redirect_to', '/booking-status/' || NEW.id::text
    )
  );

  -- 2. Async call to edge function for WA + push
  fn_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);

  IF fn_url IS NOT NULL AND fn_url <> '' THEN
    PERFORM net.http_post(
      url := fn_url || '/functions/v1/notify-booking-status',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
      ),
      body := jsonb_build_object(
        'booking_id', NEW.id,
        'user_id', NEW.user_id,
        'title', notif_title,
        'message', notif_message,
        'status_changed', status_changed,
        'payment_changed', payment_changed,
        'new_status', NEW.status,
        'new_payment_status', NEW.payment_status
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the booking update
  RAISE WARNING 'notify_booking_status_change failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_notify ON public.bookings;
CREATE TRIGGER trg_booking_status_notify
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION public.notify_booking_status_change();

-- Store project URL + service role for the trigger to use (best effort; can be NULL safely)
DO $$
BEGIN
  PERFORM set_config('app.supabase_url', 'https://yrwttzxrnomaiqxyjrqn.supabase.co', false);
END $$;