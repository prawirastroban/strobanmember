
-- SPK ⇄ Booking ⇄ Customer integration + AI health

-- 1. AI health report column
ALTER TABLE public.spk_orders
  ADD COLUMN IF NOT EXISTS ai_health_report jsonb;

-- 2. Index for booking lookups
CREATE INDEX IF NOT EXISTS spk_orders_booking_id_idx ON public.spk_orders(booking_id);

-- 3. Customer-side RLS: allow reading their own SPK (via booking.user_id)
DROP POLICY IF EXISTS "spk_orders customer read" ON public.spk_orders;
CREATE POLICY "spk_orders customer read"
  ON public.spk_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = spk_orders.booking_id
        AND b.user_id = auth.uid()
    )
  );

-- 4. Customer can read SPK events & timeline for own SPK
DROP POLICY IF EXISTS "spk_events customer read" ON public.spk_events;
CREATE POLICY "spk_events customer read"
  ON public.spk_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.spk_orders s
      JOIN public.bookings b ON b.id = s.booking_id
      WHERE s.id = spk_events.spk_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "spk_timeline customer read" ON public.spk_timeline;
CREATE POLICY "spk_timeline customer read"
  ON public.spk_timeline
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.spk_orders s
      JOIN public.bookings b ON b.id = s.booking_id
      WHERE s.id = spk_timeline.spk_id AND b.user_id = auth.uid()
    )
  );

-- 5. Customer approvals: can read + insert (customer approving own SPK)
DROP POLICY IF EXISTS "spk_approvals customer read" ON public.spk_approvals;
CREATE POLICY "spk_approvals customer read"
  ON public.spk_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.spk_orders s
      JOIN public.bookings b ON b.id = s.booking_id
      WHERE s.id = spk_approvals.spk_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "spk_approvals customer insert" ON public.spk_approvals;
CREATE POLICY "spk_approvals customer insert"
  ON public.spk_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.spk_orders s
      JOIN public.bookings b ON b.id = s.booking_id
      WHERE s.id = spk_approvals.spk_id AND b.user_id = auth.uid()
    )
  );
