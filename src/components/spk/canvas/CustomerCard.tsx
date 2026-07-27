// Phase 5.3 — Customer Information (Nama, No HP, Platform).
import { User2, Phone, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { cn } from "@/lib/utils";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";

export function CustomerCard() {
  const section = useSectionBinding("customer");
  const [name, setName, nameMeta] = useBinding<string>("customer_name", "");
  const [phone, setPhone, phoneMeta] = useBinding<string>("customer_phone", "");
  const [platform, setPlatform, platformMeta] = useBinding<"iklan" | "organik" | null>(
    "customer_platform",
    null,
  );
  if (!section.visible) return null;
  return (
    <CanvasSection index={1} title="Customer Information" role="sa" required forceOpen id="sec-customer">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {nameMeta.visible && (
          <div className="min-w-0 space-y-1.5" data-field="customer_name">
            <FieldLabel required={nameMeta.required || true}>Nama Customer</FieldLabel>
            <div className="relative">
              <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={nameMeta.disabled}
                className={cn("h-11 pl-9", nameMeta.error && "border-primary")}
                aria-required
                aria-invalid={!!nameMeta.error}
              />
            </div>
            {nameMeta.error && <p className="text-[10px] text-primary">{nameMeta.error}</p>}
          </div>
          )}
          {phoneMeta.visible && (
          <div className="min-w-0 space-y-1.5" data-field="customer_phone">
            <FieldLabel required={phoneMeta.required || true}>No. HP</FieldLabel>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={phoneMeta.disabled}
                className={cn("h-11 pl-9", phoneMeta.error && "border-primary")}
                inputMode="tel"
                aria-required
                aria-invalid={!!phoneMeta.error}
              />
            </div>
            {phoneMeta.error && <p className="text-[10px] text-primary">{phoneMeta.error}</p>}
          </div>
          )}
        </div>
        {platformMeta.visible && (
        <div className="space-y-1.5" data-field="customer_platform">
          <FieldLabel>
            <span className="inline-flex items-center gap-1">
              <Megaphone className="h-3 w-3" /> Platform
            </span>
          </FieldLabel>
          <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
            {(["iklan", "organik"] as const).map((p) => (
              <button
                key={p}
                type="button"
                disabled={platformMeta.disabled}
                onClick={() => setPlatform(p)}
                className={cn(
                  "h-11 rounded-lg border px-2 text-sm font-medium leading-tight transition-colors",
                  platform === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                {p === "iklan" ? "Iklan / Sosmed" : "Organik"}
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </CanvasSection>
  );
}