import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { TIMELINE_PRESETS, type TimelineValue } from "@/utils/timelineFilter";
import type { FilterLogic } from "@/hooks/useFilterState";
import { X } from "lucide-react";

export interface MultiOption { label: string; value: string }
export interface AdvDropdown { key: string; label: string; value: string; options: MultiOption[]; onChange: (v: string) => void; disabled?: boolean }
export interface AdvMulti { key: string; label: string; value: string[]; options: MultiOption[]; onChange: (v: string[]) => void }
export interface AdvRange { key: string; label: string; value: [number | null, number | null]; onChange: (v: [number | null, number | null]) => void; prefix?: string }

export interface PresetItem { id: string; name: string }

export interface AdvancedFilterSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  timeline?: { value: TimelineValue; onChange: (v: TimelineValue) => void };
  dropdowns?: AdvDropdown[];
  multis?: AdvMulti[];
  ranges?: AdvRange[];
  logic?: FilterLogic;
  onLogicChange?: (v: FilterLogic) => void;
  presets?: PresetItem[];
  onApplyPreset?: (id: string) => void;
  onSavePreset?: (name: string) => Promise<void> | void;
  onDeletePreset?: (id: string) => Promise<void> | void;
  onReset?: () => void;
  extra?: ReactNode;
}

export default function AdvancedFilterSheet(props: AdvancedFilterSheetProps) {
  const {
    open, onOpenChange,
    timeline, dropdowns = [], multis = [], ranges = [],
    logic = "AND", onLogicChange,
    presets = [], onApplyPreset, onSavePreset, onDeletePreset,
    onReset, extra,
  } = props;
  const isMobile = useIsMobile();

  const handleSave = async () => {
    const name = window.prompt("Nama preset:");
    if (!name?.trim()) return;
    await onSavePreset?.(name.trim());
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "h-[88vh] rounded-t-2xl overflow-y-auto" : "w-[420px] sm:max-w-[420px] overflow-y-auto"}
      >
        <SheetHeader>
          <SheetTitle>Semua Filter</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Mode logika */}
          {onLogicChange && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mode kondisi</Label>
              <RadioGroup value={logic} onValueChange={(v) => onLogicChange(v as FilterLogic)} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="AND" /> Semua kondisi (AND)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="OR" /> Salah satu (OR)
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Periode */}
          {timeline && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Periode</Label>
              <Select
                value={timeline.value.preset}
                onValueChange={(v) => timeline.onChange({ ...timeline.value, preset: v as any })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMELINE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {timeline.value.preset === "custom" && (
                <div className="flex gap-2 items-center">
                  <Input type="date" className="h-9" value={timeline.value.startDate ?? ""}
                    onChange={(e) => timeline.onChange({ ...timeline.value, startDate: e.target.value })} />
                  <span className="text-xs text-muted-foreground">s/d</span>
                  <Input type="date" className="h-9" value={timeline.value.endDate ?? ""}
                    onChange={(e) => timeline.onChange({ ...timeline.value, endDate: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {/* Dropdowns */}
          {dropdowns.map((d) => (
            <div key={d.key} className="space-y-2">
              <Label className="text-xs text-muted-foreground">{d.label}</Label>
              <Select value={d.value} onValueChange={d.onChange} disabled={d.disabled}>
                <SelectTrigger className="h-9"><SelectValue placeholder={d.label} /></SelectTrigger>
                <SelectContent>
                  {d.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Multi-select */}
          {multis.map((m) => (
            <div key={m.key} className="space-y-2">
              <Label className="text-xs text-muted-foreground">{m.label}</Label>
              <div className="flex flex-wrap gap-1.5">
                {m.options.map((o) => {
                  const active = m.value.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        m.onChange(active ? m.value.filter((v) => v !== o.value) : [...m.value, o.value])
                      }
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        active
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                          : "bg-muted/40 border-border/60 text-foreground/80 hover:bg-muted/60"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Range */}
          {ranges.map((r) => (
            <div key={r.key} className="space-y-2">
              <Label className="text-xs text-muted-foreground">{r.label}</Label>
              <div className="flex gap-2 items-center">
                {r.prefix && <span className="text-xs text-muted-foreground">{r.prefix}</span>}
                <Input
                  type="number"
                  placeholder="min"
                  className="h-9"
                  value={r.value[0] ?? ""}
                  onChange={(e) =>
                    r.onChange([e.target.value === "" ? null : Number(e.target.value), r.value[1]])
                  }
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="max"
                  className="h-9"
                  value={r.value[1] ?? ""}
                  onChange={(e) =>
                    r.onChange([r.value[0], e.target.value === "" ? null : Number(e.target.value)])
                  }
                />
              </div>
            </div>
          ))}

          {extra}

          {/* Presets */}
          {(onSavePreset || presets.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Preset Tersimpan</Label>
                {onSavePreset && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave}>
                    Simpan Filter
                  </Button>
                )}
              </div>
              {presets.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada preset.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <Badge
                      key={p.id}
                      variant="secondary"
                      className="cursor-pointer gap-1 pl-2.5"
                      onClick={() => onApplyPreset?.(p.id)}
                    >
                      {p.name}
                      {onDeletePreset && (
                        <button
                          type="button"
                          aria-label="Hapus preset"
                          className="ml-1 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDeletePreset(p.id); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="gap-2 pt-2 border-t border-border/40">
          {onReset && (
            <Button variant="ghost" onClick={onReset} className="text-xs">Reset</Button>
          )}
          <Button onClick={() => onOpenChange(false)} className="text-xs">Terapkan</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}