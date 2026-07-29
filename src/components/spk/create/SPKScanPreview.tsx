// Preview Card hasil OCR — semua field editable sebelum dipakai di form intake.
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OCR_FIELD_DEFS,
  OCR_GROUPS,
  normalizeOcrValue,
} from "@/lib/spk/ocrPrefill";

interface Props {
  values: Record<string, string>;
  lowConfidence: string[];
  checkCount: number;
  onChange: (key: string, value: string) => void;
}

export function SPKScanPreview({ values, lowConfidence, checkCount, onChange }: Props) {
  const low = new Set(lowConfidence);
  return (
    <div className="w-full max-w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[11px]">
          {Object.values(values).filter(Boolean).length} field terbaca
        </Badge>
        {checkCount > 0 && (
          <Badge variant="secondary" className="text-[11px]">{checkCount} checklist terbaca</Badge>
        )}
        {low.size > 0 && (
          <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 text-[11px]">
            <AlertTriangle className="h-3 w-3" /> {low.size} perlu dicek ulang
          </Badge>
        )}
      </div>

      {OCR_GROUPS.map((group) => {
        const defs = OCR_FIELD_DEFS.filter((d) => d.group === group);
        if (!defs.length) return null;
        return (
          <div key={group} className="rounded-xl border border-border/60 bg-card/60 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {defs.map((d) => {
                const isLow = low.has(d.key) && !!values[d.key];
                return (
                  <div
                    key={d.key}
                    className={cn("min-w-0 space-y-1.5", d.multiline && "sm:col-span-2")}
                  >
                    <Label htmlFor={`ocr-${d.key}`} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="break-words">{d.label}</span>
                      {isLow && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          <AlertTriangle className="h-2.5 w-2.5" /> cek ulang
                        </span>
                      )}
                    </Label>
                    {d.multiline ? (
                      <Textarea
                        id={`ocr-${d.key}`}
                        rows={2}
                        value={values[d.key] ?? ""}
                        onChange={(e) => onChange(d.key, e.target.value)}
                        className={cn("w-full resize-y text-sm", isLow && "border-amber-400 bg-amber-50/50")}
                      />
                    ) : (
                      <Input
                        id={`ocr-${d.key}`}
                        value={values[d.key] ?? ""}
                        onChange={(e) => onChange(d.key, e.target.value)}
                        onBlur={(e) => onChange(d.key, normalizeOcrValue(d.key, e.target.value))}
                        className={cn("h-10 w-full text-sm", isLow && "border-amber-400 bg-amber-50/50")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground">
        Field kosong tidak masalah — bisa dilengkapi di form berikutnya.
      </p>
    </div>
  );
}
