UPDATE public.app_releases
SET
  impact = COALESCE(NULLIF(impact, ''), 'minor'),
  affected_modules = CASE
    WHEN affected_modules IS NULL OR array_length(affected_modules, 1) IS NULL
      THEN ARRAY['ui','mobile-nav','toast','safe-area']
    ELSE affected_modules
  END
WHERE version = '2.7.6';