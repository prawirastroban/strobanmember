
-- 1. Add columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_source TEXT,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT,
  ADD COLUMN IF NOT EXISTS created_branch TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS first_booking_source TEXT;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_source_date ON public.bookings (booking_source, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_createdby_date ON public.bookings (created_by, booking_date);

-- 3. Helper
CREATE OR REPLACE FUNCTION public._map_role_to_source(_role TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _role
    WHEN 'staff'        THEN 'booking_manager'
    WHEN 'admin'        THEN 'call_center'
    WHEN 'admin_cabang' THEN 'branch_staff'
    ELSE 'self_booking'
  END;
$$;

-- 4. BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION public.set_booking_source_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_branch TEXT;
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    SELECT role::text INTO v_role
      FROM public.user_roles
      WHERE user_id = NEW.created_by
      ORDER BY CASE role::text
        WHEN 'staff' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'admin_cabang' THEN 3
        ELSE 4 END
      LIMIT 1;
  END IF;

  IF NEW.created_by_role IS NULL THEN
    NEW.created_by_role := COALESCE(v_role, 'customer');
  END IF;

  IF NEW.booking_source IS NULL OR NEW.booking_source = '' THEN
    IF NEW.created_by IS NULL OR NEW.created_by = NEW.user_id THEN
      NEW.booking_source := 'self_booking';
    ELSE
      NEW.booking_source := public._map_role_to_source(COALESCE(v_role, 'customer'));
    END IF;
  END IF;

  IF NEW.created_branch IS NULL AND NEW.booking_source <> 'self_booking' AND NEW.created_by IS NOT NULL THEN
    SELECT assigned_branch INTO v_branch
      FROM public.profiles WHERE id = NEW.created_by;
    NEW.created_branch := v_branch;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_source_defaults ON public.bookings;
CREATE TRIGGER trg_set_booking_source_defaults
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_source_defaults();

-- 5. AFTER INSERT trigger
CREATE OR REPLACE FUNCTION public.set_first_booking_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.profiles
     SET first_booking_source = COALESCE(first_booking_source, NEW.booking_source),
         acquisition_source   = COALESCE(acquisition_source, NEW.booking_source)
   WHERE id = NEW.user_id
     AND (first_booking_source IS NULL OR acquisition_source IS NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_first_booking_source ON public.bookings;
CREATE TRIGGER trg_set_first_booking_source
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_first_booking_source();

-- 6. Backfill bookings (correlated subqueries to avoid FROM-alias issue)
UPDATE public.bookings b
SET
  created_by_role = COALESCE(
    b.created_by_role,
    COALESCE(
      (SELECT role::text FROM public.user_roles WHERE user_id = b.created_by
        ORDER BY CASE role::text
          WHEN 'staff' THEN 1 WHEN 'admin' THEN 2 WHEN 'admin_cabang' THEN 3 ELSE 4 END
        LIMIT 1),
      'customer'
    )
  ),
  booking_source = COALESCE(
    b.booking_source,
    CASE
      WHEN b.created_by IS NULL OR b.created_by = b.user_id THEN 'self_booking'
      ELSE public._map_role_to_source(
        COALESCE(
          (SELECT role::text FROM public.user_roles WHERE user_id = b.created_by
            ORDER BY CASE role::text
              WHEN 'staff' THEN 1 WHEN 'admin' THEN 2 WHEN 'admin_cabang' THEN 3 ELSE 4 END
            LIMIT 1),
          'customer'
        )
      )
    END
  ),
  created_branch = COALESCE(
    b.created_branch,
    CASE
      WHEN b.created_by IS NULL OR b.created_by = b.user_id THEN NULL
      ELSE (SELECT assigned_branch FROM public.profiles WHERE id = b.created_by)
    END
  )
WHERE b.booking_source IS NULL OR b.created_by_role IS NULL;

-- 7. Backfill profiles
WITH first_b AS (
  SELECT DISTINCT ON (user_id) user_id, booking_source
  FROM public.bookings
  WHERE user_id IS NOT NULL AND booking_source IS NOT NULL
  ORDER BY user_id, created_at ASC
)
UPDATE public.profiles p
SET first_booking_source = COALESCE(p.first_booking_source, fb.booking_source),
    acquisition_source   = COALESCE(p.acquisition_source, fb.booking_source)
FROM first_b fb
WHERE p.id = fb.user_id
  AND (p.first_booking_source IS NULL OR p.acquisition_source IS NULL);
