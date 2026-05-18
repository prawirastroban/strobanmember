import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, MapPin, Loader2, Save, Lock, Unlock, X, Wand2, RotateCcw, CheckCheck, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useScopedBranches } from "@/hooks/useBranches";
import { isSameLocalDay, slotToMinutes, TIME_TICK_MS } from "@/lib/timeSlots";

const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const DEFAULT_CAPACITY = 3;
const CAPACITY_PRESETS = [2, 3, 5, 8];
const PAST_BUFFER_MIN = 60; // slot dianggap "lewat" setelah jam berjalan menyentuh jam berikutnya

type SlotRow = {
  id?: string;
  branch: string;
  slot_date: string;
  slot_time: string;
  max_capacity: number;
  status: "available" | "full" | "closed";
};

type RowState = SlotRow & { booked: number; dirty?: boolean };

export default function SlotsManager() {
  const { branches, isLocked } = useScopedBranches();
  const [branch, setBranch] = useState<string>("");
  useEffect(() => {
    if (!branch && branches.length) setBranch(branches[0].slug);
  }, [branches, branch]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkCapacity, setBulkCapacity] = useState<number>(DEFAULT_CAPACITY);
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isPastDate = date < todayStr;
  const isToday = date === todayStr;

  const isSlotPast = (slot_time: string) => {
    if (isPastDate) return true;
    if (!isToday) return false;
    if (!isSameLocalDay(date, now)) return false;
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= slotToMinutes(slot_time) + PAST_BUFFER_MIN;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        supabase.from("booking_slots").select("*").eq("branch", branch).eq("slot_date", date),
        supabase.from("bookings").select("booking_time").eq("branch", branch).eq("booking_date", date).neq("status", "cancelled"),
      ]);
      const slotMap = new Map<string, SlotRow>();
      (slotsRes.data ?? []).forEach((s: any) => slotMap.set(s.slot_time, s));
      const counts = new Map<string, number>();
      (bookingsRes.data ?? []).forEach((b: any) => counts.set(b.booking_time, (counts.get(b.booking_time) ?? 0) + 1));

      const next: RowState[] = TIME_SLOTS.map((t) => {
        const cfg = slotMap.get(t);
        const booked = counts.get(t) ?? 0;
        return {
          id: cfg?.id,
          branch, slot_date: date, slot_time: t,
          max_capacity: cfg?.max_capacity ?? DEFAULT_CAPACITY,
          status: (cfg?.status as any) ?? (booked >= (cfg?.max_capacity ?? DEFAULT_CAPACITY) ? "full" : "available"),
          booked,
        };
      });
      setRows(next);
      // Auto-close slot yang sudah lewat & belum closed
      const toClose = next.filter((r) => isSlotPast(r.slot_time) && r.status !== "closed");
      if (toClose.length > 0) {
        const payload = toClose.map((r) => ({
          branch: r.branch,
          slot_date: r.slot_date,
          slot_time: r.slot_time,
          max_capacity: r.max_capacity,
          status: "closed" as const,
        }));
        const { error } = await supabase
          .from("booking_slots")
          .upsert(payload, { onConflict: "branch,slot_date,slot_time" });
        if (!error) {
          setRows((prev) => prev.map((r) =>
            isSlotPast(r.slot_time) ? { ...r, status: "closed", dirty: false } : r
          ));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branch, date]);

  // Tick menit: jika slot baru saja lewat, auto-close & lock
  useEffect(() => {
    if (!isToday || rows.length === 0) return;
    const toClose = rows.filter((r) => isSlotPast(r.slot_time) && r.status !== "closed");
    if (toClose.length === 0) return;
    (async () => {
      const payload = toClose.map((r) => ({
        branch: r.branch,
        slot_date: r.slot_date,
        slot_time: r.slot_time,
        max_capacity: r.max_capacity,
        status: "closed" as const,
      }));
      await supabase
        .from("booking_slots")
        .upsert(payload, { onConflict: "branch,slot_date,slot_time" });
      setRows((prev) => prev.map((r) =>
        isSlotPast(r.slot_time) ? { ...r, status: "closed", dirty: false } : r
      ));
    })();
  }, [now]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`admin-slots-${branch}-${date}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_slots", filter: `branch=eq.${branch}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `branch=eq.${branch}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [branch, date]);

  const updateRow = (time: string, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r) =>
      r.slot_time === time && !isSlotPast(r.slot_time)
        ? { ...r, ...patch, dirty: true }
        : r
    ));

  const saveRow = async (row: RowState) => {
    setSaving(row.slot_time);
    try {
      const payload = {
        branch: row.branch,
        slot_date: row.slot_date,
        slot_time: row.slot_time,
        max_capacity: row.max_capacity,
        status: row.status,
      };
      const { error } = await supabase
        .from("booking_slots")
        .upsert(payload, { onConflict: "branch,slot_date,slot_time" });
      if (error) throw error;
      toast.success(`Slot ${row.slot_time} disimpan`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan slot");
    } finally {
      setSaving(null);
    }
  };

  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.max_capacity, 0);
    const used = rows.reduce((s, r) => s + r.booked, 0);
    const closed = rows.filter((r) => r.status === "closed").length;
    const available = rows
      .filter((r) => r.status !== "closed")
      .reduce((s, r) => s + Math.max(0, r.max_capacity - r.booked), 0);
    const dirtyCount = rows.filter((r) => r.dirty).length;
    return { total, used, closed, available, dirtyCount };
  }, [rows]);

  // ---------- Bulk actions ----------
  const applyCapacityToAll = (cap: number) => {
    setRows((prev) => prev.map((r) =>
      isSlotPast(r.slot_time) ? r : { ...r, max_capacity: cap, dirty: true }
    ));
    toast.info(`Kapasitas semua slot diset ke ${cap}. Klik "Simpan Semua" untuk menyimpan.`);
  };

  const setStatusForAll = (status: RowState["status"]) => {
    setRows((prev) => prev.map((r) =>
      isSlotPast(r.slot_time) ? r : { ...r, status, dirty: true }
    ));
    toast.info(`Status semua slot diset ke ${status}. Klik "Simpan Semua" untuk menyimpan.`);
  };

  const resetToDefault = () => {
    setRows((prev) => prev.map((r) =>
      isSlotPast(r.slot_time)
        ? r
        : { ...r, max_capacity: DEFAULT_CAPACITY, status: "available", dirty: true }
    ));
    toast.info("Reset ke default. Klik \"Simpan Semua\" untuk menyimpan.");
  };

  const copyFromYesterday = async () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const prevDate = format(d, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("booking_slots")
      .select("slot_time, max_capacity, status")
      .eq("branch", branch)
      .eq("slot_date", prevDate);
    if (error) { toast.error("Gagal memuat data kemarin"); return; }
    if (!data || data.length === 0) { toast.warning("Tidak ada konfigurasi di tanggal kemarin"); return; }
    const map = new Map(data.map((s: any) => [s.slot_time, s]));
    setRows((prev) => prev.map((r) => {
      const src = map.get(r.slot_time);
      if (!src || isSlotPast(r.slot_time)) return r;
      return { ...r, max_capacity: src.max_capacity, status: src.status as any, dirty: true };
    }));
    toast.success("Konfigurasi kemarin disalin. Klik \"Simpan Semua\".");
  };

  const saveAll = async () => {
    const dirty = rows.filter((r) => r.dirty);
    if (dirty.length === 0) { toast.info("Tidak ada perubahan"); return; }
    setBulkSaving(true);
    try {
      const payload = dirty.map((r) => ({
        branch: r.branch, slot_date: r.slot_date, slot_time: r.slot_time,
        max_capacity: r.max_capacity, status: r.status,
      }));
      const { error } = await supabase
        .from("booking_slots")
        .upsert(payload, { onConflict: "branch,slot_date,slot_time" });
      if (error) throw error;
      toast.success(`${dirty.length} slot disimpan`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Kapasitas Slot Booking</h2>
        <p className="text-sm text-muted-foreground">
          Atur berapa booking yang diterima per jam. Gunakan aksi cepat untuk menerapkan ke semua slot sekaligus.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs"><MapPin className="inline h-3 w-3 mr-1" />Cabang</Label>
            <Select value={branch} onValueChange={setBranch} disabled={isLocked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs"><CalendarDays className="inline h-3 w-3 mr-1" />Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-xl border bg-card">
          <div className="text-[11px] text-muted-foreground">Sisa tersedia</div>
          <div className="text-2xl font-bold text-green-600">{summary.available}</div>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="text-[11px] text-muted-foreground">Sudah dipesan</div>
          <div className="text-2xl font-bold">{summary.used}<span className="text-sm text-muted-foreground">/{summary.total}</span></div>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="text-[11px] text-muted-foreground">Slot ditutup</div>
          <div className="text-2xl font-bold text-red-600">{summary.closed}</div>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="text-[11px] text-muted-foreground">Belum disimpan</div>
          <div className="text-2xl font-bold text-amber-600">{summary.dirtyCount}</div>
        </div>
      </div>

      {/* Bulk actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Aksi Cepat (terapkan ke semua slot)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Set kapasitas semua:</Label>
            {CAPACITY_PRESETS.map((c) => (
              <Button key={c} size="sm" variant="outline" onClick={() => applyCapacityToAll(c)}>
                {c} slot/jam
              </Button>
            ))}
            <div className="flex items-center gap-1.5 ml-1">
              <Input
                type="number" min={1} max={50}
                value={bulkCapacity}
                onChange={(e) => setBulkCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 w-20 text-sm"
              />
              <Button size="sm" variant="secondary" onClick={() => applyCapacityToAll(bulkCapacity)}>
                Terapkan
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status semua:</Label>
            <Button size="sm" variant="outline" onClick={() => setStatusForAll("available")}>
              <Unlock className="h-3.5 w-3.5 mr-1" />Buka semua
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatusForAll("closed")}>
              <Lock className="h-3.5 w-3.5 mr-1" />Tutup semua
            </Button>
            <Button size="sm" variant="outline" onClick={copyFromYesterday}>
              <Copy className="h-3.5 w-3.5 mr-1" />Salin dari kemarin
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />Reset default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset ke default?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Semua slot akan dikembalikan ke kapasitas {DEFAULT_CAPACITY} dan status available. Belum tersimpan sampai Anda klik "Simpan Semua".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={resetToDefault}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              size="sm"
              className="ml-auto"
              disabled={summary.dirtyCount === 0 || bulkSaving}
              onClick={saveAll}
            >
              {bulkSaving
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Menyimpan…</>
                : <><CheckCheck className="h-3.5 w-3.5 mr-1" />Simpan Semua ({summary.dirtyCount})</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Slot — {format(new Date(date), "dd MMM yyyy")}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {rows.length} slot · klik angka untuk ubah kapasitas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat…
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => {
                const pctFull = r.booked >= r.max_capacity;
                const remaining = Math.max(0, r.max_capacity - r.booked);
                const isClosed = r.status === "closed";
                const isPast = isSlotPast(r.slot_time);
                return (
                  <div
                    key={r.slot_time}
                    className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-card transition ${
                      r.dirty ? "border-amber-400 ring-1 ring-amber-200" : ""
                    } ${isClosed ? "opacity-60" : ""} ${isPast ? "bg-muted/40" : ""}`}
                  >
                    <div className="w-16 font-mono text-sm font-semibold">{r.slot_time}</div>
                    {isPast && (
                      <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">
                        <Lock className="h-3 w-3 mr-1" />Lewat
                      </Badge>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Kap.</Label>
                      <Input
                        type="number" min={r.booked} max={50}
                        value={r.max_capacity}
                        onChange={(e) => updateRow(r.slot_time, {
                          max_capacity: Math.max(r.booked || 1, parseInt(e.target.value) || 1),
                        })}
                        disabled={isPast}
                        className="h-8 w-20 text-sm"
                      />
                    </div>

                    <Badge variant={pctFull ? "destructive" : "secondary"} className="text-[10px]">
                      {r.booked}/{r.max_capacity} booked
                    </Badge>
                    {!isClosed && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${remaining === 0 ? "text-red-600 border-red-300" : "text-green-700 border-green-300"}`}
                      >
                        Sisa {remaining}
                      </Badge>
                    )}

                    <Select
                      value={r.status}
                      onValueChange={(v: any) => updateRow(r.slot_time, { status: v })}
                      disabled={isPast}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">🟢 Available</SelectItem>
                        <SelectItem value="full">🔴 Full</SelectItem>
                        <SelectItem value="closed">⛔ Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="ml-auto flex gap-1.5">
                      {r.status !== "closed" ? (
                        <Button variant="outline" size="sm" disabled={isPast} onClick={() => updateRow(r.slot_time, { status: "closed" })}>
                          <Lock className="h-3.5 w-3.5 mr-1" />Tutup
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled={isPast} onClick={() => updateRow(r.slot_time, { status: "available" })}>
                          <Unlock className="h-3.5 w-3.5 mr-1" />Buka
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={!r.dirty || saving === r.slot_time || isPast}
                        onClick={() => saveRow(r)}
                      >
                        {saving === r.slot_time
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <><Save className="h-3.5 w-3.5 mr-1" />Simpan</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
