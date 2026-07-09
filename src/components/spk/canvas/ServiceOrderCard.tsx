// Phase 5.3 — Service Order (Oli, Service Umum, Others, Packages, AC Package, Bonus).
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { cn } from "@/lib/utils";

const SERVICE_UMUM = [
  { key: "ganti_oli", label: "Ganti Oli", hasQty: true, qtyUnit: "L" },
  { key: "tune_up", label: "Tune Up", tuneUp: true },
  { key: "kaki_kaki", label: "Kaki-kaki" },
  { key: "spooring", label: "Spooring" },
  { key: "balancing", label: "Balancing" },
  { key: "oil_filter", label: "Oil Filter" },
  { key: "cuci_darah", label: "Cuci Darah Mobil" },
  { key: "service_ac", label: "Service AC" },
  { key: "brake_service", label: "Brake Service" },
  { key: "safety_check", label: "Safety Check" },
];

const PACKAGES_PETROL = ["Bronze", "Silver", "Gold", "Diamond", "Promo Khusus"];
const PACKAGES_DIESEL = ["Endurance", "Full Pow"];
const AC_PACKAGE = ["Polar", "Orca", "Small", "Medium", "Large"];

export function ServiceOrderCard() {
  const [checks, setChecks] = useState<Record<string, boolean>>({ ganti_oli: true, oil_filter: true });
  const [oilQty, setOilQty] = useState("4");
  const [tuneUp, setTuneUp] = useState<string | null>(null);
  const [petrol, setPetrol] = useState<string | null>("Silver");
  const [diesel, setDiesel] = useState<string | null>(null);
  const [acPkg, setAcPkg] = useState<string | null>(null);

  const toggle = (k: string) => setChecks((s) => ({ ...s, [k]: !s[k] }));

  return (
    <CanvasSection index={5} title="Service Order" role="sa">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Merk / Jenis Oli</FieldLabel>
          <Input defaultValue="Shell Helix HX7 10W-40" className="h-11" />
        </div>

        <div>
          <FieldLabel>Service Umum</FieldLabel>
          <ul className="mt-2 divide-y divide-border/50 overflow-hidden rounded-lg border border-border">
            {SERVICE_UMUM.map((s) => {
              const on = !!checks[s.key];
              return (
                <li key={s.key} className="flex items-center gap-3 bg-card px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => toggle(s.key)}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40",
                    )}
                    aria-pressed={on}
                  >
                    {on && (
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                        <path d="M7.629 13.233 4.4 10.004l-1.414 1.414 4.643 4.643 9.9-9.9-1.414-1.414z" />
                      </svg>
                    )}
                  </button>
                  <span className={cn("flex-1 text-sm", on ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                  {s.hasQty && on && (
                    <div className="flex items-center gap-1">
                      <Input
                        value={oilQty}
                        onChange={(e) => setOilQty(e.target.value)}
                        inputMode="decimal"
                        className="h-8 w-16 text-right"
                      />
                      <span className="text-xs text-muted-foreground">{s.qtyUnit}</span>
                    </div>
                  )}
                  {s.tuneUp && on && (
                    <div className="flex gap-1">
                      {["M", "P", "U"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTuneUp(tuneUp === t ? null : t)}
                          className={cn(
                            "h-8 w-8 rounded-md border text-xs font-bold",
                            tuneUp === t
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Others Service</FieldLabel>
          <Textarea placeholder="Layanan tambahan di luar daftar…" className="min-h-[70px] resize-y bg-background" />
        </div>

        <PackageGroup title="Service Packages — Petrol" options={PACKAGES_PETROL} value={petrol} onChange={setPetrol} />
        <PackageGroup title="Service Packages — Diesel" options={PACKAGES_DIESEL} value={diesel} onChange={setDiesel} />
        <PackageGroup title="AC Package" options={AC_PACKAGE} value={acPkg} onChange={setAcPkg} />

        <div className="space-y-1.5">
          <FieldLabel>Bonus</FieldLabel>
          <Input placeholder="Bonus / promosi tambahan…" className="h-11" />
        </div>
      </div>
    </CanvasSection>
  );
}

function PackageGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <FieldLabel>{title}</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? null : o)}
              className={cn(
                "min-h-tap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                on
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}