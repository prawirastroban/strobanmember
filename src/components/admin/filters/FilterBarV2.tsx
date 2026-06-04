import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdvancedFilterSheet, { type AdvancedFilterSheetProps } from "./AdvancedFilterSheet";

export interface QuickChip {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

export interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface FilterBarV2Props {
  search?: { placeholder: string; value: string; onChange: (v: string) => void };
  quickChips?: QuickChip[];
  activeChips?: ActiveChip[];
  resultCount?: number;
  isActive?: boolean;
  onReset: () => void;
  exportButton?: React.ReactNode;
  advanced?: Omit<AdvancedFilterSheetProps, "open" | "onOpenChange" | "onReset"> & {
    badge?: number;
  };
}

export default function FilterBarV2({
  search, quickChips = [], activeChips = [],
  resultCount, isActive, onReset, exportButton, advanced,
}: FilterBarV2Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="w-full mb-3 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-3 overflow-hidden">
      {/* Row 1: search + quick chips + advanced + reset */}
      <div className="flex items-center gap-2 min-w-0">
        {search && (
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="search"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-full border border-border/60 bg-muted/40 text-[13px] outline-none focus:border-primary/50 focus:bg-background transition placeholder:text-muted-foreground/60"
            />
          </div>
        )}
        {advanced && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Semua Filter
            {advanced.badge ? (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px]">
                {advanced.badge}
              </span>
            ) : null}
          </Button>
        )}
        {isActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 shrink-0 text-xs text-primary hover:text-primary"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        )}
        {exportButton}
      </div>

      {/* Row 2: quick chips */}
      {quickChips.length > 0 && (
        <div
          className="mt-2 flex gap-1.5 overflow-x-auto flex-nowrap scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {quickChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium border transition flex items-center gap-1 ${
                c.active
                  ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                  : "bg-muted/40 border-border/60 text-foreground/80 hover:bg-muted/60"
              }`}
            >
              {c.label}
              {typeof c.count === "number" && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-[14px] px-1 rounded-full bg-foreground/10 text-[9px]">
                  {c.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Active filter chips + result count */}
      {(activeChips.length > 0 || typeof resultCount === "number") && (
        <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2 flex-wrap">
          {activeChips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1 pl-2.5 text-[11px]">
              {c.label}
              <button
                type="button"
                aria-label={`Hapus ${c.label}`}
                className="ml-1 hover:text-destructive"
                onClick={c.onRemove}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {typeof resultCount === "number" && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              {resultCount} hasil
            </span>
          )}
        </div>
      )}

      {advanced && (
        <AdvancedFilterSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onReset={onReset}
          {...advanced}
        />
      )}
    </div>
  );
}