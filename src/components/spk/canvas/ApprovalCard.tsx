// Phase 5.3 — Approval & Signature (Final Check + Technician / SA / Customer).
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { CanvasSection } from "./CanvasSection";
import { SignaturePad } from "./SignaturePad";
import { cn } from "@/lib/utils";

const CHECKS = [
  { key: "as_order", label: "Sudah Dikerjakan Sesuai Order" },
  { key: "clean", label: "Mobil Dalam Kondisi Bersih" },
];

export function ApprovalCard() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setChecks((s) => ({ ...s, [k]: !s[k] }));

  return (
    <CanvasSection index={12} title="Approval & Signature" role="qc">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Final Check
          </p>
          <div className="grid grid-cols-1 gap-2">
            {CHECKS.map((c) => {
              const on = !!checks[c.key];
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  className={cn(
                    "flex min-h-tap items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    on
                      ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md border",
                      on ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-muted/40",
                    )}
                  >
                    {on && <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  <span className="font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SignaturePad label="Technician" />
          <SignaturePad label="Sales Advisor" />
          <SignaturePad label="Customer" />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">Perhatian Warna Tugas:</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded-full bg-sky-500/70" /> Diisi Sales Advisor
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded-full bg-amber-500/80" /> Diisi Mekanik
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded-full bg-emerald-500/80" /> QC / Approval
          </span>
        </div>
      </div>
    </CanvasSection>
  );
}