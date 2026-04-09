DROP TRIGGER IF EXISTS trg_log_booking_activity ON public.bookings;
CREATE TRIGGER trg_log_booking_activity
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_activity();

DROP TRIGGER IF EXISTS trg_log_vehicle_activity ON public.vehicles;
CREATE TRIGGER trg_log_vehicle_activity
AFTER INSERT ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.log_vehicle_activity();

DROP TRIGGER IF EXISTS trg_log_customer_activity ON public.profiles;
CREATE TRIGGER trg_log_customer_activity
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_customer_activity();

DROP TRIGGER IF EXISTS trg_log_inventory_activity ON public.tires;
CREATE TRIGGER trg_log_inventory_activity
AFTER INSERT OR UPDATE OR DELETE ON public.tires
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_activity();

DROP TRIGGER IF EXISTS trg_log_marketing_activity ON public.rewards;
CREATE TRIGGER trg_log_marketing_activity
AFTER INSERT OR UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.log_marketing_activity();