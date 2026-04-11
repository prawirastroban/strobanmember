
-- Remove OLD duplicate triggers on bookings
DROP TRIGGER IF EXISTS trg_generate_invoice ON public.bookings;
DROP TRIGGER IF EXISTS award_points_on_complete ON public.bookings;
DROP TRIGGER IF EXISTS trg_notify_booking_status ON public.bookings;
DROP TRIGGER IF EXISTS trg_sync_invoice_status ON public.bookings;

-- Remove OLD duplicate triggers on payments
DROP TRIGGER IF EXISTS log_payment_activity_trigger ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_payment_status ON public.payments;
DROP TRIGGER IF EXISTS trg_sync_invoice_method ON public.payments;

-- Remove OLD duplicate triggers on profiles
DROP TRIGGER IF EXISTS on_new_user_registration ON public.profiles;
DROP TRIGGER IF EXISTS set_customer_id ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Remove OLD duplicate triggers on loyalty_transactions
DROP TRIGGER IF EXISTS trg_notify_loyalty ON public.loyalty_transactions;

-- Remove OLD duplicate trigger on tires
DROP TRIGGER IF EXISTS update_tires_updated_at ON public.tires;
