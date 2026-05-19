
-- Allow admin_cabang to manage booking_slots
DROP POLICY IF EXISTS "Staff can insert slots" ON public.booking_slots;
DROP POLICY IF EXISTS "Staff can update slots" ON public.booking_slots;
DROP POLICY IF EXISTS "Staff can delete slots" ON public.booking_slots;

CREATE POLICY "Staff can insert slots" ON public.booking_slots
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'admin_cabang'::app_role)
);

CREATE POLICY "Staff can update slots" ON public.booking_slots
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'admin_cabang'::app_role)
);

CREATE POLICY "Staff can delete slots" ON public.booking_slots
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'admin_cabang'::app_role)
);

-- Allow admin_cabang to manage payment-proofs and payment-assets storage
DROP POLICY IF EXISTS "Staff manage all proofs" ON storage.objects;
CREATE POLICY "Staff manage all proofs" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'admin_cabang'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'admin_cabang'::app_role)
  )
);

DROP POLICY IF EXISTS "Staff manage payment-assets" ON storage.objects;
CREATE POLICY "Staff manage payment-assets" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'payment-assets'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'admin_cabang'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'payment-assets'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'admin_cabang'::app_role)
  )
);
