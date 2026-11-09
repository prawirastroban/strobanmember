import { useEffect, useMemo, useRef, useState } from "react";
import { Disc3, Search } from "lucide-react";
import { ScrollHintRow } from "@/components/ui/scroll-hint-row";
import { availableRims, buildSuggestions, type TireSearchable } from "@/lib/tireSearch";

interface TireSmartSearchProps {
  value: string;
  onChange: (v: string) => void;
  tires: TireSearchable[];
  activeBrand: string | null;
  onBrandToggle: (brand: string) => void;
  activeRim: number | null;
  onRimToggle: (rim: number) => void;
}

const TireSmartSearch = ({
  value,
  onChange,
  tires,
  activeBrand,
  onBrandToggle,
  activeRim,
  onRimToggle,
}: TireSmartSearchProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(
    () => buildSuggestions(tires, value),
    [tires, value]
  );

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    tires.forEach((t) => t.brand && counts.set(t.brand, (counts.get(t.brand) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([b]) => b).slice(0, 8);
  }, [tires]);

  const rims = useMemo(() => availableRims(tires), [tires]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="space-y-2" ref={wrapRef}>
      <div className="relative">
        <Disc3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Merk / Ukuran / Rim — cth: Bridgestone 205/65 R15"
          className="tire-search-input w-full rounded-full pl-10 pr-4 h-11 text-base text-primary-foreground placeholder:text-primary-foreground/75 outline-none transition-colors"
          aria-label="Cari ban berdasarkan merk, ukuran, atau rim"
          autoComplete="off"
        />

        {open && suggestions.length > 0 && (
          <div className="tire-suggest absolute z-50 mt-2 w-full max-h-[50dvh] overflow-y-auto rounded-2xl bg-popover text-popover-foreground animate-fade-in">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 min-h-11 text-left text-[15px] text-popover-foreground border-b border-border/60 last:border-0 hover:bg-muted active:bg-muted transition-colors"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {(brands.length > 0 || rims.length > 0) && (
        <ScrollHintRow
          wrapperClassName="-mx-4"
          className="px-4 overflow-x-auto scrollbar-hide"
          aria-label="Filter cepat ban"
        >
          <div className="flex gap-2 min-w-max py-0.5">
            {brands.map((b) => {
              const active = activeBrand === b;
              return (
                <button
                  key={`brand-${b}`}
                  type="button"
                  onClick={() => onBrandToggle(b)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-primary-foreground text-primary"
                      : "tire-chip text-primary-foreground"
                  }`}
                >
                  {b}
                </button>
              );
            })}
            {rims.map((r) => {
              const active = activeRim === r;
              return (
                <button
                  key={`rim-${r}`}
                  type="button"
                  onClick={() => onRimToggle(r)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                    active
                      ? "bg-primary-foreground text-primary"
                      : "tire-chip text-primary-foreground"
                  }`}
                >
                  R{r}
                </button>
              );
            })}
          </div>
        </ScrollHintRow>
      )}
    </div>
  );
};

export default TireSmartSearch;
