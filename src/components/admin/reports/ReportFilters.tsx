import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TIMELINE_PRESETS, type TimelineValue } from "@/utils/timelineFilter";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  timeline: TimelineValue;
  onTimelineChange: (t: TimelineValue) => void;
  branch: string;
  onBranchChange: (b: string) => void;
}

export default function ReportFilters({ timeline, onTimelineChange, branch, onBranchChange }: Props) {
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("branches").select("name").eq("is_active", true).order("sort_order");
      setBranches((data || []).map((b: any) => b.name));
    })();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={timeline.preset} onValueChange={(v) => onTimelineChange({ preset: v as any })}>
        <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TIMELINE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {timeline.preset === "custom" && (
        <>
          <Input
            type="date"
            className="w-[150px] h-9"
            value={timeline.startDate || ""}
            onChange={(e) => onTimelineChange({ ...timeline, startDate: e.target.value })}
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="date"
            className="w-[150px] h-9"
            value={timeline.endDate || ""}
            onChange={(e) => onTimelineChange({ ...timeline, endDate: e.target.value })}
          />
        </>
      )}
      <Select value={branch} onValueChange={onBranchChange}>
        <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Cabang</SelectItem>
          {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}