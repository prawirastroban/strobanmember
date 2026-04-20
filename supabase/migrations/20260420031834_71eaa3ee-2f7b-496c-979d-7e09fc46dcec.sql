
-- Switch to security_definer so anonymous visitors can read curated reviews
-- without needing access to the underlying activity_logs table
ALTER VIEW public.public_reviews SET (security_invoker = off);
