-- Fix update_updated_at_column search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict rewards to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.rewards;
CREATE POLICY "Authenticated users can view active rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (is_active = true);