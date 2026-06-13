import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";

const CATEGORY_META: Record<string, string> = {
  feature: "✨ Fitur Baru",
  fix: "🔧 Perbaikan",
  optimization: "⚡ Optimasi",
  bugfix: "🐞 Bug Fix",
  security: "🔒 Security",
  reporting: "📊 Reporting",
  pwa: "📱 PWA",
  notification: "🔔 Notification",
};

interface Release {
  id: string;
  version: string;
  released_at: string;
  title: string | null;
  summary: string | null;
  purpose: string | null;
  reason: string | null;
  impact: string | null;
  category: string[];
  affected_modules: string[];
  priority: string;
}

const UpdateCenter = () => {
  const [items, setItems] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_releases")
        .select("*")
        .eq("status", "published")
        .order("released_at", { ascending: false })
        .limit(50);
      setItems((data as Release[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Update Center</h1>
        </div>
        <p className="text-sm text-muted-foreground">Riwayat perubahan dan peningkatan aplikasi.</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Belum ada catatan rilis.</p>
        ) : items.map(r => (
          <Card key={r.id} className="border-white/10 bg-card/60 backdrop-blur-xl">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-bold">v{r.version}</span>
                {r.priority !== "normal" && <Badge variant="outline" className="text-[10px]">{r.priority}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {new Date(r.released_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              {r.title && <h2 className="text-lg font-semibold">{r.title}</h2>}
              {r.category?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.category.map(c => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {CATEGORY_META[c] ?? c}
                    </span>
                  ))}
                </div>
              )}
              {r.summary && <p className="text-sm whitespace-pre-wrap">{r.summary}</p>}
              {r.purpose && <DetailRow label="Tujuan" value={r.purpose} />}
              {r.reason && <DetailRow label="Alasan" value={r.reason} />}
              {r.impact && <DetailRow label="Dampak" value={r.impact} />}
              {r.affected_modules?.length > 0 && (
                <DetailRow label="Modul Terpengaruh" value={r.affected_modules.join(", ")} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="text-xs">
    <span className="font-medium text-foreground">{label}: </span>
    <span className="text-muted-foreground">{value}</span>
  </div>
);

export default UpdateCenter;