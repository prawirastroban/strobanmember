CREATE POLICY "Customers can log own review and booking actions"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND type IN ('review','booking'));