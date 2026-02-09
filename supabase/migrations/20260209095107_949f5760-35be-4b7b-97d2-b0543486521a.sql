-- Add branch column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN branch TEXT;