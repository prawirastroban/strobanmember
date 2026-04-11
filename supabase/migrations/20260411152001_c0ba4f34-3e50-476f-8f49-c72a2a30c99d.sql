CREATE POLICY "Users can update own payments"
ON public.payments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);