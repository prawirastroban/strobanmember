CREATE TABLE public.pricelist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'ban',
  brand text NOT NULL DEFAULT '',
  type text,
  kategori text,
  pattern text,
  rim integer,
  size text,
  size_key text,
  price_grosir numeric,
  price_external numeric,
  price_heb numeric,
  price_retail numeric,
  vehicle_model text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE INDEX pricelist_items_category_idx ON public.pricelist_items(category);
GRANT SELECT ON public.pricelist_items TO authenticated;
GRANT ALL ON public.pricelist_items TO service_role;
ALTER TABLE public.pricelist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internal team reads pricelist" ON public.pricelist_items FOR SELECT TO authenticated
USING (public.is_internal_user(auth.uid()) OR public.has_role(auth.uid(),'mekanik') OR public.has_role(auth.uid(),'head_mekanik'));

CREATE OR REPLACE FUNCTION public.replace_pricelist(_category text, _rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'Hanya admin/owner yang boleh import pricelist';
  END IF;
  DELETE FROM public.pricelist_items WHERE category = _category;
  INSERT INTO public.pricelist_items(category,brand,type,kategori,pattern,rim,size,size_key,price_grosir,price_external,price_heb,price_retail,vehicle_model,updated_by)
  SELECT _category, coalesce(r->>'brand',''), r->>'type', r->>'kategori', r->>'pattern', nullif(r->>'rim','')::int, r->>'size', r->>'size_key',
    nullif(r->>'price_grosir','')::numeric, nullif(r->>'price_external','')::numeric, nullif(r->>'price_heb','')::numeric, nullif(r->>'price_retail','')::numeric,
    r->>'vehicle_model', auth.uid()
  FROM jsonb_array_elements(_rows) r;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.replace_pricelist(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.replace_pricelist(text, jsonb) TO authenticated;