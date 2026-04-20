
-- Public read-only view of customer reviews from activity_logs
-- Exposes only safe fields, NO emails / no full names / no user_id
CREATE OR REPLACE VIEW public.public_reviews
WITH (security_invoker = on) AS
SELECT
  al.id,
  al.created_at,
  (al.metadata->>'rating')::int                AS rating,
  NULLIF(al.metadata->>'review', '')           AS review,
  NULLIF(al.metadata->>'service_name', '')     AS service_name,
  NULLIF(al.metadata->>'branch', '')           AS branch,
  -- Derive initials from profile full_name (max 2 chars), fallback "S"
  COALESCE(
    UPPER(LEFT(REGEXP_REPLACE(COALESCE(p.full_name, ''), '[^A-Za-z ]', '', 'g'), 1))
    || UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(p.full_name, ''), '[^A-Za-z ]', '', 'g') FROM ' (.)')),
    'S'
  ) AS initials,
  -- Masked first name only (e.g. "Budi S.") — never the full name
  CASE
    WHEN p.full_name IS NULL OR btrim(p.full_name) = '' THEN 'Pelanggan'
    ELSE SPLIT_PART(p.full_name, ' ', 1)
         || CASE WHEN POSITION(' ' IN p.full_name) > 0
                 THEN ' ' || UPPER(LEFT(SPLIT_PART(p.full_name, ' ', 2), 1)) || '.'
                 ELSE '' END
  END AS display_name
FROM public.activity_logs al
LEFT JOIN public.profiles p ON p.id = al.user_id
WHERE al.type = 'review'
  AND (al.metadata->>'rating')::int >= 4;

-- Allow anon + authenticated to read the curated view
GRANT SELECT ON public.public_reviews TO anon, authenticated;
