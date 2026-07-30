CREATE POLICY "spk_orders customer read own" ON public.spk_orders
FOR SELECT TO authenticated
USING (customer_id = auth.uid());