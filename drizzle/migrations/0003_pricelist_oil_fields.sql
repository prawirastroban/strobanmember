ALTER TABLE public.pricelist_items ADD COLUMN IF NOT EXISTS item_code text, ADD COLUMN IF NOT EXISTS item_name text, ADD COLUMN IF NOT EXISTS unit text;
CREATE OR REPLACE FUNCTION public.replace_pricelist(_category text, _rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'Hanya admin/owner yang boleh import pricelist';
  END IF;
  DELETE FROM public.pricelist_items WHERE category = _category;
  INSERT INTO public.pricelist_items(category,brand,type,kategori,pattern,rim,size,size_key,price_grosir,price_external,price_heb,price_retail,vehicle_model,item_code,item_name,unit,updated_by)
  SELECT _category, coalesce(r->>'brand',''), r->>'type', r->>'kategori', r->>'pattern', nullif(r->>'rim','')::int, r->>'size', r->>'size_key',
    nullif(r->>'price_grosir','')::numeric, nullif(r->>'price_external','')::numeric, nullif(r->>'price_heb','')::numeric, nullif(r->>'price_retail','')::numeric,
    r->>'vehicle_model',r->>'item_code',r->>'item_name',r->>'unit',auth.uid()
  FROM jsonb_array_elements(_rows) r;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;