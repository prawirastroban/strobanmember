import { Card, CardContent } from "@/components/ui/card";
import type { ReportKPI } from "./types";

export default function ReportKPIStrip({ kpis }: { kpis: ReportKPI[] }) {
  if (!kpis?.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((k, i) => (
        <Card key={i} className="bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{k.value}</div>
            {k.hint && <div className="mt-1 text-xs text-muted-foreground">{k.hint}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}