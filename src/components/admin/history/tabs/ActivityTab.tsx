import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Log {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

export default function ActivityTab() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("activity_logs")
        .select("id,type,description,created_at")
        .order("created_at", { ascending: false })
        .limit(150);
      setRows((data || []) as Log[]);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Activity Timeline
          <Badge variant="outline" className="ml-auto text-xs">{rows.length} events</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Belum ada aktivitas tercatat</p>
        ) : (
          <ol className="relative border-l-2 border-border/60 ml-3 space-y-4">
            {rows.map((r) => (
              <li key={r.id} className="ml-4">
                <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                  <p className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy HH:mm")}</p>
                </div>
                <p className="text-sm">{r.description}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}