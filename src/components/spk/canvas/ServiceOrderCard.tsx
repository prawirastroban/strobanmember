// Phase 5.3 — Service Order (Oli, Service Umum, Others, Packages, AC Package, Bonus).
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { cn } from "@/lib/utils";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";
import { SignaturePadBound } from "./SignaturePadBound";
import { SkipToNextButton } from "./SkipToNextButton";
import {
  SERVICE_UMUM,
  PACKAGES_PETROL,
  PACKAGES_DIESEL,
  AC_PACKAGE,
  PackageGroup,
} from "./servicePackages";

export function ServiceOrderCard() {
  const section = useSectionBinding("service_order");
  const [oilBrand, setOilBrand] = useBinding<string>("service_oil_brand", "Shell Helix HX7 10W-40");
  const [checks, setChecks] = useBinding<Record<string, boolean>>("service_umum", {
    ganti_oli: true,
    oil_filter: true,
  });
  const [oilQty, setOilQty] = useBinding<string>("service_oil_qty", "4");
  const [tuneUp, setTuneUp] = useBinding<string | null>("service_tune_up", null);
  const [others, setOthers] = useBinding<string>("service_others", "");
  const [petrol, setPetrol] = useBinding<string | null>("service_pkg_petrol", "Silver");
  const [diesel, setDiesel] = useBinding<string | null>("service_pkg_diesel", null);
  const [acPkg, setAcPkg] = useBinding<string | null>("service_pkg_ac", null);
  const [bonus, setBonus] = useBinding<string>("service_bonus", "");

  const toggle = (k: string) => setChecks({ ...checks, [k]: !checks[k] });
  if (!section.visible) return null;

  return (
    <CanvasSection index={4} title="Service Order" role="sa" required id="sec-service-order">
      <div className="space-y-4">
        <div className="space-y-1.5" data-field="service_oil_brand">
          <FieldLabel>Merk / Jenis Oli</FieldLabel>
          <Input value={oilBrand} onChange={(e) => setOilBrand(e.target.value)} className="h-11" />
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

        <div className="space-y-1.5" data-field="service_others">
          <FieldLabel>Others Service</FieldLabel>
          <Textarea
            value={others}
            onChange={(e) => setOthers(e.target.value)}
            placeholder="Layanan tambahan di luar daftar…"
            className="min-h-[70px] resize-y bg-background"
          />
          <SkipToNextButton sectionId="sec-service-order" show={!others.trim()} />
        </div>

        <PackageGroup title="Service Packages — Petrol" options={PACKAGES_PETROL} value={petrol} onChange={setPetrol} />
        <PackageGroup title="Service Packages — Diesel" options={PACKAGES_DIESEL} value={diesel} onChange={setDiesel} />
        <PackageGroup title="AC Package" options={AC_PACKAGE} value={acPkg} onChange={setAcPkg} />

        <div className="space-y-1.5" data-field="service_bonus">
          <FieldLabel>Bonus</FieldLabel>
          <Input
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            placeholder="Bonus / promosi tambahan…"
            className="h-11"
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Persetujuan Awal
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SignaturePadBound code="signature_admin" label="Admin / Sales Advisor" />
            <SignaturePadBound code="signature_customer" label="Customer" />
          </div>
        </div>
      </div>
    </CanvasSection>
  );
}