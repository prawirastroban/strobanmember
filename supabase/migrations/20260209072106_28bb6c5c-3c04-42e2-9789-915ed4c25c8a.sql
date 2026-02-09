-- Add car data columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN car_type text,
ADD COLUMN car_plate_number text;