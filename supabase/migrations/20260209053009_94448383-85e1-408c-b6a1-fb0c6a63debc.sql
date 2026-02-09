-- Enable realtime for bookings table to allow live progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;