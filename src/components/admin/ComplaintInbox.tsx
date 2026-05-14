import { useEffect, useState } from "react";
import { Loader2, MessageSquareWarning, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppUrl, handleWhatsAppNavigation } from "@/lib/whatsapp";

type Complaint = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  category: string;
  message: string;
  status: string;
  created_at: string;
  admin_note: string | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "new", label: "Baru" },
  { value: "in_progress", label: "Diproses" },
  { value: "resolved", label: "Selesai" },
];

const STATUS_COLOR: Record<string, string> = {
  new: "bg-red-500/10 text-red-600 border-red-500/30",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const ComplaintInbox = () => {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    let q: any = (supabase as any).from("customer_complaints").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data as Complaint[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("customer_complaints")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status diperbarui.");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquareWarning className="h-4 w-4 text-primary" />
          Pengaduan Pelanggan
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada pengaduan.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const waLink = c.phone ? buildWhatsAppUrl({ phone: c.phone }) : null;
            return (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium text-sm">{c.name} <span className="text-xs text-muted-foreground font-normal">· {c.category}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {c.phone && <span>{c.phone}</span>}
                        {c.phone && c.email && <span> · </span>}
                        {c.email && <span>{c.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={STATUS_COLOR[c.status] || ""}>{c.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3 border">{c.message}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Baru</SelectItem>
                        <SelectItem value="in_progress">Diproses</SelectItem>
                        <SelectItem value="resolved">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                    {waLink && (
                      <Button asChild size="sm" variant="outline">
                        <a href={waLink} onClick={(event) => handleWhatsAppNavigation(event, waLink)} target="_blank" rel="noopener noreferrer">
                          Balas via WA <ExternalLink className="h-3 w-3 ml-1.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComplaintInbox;