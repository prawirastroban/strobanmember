import type { TimelineValue } from "@/utils/timelineFilter";

export type ReportCategoryId =
  | "sales"
  | "finance"
  | "payments"
  | "customers"
  | "vehicles"
  | "loyalty"
  | "promos"
  | "operations";

export type ColumnAlign = "left" | "right" | "center";
export type ColumnFormat = "text" | "number" | "currency" | "date" | "datetime" | "percent";

export interface ReportColumn {
  key: string;
  label: string;
  format?: ColumnFormat;
  align?: ColumnAlign;
  total?: boolean; // sum into footer total row
  width?: number;  // px hint
}

export interface ReportKPI {
  label: string;
  value: string;
  hint?: string;
}

export interface ReportLoadParams {
  start: string; // YYYY-MM-DD
  end: string;
  branch?: string | null;
}

export interface ReportDefinition {
  id: string;
  category: ReportCategoryId;
  title: string;
  description: string;
  columns: ReportColumn[];
  load: (p: ReportLoadParams) => Promise<Record<string, any>[]>;
  kpis?: (rows: Record<string, any>[]) => ReportKPI[];
}

export interface CategoryMeta {
  id: ReportCategoryId;
  label: string;
  description: string;
  icon: string; // lucide name key (resolved in UI)
  sensitive?: boolean; // requires canManageFinancial
}

export type { TimelineValue };