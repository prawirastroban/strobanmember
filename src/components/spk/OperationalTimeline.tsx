// SPK Intelligence Suite — Operational Timeline
//
// Pure presentation over EXISTING spk_timeline rows (with fallback to raw events).
// Interprets each event through eventToStage() to render operational labels.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { eventToStage, stageLabel, describeEvent, STAGE_LABEL, type OperationalStage } from "@/lib/spk/eventLabels";

interface Props {
  spkId: string;
  compact?: boolean;
}

interface Row {
  id: string;
  event_type: string;
  occurred_at: string;
  actor_role: string | null;
  payload: unknown;
}

export default function OperationalTimeline({ spkId, compact }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("spk_events")
        .select("id, event_type, occurred_at, actor_role, payload")
        .eq("spk_id", spkId)
        .order("occurred_at", { ascending: true });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [spkId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat timeline…
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Belum ada aktivitas.</p>;
  }

  const items = rows.map((r) => {
    const stage: OperationalStage = eventToStage(r);
    return { ...r, stage, label: describeEvent(r) };
  });

  const formatGap = (ms: number): string => {
    if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} dtk`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)} mnt`;
    if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} jam`;
    return `${Math.round(ms / 86_400_000)} hari`;
  };

  const body = (
    <ol className="relative border-l border-border/60 ml-3 space-y-4">
      {items.map((it) => (
        <li key={it.id} className="pl-4 relative">
          <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-sm">{it.label}</p>
            {it.actor_role && (
              <Badge variant="outline" className="text-[10px]">{it.actor_role}</Badge>
            )}
            {it.stage === "other" && (
              <span className="text-[10px] text-muted-foreground">({it.event_type})</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(it.occurred_at).toLocaleString("id-ID")}
            {(() => {
              const idx = items.findIndex((x) => x.id === it.id);
              if (idx <= 0) return null;
              const prev = items[idx - 1];
              const gap = new Date(it.occurred_at).getTime() - new Date(prev.occurred_at).getTime();
              if (gap <= 0) return null;
              return <span className="ml-2 opacity-70">· {formatGap(gap)} setelah "{prev.label}"</span>;
            })()}
          </p>
        </li>
      ))}
    </ol>
  );

  if (compact) return body;

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Operational Timeline</CardTitle></CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export { STAGE_LABEL };
