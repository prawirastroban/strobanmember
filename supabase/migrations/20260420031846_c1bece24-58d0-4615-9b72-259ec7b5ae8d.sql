
-- Revert to invoker mode (safer, fixes Security Definer View linter)
ALTER VIEW public.public_reviews SET (security_invoker = on);

-- Allow anyone (anon + authenticated) to read activity_logs ONLY for type='review'
-- This is needed so the public_reviews view (with security_invoker=on) can return rows
-- to anonymous visitors. Other log types remain restricted to staff.
DROP POLICY IF EXISTS "Anyone can view review activity logs" ON public.activity_logs;
CREATE POLICY "Anyone can view review activity logs"
ON public.activity_logs
FOR SELECT
TO anon, authenticated
USING (type = 'review');
