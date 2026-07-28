// Responsive data table: a real <table> from md up, stacked label/value
// cards below md. Same data, same order — presentation only.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { spkType, spkWrap } from "./spk-type";

export interface SpkColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  /** Percentage width used only in the desktop table (colgroup). */
  width?: string;
}

interface SpkDataTableProps<T> {
  columns: SpkColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** Title shown on top of each stacked mobile card. */
  cardTitle?: (row: T, index: number) => ReactNode;
  empty?: ReactNode;
  className?: string;
}

export function SpkDataTable<T>({
  columns,
  rows,
  rowKey,
  cardTitle,
  empty,
  className,
}: SpkDataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <div className={cn("py-6 text-center", spkType.meta, className)}>{empty}</div>;
  }

  return (
    <div className={cn("w-full max-w-full", className)}>
      {/* Desktop / tablet */}
      <div className="hidden w-full max-w-full overflow-x-auto md:block">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-border/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground",
                    spkType.label,
                    spkWrap,
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    (!c.align || c.align === "left") && "text-left",
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="border-b border-border/30 align-top">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-2 py-2 text-foreground",
                      spkType.value,
                      spkWrap,
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                  >
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            className="w-full max-w-full rounded-xl border border-border/60 bg-muted/20 p-3"
          >
            {cardTitle && (
              <div className={cn("mb-2 font-semibold text-foreground", spkType.heading, spkWrap)}>
                {cardTitle(row, i)}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {columns.map((c) => (
                <div key={c.key} className="flex w-full max-w-full flex-col gap-0.5">
                  <span
                    className={cn(
                      "uppercase tracking-wide text-muted-foreground",
                      spkType.label,
                      spkWrap,
                    )}
                  >
                    {c.header}
                  </span>
                  <div className={cn("text-foreground", spkType.value, spkWrap)}>
                    {c.cell(row, i)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}