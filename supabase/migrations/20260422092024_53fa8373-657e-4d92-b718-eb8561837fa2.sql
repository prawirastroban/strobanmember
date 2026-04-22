
-- ============ 1. user_roles: hapus policy berbahaya ============
DROP POLICY IF EXISTS "Staff can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can view all roles" ON public.user_roles;
-- Hapus duplikat "Only admin can*" (sudah ada "Admins can*")
DROP POLICY IF EXISTS "Only admin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin can delete roles" ON public.user_roles;

-- ============ 2. payments: hapus konflik update policy ============
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;

-- ============ 3. Foreign Keys (idempotent via DO blocks) ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_vehicle_id_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_vehicle_id_fkey
      FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_user_id_fkey') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_user_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tire_orders_user_id_fkey') THEN
    ALTER TABLE public.tire_orders ADD CONSTRAINT tire_orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tire_orders_vehicle_id_fkey') THEN
    ALTER TABLE public.tire_orders ADD CONSTRAINT tire_orders_vehicle_id_fkey
      FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_user_id_fkey') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_points_user_id_fkey') THEN
    ALTER TABLE public.loyalty_points ADD CONSTRAINT loyalty_points_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_transactions_user_id_fkey') THEN
    ALTER TABLE public.loyalty_transactions ADD CONSTRAINT loyalty_transactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_redemptions_user_id_fkey') THEN
    ALTER TABLE public.reward_redemptions ADD CONSTRAINT reward_redemptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_tokens_user_id_fkey') THEN
    ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes pendukung FK untuk performa
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_tire_orders_user_id ON public.tire_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ============ 4. Auto-invoice untuk tire_orders ============
CREATE OR REPLACE FUNCTION public.sync_tire_order_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
  v_seq INT;
BEGIN
  IF NEW.payment_status IN ('paid','success') AND
     (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN

    -- Skip jika sudah ada invoice utk tire_order ini (cek via items->>'tire_order_id')
    IF EXISTS (
      SELECT 1 FROM public.invoices
      WHERE items @> jsonb_build_array(jsonb_build_object('tire_order_id', NEW.id::text))
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(MAX((regexp_replace(invoice_number, '\D','','g'))::int), 0) + 1
      INTO v_seq FROM public.invoices;
    v_invoice_number := 'INV-' || LPAD(v_seq::text, 6, '0');

    -- bookings.id wajib (FK), pakai booking_id null tidak bisa karena NOT NULL.
    -- Untuk tire-only order, kita simpan tetap dgn booking_id = NEW.id (mengisi placeholder).
    -- NOTE: jika constraint melarang, abaikan diam-diam.
    BEGIN
      INSERT INTO public.invoices (
        invoice_number, booking_id, user_id, amount,
        payment_status, payment_method, items
      ) VALUES (
        v_invoice_number, NEW.id, NEW.user_id, NEW.total_amount,
        'paid', NEW.payment_method,
        jsonb_build_array(jsonb_build_object(
          'tire_order_id', NEW.id::text,
          'order_number', NEW.order_number,
          'items', NEW.items,
          'subtotal', NEW.subtotal,
          'installation_fee', NEW.installation_fee,
          'total', NEW.total_amount
        ))
      );
    EXCEPTION WHEN OTHERS THEN
      -- jangan blokir update tire_order kalau insert invoice gagal
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tire_order_invoice ON public.tire_orders;
CREATE TRIGGER trg_sync_tire_order_invoice
AFTER UPDATE ON public.tire_orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_tire_order_invoice();

-- ============ 5. Auto loyalty points untuk tire_orders selesai ============
CREATE OR REPLACE FUNCTION public.award_points_on_tire_order_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- 1 poin per Rp 10.000
    v_points := GREATEST(0, FLOOR(NEW.total_amount / 10000)::int);
    IF v_points > 0 THEN
      INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description)
      VALUES (NEW.user_id, v_points, 'earn',
        'Pembelian ban order ' || NEW.order_number);

      INSERT INTO public.loyalty_points (user_id, total_points)
      VALUES (NEW.user_id, v_points)
      ON CONFLICT (user_id) DO UPDATE
        SET total_points = public.loyalty_points.total_points + EXCLUDED.total_points,
            updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_points_tire_order ON public.tire_orders;
CREATE TRIGGER trg_award_points_tire_order
AFTER UPDATE ON public.tire_orders
FOR EACH ROW
EXECUTE FUNCTION public.award_points_on_tire_order_complete();
