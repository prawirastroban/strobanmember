
-- Drop all existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS trg_log_booking_activity ON public.bookings;
DROP TRIGGER IF EXISTS trg_notify_booking_status_change ON public.bookings;
DROP TRIGGER IF EXISTS trg_award_points_on_booking_complete ON public.bookings;
DROP TRIGGER IF EXISTS trg_sync_invoice_payment_status ON public.bookings;
DROP TRIGGER IF EXISTS trg_generate_invoice_on_booking ON public.bookings;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;

DROP TRIGGER IF EXISTS trg_log_payment_activity ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_payment_status_change ON public.payments;
DROP TRIGGER IF EXISTS trg_sync_invoice_payment_method ON public.payments;
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;

DROP TRIGGER IF EXISTS trg_log_customer_activity ON public.profiles;
DROP TRIGGER IF EXISTS trg_notify_staff_new_registration ON public.profiles;
DROP TRIGGER IF EXISTS trg_generate_customer_id ON public.profiles;

DROP TRIGGER IF EXISTS trg_log_vehicle_activity ON public.vehicles;
DROP TRIGGER IF EXISTS trg_notify_vehicle_added ON public.vehicles;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;

DROP TRIGGER IF EXISTS trg_notify_invoice_created ON public.invoices;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;

DROP TRIGGER IF EXISTS trg_log_marketing_activity ON public.rewards;
DROP TRIGGER IF EXISTS update_rewards_updated_at ON public.rewards;

DROP TRIGGER IF EXISTS trg_log_inventory_activity ON public.tires;

DROP TRIGGER IF EXISTS trg_notify_loyalty_points ON public.loyalty_transactions;

DROP TRIGGER IF EXISTS update_loyalty_points_updated_at ON public.loyalty_points;

-- Re-create all triggers

-- Bookings
CREATE TRIGGER trg_log_booking_activity
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_activity();

CREATE TRIGGER trg_notify_booking_status_change
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

CREATE TRIGGER trg_award_points_on_booking_complete
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_booking_complete();

CREATE TRIGGER trg_sync_invoice_payment_status
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_status();

CREATE TRIGGER trg_generate_invoice_on_booking
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_on_booking();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments
CREATE TRIGGER trg_log_payment_activity
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_payment_activity();

CREATE TRIGGER trg_notify_payment_status_change
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_status_change();

CREATE TRIGGER trg_sync_invoice_payment_method
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_method();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles
CREATE TRIGGER trg_log_customer_activity
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_customer_activity();

CREATE TRIGGER trg_notify_staff_new_registration
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_registration();

CREATE TRIGGER trg_generate_customer_id
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_customer_id();

-- Vehicles
CREATE TRIGGER trg_log_vehicle_activity
AFTER INSERT ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.log_vehicle_activity();

CREATE TRIGGER trg_notify_vehicle_added
AFTER INSERT ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.notify_vehicle_added();

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices
CREATE TRIGGER trg_notify_invoice_created
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_created();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rewards
CREATE TRIGGER trg_log_marketing_activity
AFTER INSERT OR UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.log_marketing_activity();

CREATE TRIGGER update_rewards_updated_at
BEFORE UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tires
CREATE TRIGGER trg_log_inventory_activity
AFTER INSERT OR UPDATE OR DELETE ON public.tires
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_activity();

-- Loyalty transactions
CREATE TRIGGER trg_notify_loyalty_points
AFTER INSERT ON public.loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_loyalty_points();

-- Loyalty points
CREATE TRIGGER update_loyalty_points_updated_at
BEFORE UPDATE ON public.loyalty_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
