import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  TimelineValue,
  TIMELINE_PRESETS,
  DEFAULT_TIMELINE,
  isTimelineDefault,
} from "@/utils/timelineFilter";

export type { TimelineValue } from "@/utils/timelineFilter";

export interface ChipFilter {
  key: string;
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

export interface DropdownFilter {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}

export interface RangeFilter {
  key: string;
  label: string;
  min?: number;
  max?: number;
  value: [number | null, number | null];
  onChange: (v: [number | null, number | null]) => void;
  prefix?: string;
  suffix?: string;
}

export interface FilterBarProps {
  search?: { placeholder: string; value: string; onChange: (v: string) => void };
  timeline?: { value: TimelineValue; onChange: (v: TimelineValue) => void; label?: string };
  chips?: ChipFilter[];
  dropdowns?: DropdownFilter[];
  rangeFilters?: RangeFilter[];
  onReset: () => void;
  resultCount?: number;
  hasActiveFilter?: boolean;
  collapsible?: boolean;
  exportButton?: React.ReactNode;
}

const FilterBar = ({
  search,
  timeline,
  chips,
  dropdowns,
  rangeFilters,
  onReset,
  resultCount,
  hasActiveFilter,
  collapsible = true,
  exportButton,
}: FilterBarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const showExpandedRows = !collapsible || !collapsed;

  // Auto-detect active filter if not provided
  const isActive = useMemo(() => {
    if (typeof hasActiveFilter === "boolean") return hasActiveFilter;
    if (search?.value) return true;
    if (timeline && !isTimelineDefault(timeline.value)) return true;
    if (chips?.some((c) => c.active && c.value !== "all")) return true;
    if (dropdowns?.some((d) => d.value !== "all")) return true;
    if (rangeFilters?.some((r) => r.value[0] !== null || r.value[1] !== null)) return true;
    return false;
  }, [hasActiveFilter, search, timeline, chips, dropdowns, rangeFilters]);

  return (
    <div
      className="w-full mb-3 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-3 box-border overflow-hidden"
      style={{ maxWidth: "100%" }}
    >
      {/* Row 1 — Search */}
      {search && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="search"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-full border border-border/60 bg-muted/40 text-[13px] outline-none focus:border-primary/50 focus:bg-background transition placeholder:text-muted-foreground/60"
              style={{ WebkitAppearance: "none" }}
            />
          </div>
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="shrink-0 h-9 px-3 rounded-lg border border-border/60 bg-muted/40 text-[11px] font-medium flex items-center gap-1 hover:bg-muted/60 transition whitespace-nowrap"
              aria-label={collapsed ? "Tampilkan filter" : "Sembunyikan filter"}
            >
              Filter {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
          )}
          {exportButton}
        </div>
      )}

      {/* Row 2 — Timeline presets */}
      {timeline && showExpandedRows && (
        <>
          <div
            className="mt-2 flex gap-1.5 overflow-x-auto flex-nowrap scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {timeline.label && (
              <span className="self-center text-[10px] text-muted-foreground/70 mr-1 shrink-0">
                {timeline.label}:
              </span>
            )}
            {TIMELINE_PRESETS.map((p) => {
              const active = timeline.value.preset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => timeline.onChange({ ...timeline.value, preset: p.value })}
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer ${
                    active
                      ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                      : "bg-muted/40 border-border/60 text-foreground/80 hover:bg-muted/60"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom date inputs */}
          {timeline.value.preset === "custom" && (
            <div className="mt-1.5 flex gap-1.5 items-center flex-nowrap">
              <input
                type="date"
                value={timeline.value.startDate ?? ""}
                onChange={(e) =>
                  timeline.onChange({ ...timeline.value, startDate: e.target.value })
                }
                className="flex-1 min-w-0 h-8 px-2 rounded-md border border-border/60 bg-muted/40 text-[12px] outline-none focus:border-primary/50"
                style={{ maxWidth: "calc(50% - 12px)" }}
              />
              <span className="text-[11px] text-muted-foreground shrink-0">s/d</span>
              <input
                type="date"
                value={timeline.value.endDate ?? ""}
                onChange={(e) =>
                  timeline.onChange({ ...timeline.value, endDate: e.target.value })
                }
                className="flex-1 min-w-0 h-8 px-2 rounded-md border border-border/60 bg-muted/40 text-[12px] outline-none focus:border-primary/50"
                style={{ maxWidth: "calc(50% - 12px)" }}
              />
            </div>
          )}
        </>
      )}

      {/* Row 3 — Chips */}
      {chips && chips.length > 0 && showExpandedRows && (
        <div
          className="mt-2 flex gap-1.5 overflow-x-auto flex-nowrap scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
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

      {/* Row 4 — Dropdowns */}
      {dropdowns && dropdowns.length > 0 && showExpandedRows && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {dropdowns.map((d) => (
            <div key={d.key} className="flex-1 min-w-[120px] max-w-full">
              <select
                value={d.value}
                onChange={(e) => d.onChange(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-border/60 bg-muted/40 text-[12px] outline-none focus:border-primary/50 cursor-pointer"
                aria-label={d.label}
              >
                {d.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {d.label}: {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Row 5 — Range filters */}
      {rangeFilters && rangeFilters.length > 0 && showExpandedRows && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {rangeFilters.map((r) => (
            <div key={r.key} className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] text-muted-foreground/80 shrink-0 whitespace-nowrap">
                {r.label}:
              </span>
              {r.prefix && <span className="text-[10px] text-muted-foreground shrink-0">{r.prefix}</span>}
              <input
                type="number"
                inputMode="numeric"
                placeholder="min"
                value={r.value[0] ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  r.onChange([v, r.value[1]]);
                }}
                className="w-[88px] min-w-0 h-8 px-2 rounded-md border border-border/60 bg-muted/40 text-[12px] outline-none focus:border-primary/50"
              />
              <span className="text-[11px] text-muted-foreground shrink-0">–</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="max"
                value={r.value[1] ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  r.onChange([r.value[0], v]);
                }}
                className="w-[88px] min-w-0 h-8 px-2 rounded-md border border-border/60 bg-muted/40 text-[12px] outline-none focus:border-primary/50"
              />
              {r.suffix && <span className="text-[10px] text-muted-foreground shrink-0">{r.suffix}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {(typeof resultCount === "number" || isActive) && (
        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          {typeof resultCount === "number" ? (
            <span className="text-[11px] text-muted-foreground truncate">
              {resultCount} hasil ditemukan
            </span>
          ) : (
            <span />
          )}
          {isActive && (
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 whitespace-nowrap text-[11px] font-medium text-primary hover:text-primary/80 transition flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Reset Filter
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;