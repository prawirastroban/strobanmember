-- Remove the overly permissive SELECT policy on push_tokens
-- Service role already bypasses RLS, so this policy is unnecessary
-- and dangerously allows any authenticated user to read all tokens
DROP POLICY IF EXISTS "Service role can read all tokens" ON public.push_tokens;