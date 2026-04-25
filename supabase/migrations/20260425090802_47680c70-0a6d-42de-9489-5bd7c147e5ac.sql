CREATE POLICY "Users can insert own review activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'review'
  AND user_id = auth.uid()
);