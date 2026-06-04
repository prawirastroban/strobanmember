import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Car, Phone, User as UserIcon, Wrench, Trash2, MessageSquare } from "lucide-react";
import { isActionNeeded, ACTION_BADGE_CLASS } from "@/lib/actionNeeded";
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";
import { DEFAULT_TIMELINE, type TimelineValue, getDateRange, isTimelineDefault } from "@/utils/timelineFilter";

interface Complaint {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_transmission: string | null;
  vehicle_mileage: number | null;
  vehicle_plate: string | null;
  complaint: string;
  ai_response: string | null;
  recommended_service_ids: string[] | null;
  status: string;
  staff_notes: string | null;
  created_at: string;
}

const STATUSES = [
  { value: "new", label: "Baru", className: "bg-primary/15 text-primary border-primary/30" },
  { value: "reviewed", label: "Ditinjau", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "contacted", label: "Dihubungi", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  { value: "resolved", label: "Selesai", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
];

const ComplaintsManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Complaint[]>([]);
  const [services, setServices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [onlyActionNeeded, setOnlyActionNeeded] = useState(false);
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [guestFilter, setGuestFilter] = useState<"all" | "guest" | "member">("all");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: complaints, error }, { data: svc }] = await Promise.all([
      supabase
        .from("vehicle_complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("services").select("id,name"),
    ]);
    if (error) {
      toast({ variant: "destructive", title: "Gagal memuat", description: error.message });
    } else {
      setItems((complaints ?? []) as any);
    }
    if (svc) {
      const map: Record<string, string> = {};
      svc.forEach((s: any) => { map[s.id] = s.name; });
      setServices(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("vehicle-complaints")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_complaints" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const list = items.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (onlyActionNeeded && !isActionNeeded("complaint", c)) return false;
      if (guestFilter === "guest" && c.user_id) return false;
      if (guestFilter === "member" && !c.user_id) return false;
      if (!isTimelineDefault(timeline)) {
        const { start, end } = getDateRange(timeline);
        const ts = new Date(c.created_at).getTime();
        if (start && ts < new Date(start + "T00:00:00").getTime()) return false;
        if (end && ts > new Date(end + "T23:59:59").getTime()) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.complaint.toLowerCase().includes(q) ||
        `${c.vehicle_brand} ${c.vehicle_model}`.toLowerCase().includes(q) ||
        (c.vehicle_plate ?? "").toLowerCase().includes(q) ||
        (c.customer_name ?? "").toLowerCase().includes(q) ||
        (c.customer_phone ?? "").toLowerCase().includes(q)
      );
    });
    // Sort action-needed (new) to top
    return list.slice().sort((a, b) => {
      const ap = isActionNeeded("complaint", a) ? 0 : 1;
      const bp = isActionNeeded("complaint", b) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, filter, search, onlyActionNeeded, guestFilter, timeline]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: items.length };
    STATUSES.forEach((s) => { base[s.value] = items.filter((i) => i.status === s.value).length; });
    return base;
  }, [items]);

  const resetAll = () => {
    setFilter("all"); setSearch(""); setOnlyActionNeeded(false);
    setGuestFilter("all"); setTimeline(DEFAULT_TIMELINE);
  };

  const quickChips: QuickChip[] = [
    { key: "action", label: "⚡ Perlu Aksi", active: onlyActionNeeded, onClick: () => setOnlyActionNeeded(!onlyActionNeeded), count: counts["new"] },
    ...STATUSES.map((s) => ({
      key: s.value, label: s.label, active: filter === s.value,
      onClick: () => setFilter(filter === s.value ? "all" : s.value),
      count: counts[s.value],
    })),
  ];
  const activeChips: ActiveChip[] = [];
  if (filter !== "all") activeChips.push({ key: "st", label: `Status: ${STATUSES.find((s) => s.value === filter)?.label || filter}`, onRemove: () => setFilter("all") });
  if (onlyActionNeeded) activeChips.push({ key: "act", label: "Perlu Aksi", onRemove: () => setOnlyActionNeeded(false) });
  if (guestFilter !== "all") activeChips.push({ key: "g", label: guestFilter === "guest" ? "Guest" : "Member", onRemove: () => setGuestFilter("all") });
  if (!isTimelineDefault(timeline)) activeChips.push({ key: "tl", label: `Periode: ${timeline.preset}`, onRemove: () => setTimeline(DEFAULT_TIMELINE) });
  const isActive = activeChips.length > 0 || !!search;

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("vehicle_complaints")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Gagal update", description: error.message });
      return;
    }
    toast({ title: "Status diperbarui" });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("vehicle_complaints")
      .update({ staff_notes: notesDraft })
      .eq("id", selected.id);
    setSavingNotes(false);
    if (error) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
      return;
    }
    toast({ title: "Catatan tersimpan" });
    setItems((prev) => prev.map((i) => (i.id === selected.id ? { ...i, staff_notes: notesDraft } : i)));
    setSelected({ ...selected, staff_notes: notesDraft });
  };

  const deleteOne = async (id: string) => {
    if (!confirm("Hapus keluhan ini?")) return;
    const { error } = await supabase.from("vehicle_complaints").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Gagal hapus", description: error.message });
      return;
    }
    toast({ title: "Terhapus" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const statusBadge = (s: string) => {
    const cfg = STATUSES.find((x) => x.value === s) ?? STATUSES[0];
    return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <FilterBarV2
        search={{ placeholder: "Cari keluhan, mobil, plat, nama, atau no HP...", value: search, onChange: setSearch }}
        quickChips={quickChips}
        activeChips={activeChips}
        resultCount={filtered.length}
        isActive={isActive}
        onReset={resetAll}
        advanced={{
          badge: activeChips.length,
          timeline: { value: timeline, onChange: setTimeline },
          dropdowns: [
            { key: "status", label: "Status", value: filter, onChange: setFilter, options: [
              { label: "Semua", value: "all" },
              ...STATUSES.map((s) => ({ label: s.label, value: s.value })),
            ]},
            { key: "guest", label: "Tipe Pelapor", value: guestFilter, onChange: (v) => setGuestFilter(v as any), options: [
              { label: "Semua", value: "all" },
              { label: "Member", value: "member" },
              { label: "Guest", value: "guest" },
            ]},
          ],
        }}
      />

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Belum ada keluhan kendaraan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => { setSelected(c); setNotesDraft(c.staff_notes ?? ""); }}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">
                      {c.vehicle_brand} {c.vehicle_model} {c.vehicle_year}
                    </span>
                    {c.vehicle_plate && (
                      <Badge variant="secondary" className="font-mono text-[10px]">{c.vehicle_plate}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(c.status)}
                    {isActionNeeded("complaint", c) && (
                      <span className={ACTION_BADGE_CLASS}>⚡ Perlu Aksi</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-foreground line-clamp-2">{c.complaint}</p>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                  {c.customer_name && (
                    <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{c.customer_name}</span>
                  )}
                  {c.customer_phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.customer_phone}</span>
                  )}
                  {!c.user_id && (
                    <Badge variant="outline" className="text-[10px]">Guest</Badge>
                  )}
                  {c.recommended_service_ids && c.recommended_service_ids.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {c.recommended_service_ids.length} rekomendasi
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Detail Keluhan Kendaraan
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Vehicle */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">KENDARAAN</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Brand:</span> {selected.vehicle_brand}</div>
                    <div><span className="text-muted-foreground">Model:</span> {selected.vehicle_model}</div>
                    <div><span className="text-muted-foreground">Tahun:</span> {selected.vehicle_year}</div>
                    <div><span className="text-muted-foreground">Transmisi:</span> {selected.vehicle_transmission ?? "-"}</div>
                    <div><span className="text-muted-foreground">Kilometer:</span> {selected.vehicle_mileage ? selected.vehicle_mileage.toLocaleString("id-ID") + " km" : "-"}</div>
                    <div><span className="text-muted-foreground">Plat:</span> {selected.vehicle_plate ?? "-"}</div>
                  </div>
                </section>

                {/* Customer */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">PELANGGAN</p>
                  <div className="text-sm space-y-1">
                    <div>Nama: {selected.customer_name ?? (selected.user_id ? "(member)" : "Guest")}</div>
                    <div>Telepon: {selected.customer_phone ?? "-"}</div>
                  </div>
                </section>

                {/* Complaint */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">KELUHAN</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{selected.complaint}</p>
                </section>

                {/* AI response */}
                {selected.ai_response && (
                  <section>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">RESPONS AI</p>
                    <p className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">{selected.ai_response}</p>
                  </section>
                )}

                {/* Recommended services */}
                {selected.recommended_service_ids && selected.recommended_service_ids.length > 0 && (
                  <section>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">REKOMENDASI LAYANAN</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.recommended_service_ids.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          <Wrench className="h-3 w-3" />
                          {services[id] ?? id}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

                {/* Status */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">STATUS</p>
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                {/* Staff notes */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">CATATAN STAFF</p>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Catatan internal, hasil follow-up, dll."
                    rows={3}
                  />
                  <Button size="sm" className="mt-2" onClick={saveNotes} disabled={savingNotes}>
                    {savingNotes && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                    Simpan Catatan
                  </Button>
                </section>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="destructive" size="sm" onClick={() => deleteOne(selected.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Hapus
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>Tutup</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintsManager;