// SPK Workflow viewer — read-only over spk_workflow_definitions/transitions.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SPKPlaceholderPanel from "./SPKPlaceholderPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2 } from "lucide-react";

type Def = { id: string; code: string; name: string; is_active: boolean };
type Trans = {
  id: string;
  workflow_id: string;
  from_status: string;
  to_status: string;
  actor_role: string;
};

export default function SPKWorkflowViewer() {
  const [defs, setDefs] = useState<Def[]>([]);
  const [trans, setTrans] = useState<Trans[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: t }] = await Promise.all([
        supabase.from("spk_workflow_definitions").select("id, code, name, is_active"),
        supabase.from("spk_workflow_transitions").select("id, workflow_id, from_status, to_status, actor_role"),
      ]);
      setDefs((d ?? []) as Def[]);
      setTrans((t ?? []) as Trans[]);
      setLoading(false);
    })();
  }, []);

  return (
    <SPKPlaceholderPanel
      title="Workflow Definitions"
      description="Alur status SPK yang aktif. Diedit lewat migration; halaman ini presentasi saja."
      reuses="WorkflowEngine + spk_workflow_definitions/transitions"
    >
      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : (
        <div className="space-y-3">
          {defs.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{d.name}</p>
                  <Badge variant="outline" className="text-[10px]">{d.code}</Badge>
                  {!d.is_active && <Badge variant="secondary" className="text-[10px]">inactive</Badge>}
                </div>
                <ul className="space-y-1">
                  {trans.filter((t) => t.workflow_id === d.id).map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{t.from_status ?? "∅"}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px]">{t.to_status}</Badge>
                      <span className="text-muted-foreground ml-2">{t.actor_role}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SPKPlaceholderPanel>
  );
}