ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS original_service_price numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_label text,
  ADD COLUMN IF NOT EXISTS discount_source text;

CREATE OR REPLACE FUNCTION public.generate_invoice_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_number TEXT;
  v_items jsonb;
  v_subtotal numeric;
BEGIN
  v_invoice_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');

  v_subtotal := COALESCE(NEW.original_service_price, NEW.service_price);

  v_items := jsonb_build_array(jsonb_build_object(
    'name', NEW.service_name,
    'type', NEW.service_type,
    'price', v_subtotal,
    'quantity', 1
  ));

  IF COALESCE(NEW.discount_amount, 0) > 0 THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'name', COALESCE(NEW.discount_label, 'Diskon'),
      'type', 'discount',
      'code', NEW.discount_code,
      'source', NEW.discount_source,
      'price', -NEW.discount_amount,
      'quantity', 1
    ));
  END IF;

  INSERT INTO public.invoices (invoice_number, booking_id, user_id, amount, items, payment_status)
  VALUES (
    v_invoice_number,
    NEW.id,
    NEW.user_id,
    NEW.service_price,
    v_items,
    NEW.payment_status
  );

  RETURN NEW;
END;
$$;