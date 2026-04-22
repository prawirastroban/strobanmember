-- Tabel pesanan ban
CREATE TABLE public.tire_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  
  -- Customer snapshot
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  
  -- Items (snapshot ban yang dipesan)
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- format: [{tire_id, brand, type, size, quantity, unit_price, subtotal}]
  
  quantity_total integer NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  installation_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  
  -- Fulfillment
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN ('pickup','installation')),
  branch text NOT NULL,
  
  -- Untuk installation
  vehicle_id uuid,
  car_type text,
  car_plate_number text,
  install_date date,
  install_time text,
  
  -- Status & payment
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','ready','installed','completed','cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  payment_method text,
  midtrans_order_id text,
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tire_orders_user ON public.tire_orders(user_id);
CREATE INDEX idx_tire_orders_status ON public.tire_orders(status);
CREATE INDEX idx_tire_orders_midtrans ON public.tire_orders(midtrans_order_id);

ALTER TABLE public.tire_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tire orders"
  ON public.tire_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tire orders"
  ON public.tire_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all tire orders"
  ON public.tire_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update tire orders"
  ON public.tire_orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert tire orders"
  ON public.tire_orders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Updated_at trigger
CREATE TRIGGER trg_tire_orders_updated_at
  BEFORE UPDATE ON public.tire_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence untuk order number
CREATE SEQUENCE IF NOT EXISTS public.tire_order_seq START 1;

-- Auto-generate order number
CREATE OR REPLACE FUNCTION public.generate_tire_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ORD-' || LPAD(nextval('public.tire_order_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_tire_order_number
  BEFORE INSERT ON public.tire_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_tire_order_number();

-- Notifikasi customer + staff saat order dibuat / status berubah
CREATE OR REPLACE FUNCTION public.notify_tire_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_message text;
  staff_record RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, 'Pesanan Ban Dibuat',
      'Pesanan ' || NEW.order_number || ' (' || NEW.quantity_total || ' ban) berhasil dibuat.',
      'tire_order', jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number));
    
    FOR staff_record IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','staff') LOOP
      INSERT INTO public.notifications (user_id, title, message, type, metadata)
      VALUES (staff_record.user_id, 'Pesanan Ban Baru',
        'Pesanan ban baru ' || NEW.order_number || ' dari ' || NEW.customer_name,
        'tire_order', jsonb_build_object('order_id', NEW.id));
    END LOOP;
    
    INSERT INTO public.activity_logs (type, description, user_id, metadata)
    VALUES ('tire_order', 'Tire order created: ' || NEW.order_number, NEW.user_id,
      jsonb_build_object('order_id', NEW.id, 'amount', NEW.total_amount));
  
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN v_title := 'Pesanan Dikonfirmasi'; v_message := 'Pesanan ' || NEW.order_number || ' dikonfirmasi.';
      WHEN 'ready' THEN v_title := 'Pesanan Siap'; v_message := 'Pesanan ' || NEW.order_number || ' siap diambil/dipasang.';
      WHEN 'installed' THEN v_title := 'Pemasangan Selesai'; v_message := 'Pesanan ' || NEW.order_number || ' telah terpasang.';
      WHEN 'completed' THEN v_title := 'Pesanan Selesai'; v_message := 'Pesanan ' || NEW.order_number || ' selesai. Terima kasih!';
      WHEN 'cancelled' THEN v_title := 'Pesanan Dibatalkan'; v_message := 'Pesanan ' || NEW.order_number || ' dibatalkan.';
      ELSE v_title := 'Update Pesanan'; v_message := 'Status pesanan ' || NEW.order_number || ': ' || NEW.status;
    END CASE;
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (NEW.user_id, v_title, v_message, 'tire_order', jsonb_build_object('order_id', NEW.id));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_tire_order
  AFTER INSERT OR UPDATE ON public.tire_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_tire_order();
