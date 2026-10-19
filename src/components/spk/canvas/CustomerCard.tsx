// Customer + Vehicle + Waktu as one 3-column bordered table (paper style).
import { CanvasSection } from "./CanvasSection";
import { cn } from "@/lib/utils";
import { useBinding, useSectionBinding } from "@/hooks/spk/FormRuntimeProvider";

export function CustomerCard() {
  const section = useSectionBinding("customer");
  const [platform, setPlatform, platformMeta] = useBinding<"iklan" | "organik" | null>(
    "customer_platform",
    null,
  );
  if (!section.visible) return null;
  return (
    <CanvasSection index={1} title="Customer Information" role="sa" required forceOpen id="sec-customer">
      <span id="sec-vehicle" className="block scroll-mt-32" aria-hidden />
      <div className="grid grid-cols-1 overflow-hidden rounded-sm border border-foreground/70 sm:grid-flow-col sm:grid-cols-3 sm:grid-rows-3">
        <Cell code="customer_name" label="Customer" required />
        <Cell code="vehicle_plate" label="License Plate" required upper />
        <Cell code="customer_phone" label="Phone" required inputMode="tel" />
        <Cell code="vehicle_merk" label="Brand" required />
        <Cell code="vehicle_tipe" label="Type/Model" required />
        <Cell code="vehicle_tahun" label="Years" inputMode="numeric" />
        <Cell code="complaint_estimasi" label="Waktu Estimasi" placeholder="mis. 2 jam" />
        <Cell code="complaint_konfirmasi" label="Waktu Konfirmasi" placeholder="mis. 14:30" />
        <div className="hidden border-foreground/70 sm:block sm:border-l" />
      </div>

      <div className="mt-2 grid grid-cols-1 overflow-hidden rounded-sm border border-foreground/70 sm:grid-cols-3">
        <Cell code="vehicle_mileage_now" label="Mileage Now (km)" required inputMode="numeric" />
        <Cell code="vehicle_mileage_next" label="Mileage Next (km)" inputMode="numeric" />
        {platformMeta.visible && (
          <div className="flex min-h-[34px] items-center gap-2 border-foreground/70 px-2 py-1 sm:border-l" data-field="customer_platform">
            <span className="shrink-0 text-sm text-foreground">Platform :</span>
            {(["iklan", "organik"] as const).map((p) => (
              <button
                key={p}
                type="button"
                disabled={platformMeta.disabled}
                onClick={() => setPlatform(p)}
                className={cn(
                  "h-7 rounded-sm border px-2 text-xs font-medium",
                  platform === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {p === "iklan" ? "Iklan / Sosmed" : "Organik"}
              </button>
            ))}
          </div>
        )}
      </div>
    </CanvasSection>
  );
}

function Cell({
  code,
  label,
  required,
  upper,
  inputMode,
  placeholder,
}: {
  code: string;
  label: string;
  required?: boolean;
  upper?: boolean;
  inputMode?: "numeric" | "tel" | "text";
  placeholder?: string;
}) {
  const [value, setValue, meta] = useBinding<string>(code, "");
  if (!meta.visible) return null;
  const isReq = required || meta.required;
  return (
    <label
      data-field={code}
      className={cn(
        "flex min-h-[34px] min-w-0 items-center gap-1.5 border-b border-foreground/70 px-2 py-1 last:border-b-0 sm:[&:nth-child(3n)]:border-b-0",
        "sm:border-l sm:[&:nth-child(-n+3)]:border-l-0",
        meta.error && "bg-primary/5",
      )}
    >
      <span className="shrink-0 text-sm text-foreground">
        {label}
        {isReq && <span className="text-primary">*</span>} :
      </span>
      <input
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value)}
        disabled={meta.disabled}
        inputMode={inputMode}
        placeholder={meta.error || placeholder}
        aria-label={label}
        aria-required={isReq || undefined}
        aria-invalid={!!meta.error}
        className={cn(
          "h-7 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-muted/40",
          upper && "uppercase",
          meta.error && "placeholder:text-primary",
        )}
      />
    </label>
  );
}
