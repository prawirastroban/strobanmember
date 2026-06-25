import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { resolveNotificationRoute } from "@/lib/notificationRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Check, Search, AlertTriangle, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { formatDistanceToNow } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Priority = "critical" | "high" | "medium" | "low";
type Category =
  | "booking" | "customer" | "operations" | "marketing"
  | "finance" | "reporting" | "system";

interface Row {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any> | null;
  priority: Priority;
  category: Category;
  action_url: string | null;
}

const PAGE = 30;

const priorityTone: Record<Priority, string> = {
  critical: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  high:     "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  medium:   "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  low:      "bg-muted text-muted-foreground border-border/60",
};

const TABS: { value: string; label: string }[] = [
  { value: "all",       label: "Semua" },
  { value: "unread",    label: "Belum dibaca" },
  { value: "critical",  label: "Kritis" },
  { value: "booking",   label: "Booking" },
  { value: "customer",  label: "Pelanggan" },
  { value: "operations",label: "Operasional" },
  { value: "marketing", label: "Marketing" },
  { value: "finance",   label: "Keuangan" },
  { value: "reporting", label: "Laporan" },
  { value: "system",    label: "Sistem" },
];

const NotificationCenter = () => {
  const { user } = useAuth();
  const { isAdminOrStaff } = useUserRole();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (reset = false) => {
    if (!user) return;
    setLoading(true);
    const from = reset ? 0 : page * PAGE;
    const to = from + PAGE - 1;
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id,title,message,type,is_read,created_at,metadata,priority,category,action_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);
    const list = (data as Row[]) || [];
    setRows(prev => (reset ? list : [...prev, ...list]));
    setHasMore(list.length === PAGE);
    setLoading(false);
  }, [user, page]);

  useEffect(() => { setPage(0); fetchPage(true); /* eslint-disable-next-line */ }, [user]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-center-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { setPage(0); fetchPage(true); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchPage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (tab === "unread" && r.is_read) return false;
      if (tab === "critical" && r.priority !== "critical") return false;
      if (!["all","unread","critical"].includes(tab) && r.category !== tab) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (q && !(r.title.toLowerCase().includes(q) || r.message.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, tab, search, priority]);

  const unreadCount = useMemo(() => rows.filter(r => !r.is_read).length, [rows]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
  };

  const markAllRead = async () => {
    if (!user) return;
    const ids = rows.filter(r => !r.is_read).map(r => r.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setRows(prev => prev.map(r => ({ ...r, is_read: true })));
  };

  const removeOne = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const open = (r: Row) => {
    if (!r.is_read) markRead(r.id);
    const target = r.action_url || resolveNotificationRoute(r, isAdminOrStaff);
    if (target) navigate(target);
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="container max-w-3xl py-10 text-center text-muted-foreground">
          Silakan masuk untuk melihat notifikasi.
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container max-w-4xl px-4 py-6 pb-28 md:pb-10 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Notification Center</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1">{unreadCount} belum dibaca</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <Check className="h-4 w-4 mr-1" /> Tandai semua dibaca
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul atau pesan…"
            className="pl-8 h-9"
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Prioritas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua prioritas</SelectItem>
            <SelectItem value="critical">Kritis</SelectItem>
            <SelectItem value="high">Tinggi</SelectItem>
            <SelectItem value="medium">Sedang</SelectItem>
            <SelectItem value="low">Rendah</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto justify-start gap-1">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading && rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Memuat…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi pada filter ini.
            </div>
          ) : (
            <ul className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/50 bg-card/40 backdrop-blur-xl">
              {filtered.map(r => (
                <li
                  key={r.id}
                  className={`group flex items-start gap-3 px-4 py-3 transition-colors ${!r.is_read ? "bg-primary/5" : ""}`}
                >
                  <button
                    onClick={() => open(r)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm ${!r.is_read ? "font-semibold" : "font-medium"} truncate`}>
                        {r.title}
                      </span>
                      <Badge variant="outline" className={`text-[10px] py-0 ${priorityTone[r.priority]}`}>
                        {r.priority}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {r.category}
                      </Badge>
                      {!r.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.message}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!r.is_read && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markRead(r.id)} title="Tandai dibaca">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeOne(r.id)} title="Hapus">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPage(p => p + 1); fetchPage(false); }}
              >
                Muat lebih banyak
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {tab === "critical" && filtered.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Notifikasi kritis selalu dikirim sebagai push, bahkan saat Anda sedang membuka halaman terkait.
        </div>
      )}
      </div>
    </>
  );
};

export default NotificationCenter;