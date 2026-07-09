// Phase 5.3 — Customer Information (Nama, No HP, Platform).
import { User2, Phone, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CanvasSection, FieldLabel } from "./CanvasSection";
import { cn } from "@/lib/utils";

interface CustomerCardProps {
  name: string;
  phone: string;
  platform: "iklan" | "organik" | null;
  onPlatformChange: (v: "iklan" | "organik") => void;
}

export function CustomerCard({ name, phone, platform, onPlatformChange }: CustomerCardProps) {
  return (
    <CanvasSection index={2} title="Customer Information" role="sa">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>Nama Customer</FieldLabel>
            <div className="relative">
              <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input defaultValue={name} className="h-11 pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>No. HP</FieldLabel>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input defaultValue={phone} className="h-11 pl-9" inputMode="tel" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>
            <span className="inline-flex items-center gap-1">
              <Megaphone className="h-3 w-3" /> Platform
            </span>
          </FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {(["iklan", "organik"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPlatformChange(p)}
                className={cn(
                  "h-11 rounded-lg border text-sm font-medium transition-colors",
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
      </div>
    </CanvasSection>
  );
}