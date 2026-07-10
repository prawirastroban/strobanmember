import { useEffect, useState } from "react";
import SPKPlaceholderPanel from "./SPKPlaceholderPanel";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type Tpl = { id: string; code: string; name: string; is_active: boolean };

export default function SPKTemplateBuilderPage() {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("spk_form_templates")
        .select("id, code, name, is_active")
        .order("name");
      setRows((data ?? []) as Tpl[]);
      setLoading(false);
    })();
  }, []);

  return (
    <SPKPlaceholderPanel
      title="Template Builder"
      description="Skema form dinamis untuk SPK. Builder UI lengkap mengikuti Phase 4 SchemaBuilder."
      reuses="FormService + SchemaBuilder (spk_form_templates / spk_form_template_versions)"
    >
      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada template.</p>
      ) : (
        <div className="grid gap-2">
          {rows.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.code}</p>
                </div>
                <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px]">
                  {t.is_active ? "active" : "draft"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SPKPlaceholderPanel>
  );
}