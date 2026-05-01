import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface ServiceLite {
  id: string;
  name: string;
  category: string;
}

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** Optional helper text under the label */
  hint?: string;
}

/**
 * Multi-select picker untuk memilih layanan spesifik. Dipakai di Promo & Reward
 * Manager agar admin bisa membatasi voucher ke 1+ layanan tertentu, bukan
 * hanya per kategori.
 */
const ServiceMultiPicker = ({ value, onChange, hint }: Props) => {
  const [services, setServices] = useState<ServiceLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id,name,category")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (!alive) return;
      setServices((data as ServiceLite[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  const filtered = q.trim()
    ? services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
    : services;

  return (
    <div className="grid gap-2">
      <Label>Berlaku untuk Layanan Spesifik (opsional)</Label>
      <p className="text-xs text-muted-foreground">
        {hint ||
          "Pilih satu atau lebih layanan agar voucher hanya berlaku di layanan tersebut. Biarkan kosong = tidak membatasi (gunakan kategori di atas)."}
      </p>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari layanan…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8 h-9"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {loading ? (
          <div className="p-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground text-center">
            Tidak ada layanan.
          </p>
        ) : (
          filtered.map((s) => {
            const checked = value.includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  checked ? "bg-primary/10" : "hover:bg-muted/40"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    checked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {s.category}
                </span>
              </button>
            );
          })
        )}
      </div>
      {value.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {value.length} layanan dipilih.{" "}
          <button
            type="button"
            onClick={() => onChange([])}
            className="underline hover:text-foreground"
          >
            Bersihkan
          </button>
        </p>
      )}
    </div>
  );
};

export default ServiceMultiPicker;