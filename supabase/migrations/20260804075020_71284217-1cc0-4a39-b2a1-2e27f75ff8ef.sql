UPDATE public.services SET warranty_info = CASE
  WHEN category = 'tires' AND name ILIKE 'Ban %' THEN 'Garansi pabrik 1 tahun + garansi pemasangan 7 hari'
  WHEN category = 'tires' THEN 'Garansi pengerjaan 7 hari / 500 km'
  WHEN category = 'spooring' THEN 'Garansi hasil spooring 14 hari / 1.000 km'
  WHEN category = 'ac' THEN 'Garansi servis AC 30 hari / 1.000 km'
  WHEN category = 'electrical' THEN 'Garansi pengerjaan kelistrikan 14 hari'
  WHEN category = 'paket-ganti-oli' THEN 'Garansi oli & pengerjaan 30 hari / 1.000 km'
  WHEN category = 'detailing' THEN 'Garansi hasil pengerjaan 14 hari'
  WHEN category = 'pengecekan' THEN 'Garansi hasil inspeksi 7 hari'
  WHEN category = 'promo-spesial' THEN 'Garansi pengerjaan 14 hari / 500 km'
  ELSE 'Garansi servis 30 hari / 1.000 km'
END
WHERE warranty_info IS NULL OR btrim(warranty_info) = '';