-- Function to award loyalty points when booking is completed
CREATE OR REPLACE FUNCTION public.award_points_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_to_award INTEGER := 100; -- Base points per service
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Award points based on service price (1 point per $10 spent, minimum 100 points)
    points_to_award := GREATEST(100, FLOOR(NEW.service_price / 10)::INTEGER);
    
    -- Insert or update loyalty points
    INSERT INTO public.loyalty_points (user_id, total_points)
    VALUES (NEW.user_id, points_to_award)
    ON CONFLICT (user_id) 
    DO UPDATE SET total_points = loyalty_points.total_points + points_to_award;

    -- Record the transaction
    INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description, created_by)
    VALUES (
      NEW.user_id, 
      points_to_award, 
      'service', 
      'Points earned for ' || NEW.service_name || ' service',
      NULL -- Automated, no staff created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
CREATE TRIGGER award_points_on_complete
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_booking_complete();