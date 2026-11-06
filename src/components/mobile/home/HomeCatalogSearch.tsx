import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Wrench, CircleDot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Hit = { id: string; kind: "jasa" | "ban"; title: string; sub: string; category?: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const digits = (s: string) => s.replace(/\D/g, "");

/** Cocok lintas format, mirip pencarian Pricelist ("185/65r14" = "1856514", "ganti oli"). */
const matches = (text: string, q: string) => {
  const t = norm(text);
  const td = digits(text);
  return q
    .toLowerCase()
    .replace(/(\d)([a-z])/gi, "$1 $2")
    .split(/[\s/\-.]+/)
    .filter(Boolean)
    .every((tok) => {
      const n = norm(tok);
      if (!n) return true;
      if (/^\d+$/.test(n)) return td.includes(n) || t.includes(n);
      return t.includes(n);
    }) || (digits(q).length >= 4 && td.includes(digits(q)));
};

let cache: Hit[] | null = null;

const HomeCatalogSearch = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Hit[]>(cache ?? []);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(!!cache);

  const load = async () => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    const [s, t] = await Promise.all([
      supabase.from("services").select("id,name,category,description").eq("is_active", true).limit(300),
      supabase.from("tires").select("id,brand,type,size").eq("is_active", true).limit(800),
    ]);
    const list: Hit[] = [
      ...((s.data ?? []) as any[]).map((r) => ({ id: r.id, kind: "jasa" as const, title: r.name, sub: String(r.category ?? "Jasa").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()), category: r.category })),
      ...((t.data ?? []) as any[]).map((r) => ({ id: r.id, kind: "ban" as const, title: `${r.brand ?? ""} ${r.type ?? ""}`.trim(), sub: r.size ?? "Ban" })),
    ];
    cache = list;
    setItems(list);
    setLoading(false);
  };

  useEffect(() => { if (q) void load(); }, [q]);

  const hits = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    return items.filter((h) => matches(`${h.title} ${h.sub}`, query)).slice(0, 8);
  }, [items, q]);

  const open = (h: Hit) => {
    navigate(h.kind === "ban" ? "/katalog?category=ban" : `/katalog${h.category ? `?category=${encodeURIComponent(h.category)}` : ""}`);
  };

  return (
    <div className="relative">
      <label className="flex h-11 items-center gap-2 rounded-full bg-card px-4 shadow-[0_8px_24px_-12px_hsl(0_0%_0%/0.35),inset_0_1px_2px_hsl(0_0%_100%/0.6)]">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => void load()}
          placeholder="Mau cari apa? (ban, oli, servis…)"
          aria-label="Cari ban, oli, atau servis"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground outline-none"
          enterKeyHint="search"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Hapus pencarian" className="-mr-2 flex h-9 w-9 items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {q.trim() && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-[55dvh] overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-xl">
          {loading ? (
            <p className="px-3 py-3 text-[13px] text-muted-foreground">Mencari…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-muted-foreground">Tidak ada hasil untuk “{q}”.</p>
          ) : (
            hits.map((h) => (
              <button key={`${h.kind}-${h.id}`} type="button" onClick={() => open(h)} className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted">
                {h.kind === "ban" ? <CircleDot className="h-4 w-4 shrink-0 text-primary" /> : <Wrench className="h-4 w-4 shrink-0 text-primary" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">{h.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{h.kind === "ban" ? "Ban" : "Jasa"} · {h.sub}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HomeCatalogSearch;
