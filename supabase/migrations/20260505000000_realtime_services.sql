-- Enable realtime broadcasts for services & service_categories so the
-- mobile homepage "Layanan" grid auto-syncs with Dashboard → Edit Service.
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER TABLE public.service_categories REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
