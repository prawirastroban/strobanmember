import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, MapPin, Loader2, Save, Lock, Unlock, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const BRANCHES = [
  { id: "bandung", name: "Bandung" },
  { id: "tasikmalaya", name: "Tasikmalaya" },
  { id: "cirebon", name: "Cirebon" },
  { id: "yogyakarta", name: "Yogyakarta" },
];
const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const DEFAULT_CAPACITY = 3;

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
  const [branch, setBranch] = useState(BRANCHES[0].id);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branch, date]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`admin-slots-${branch}-${date}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_slots", filter: `branch=eq.${branch}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `branch=eq.${branch}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [branch, date]);

  const updateRow = (time: string, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r) => r.slot_time === time ? { ...r, ...patch, dirty: true } : r));

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
    return { total, used, closed };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Kapasitas Slot Booking</h2>
        <p className="text-sm text-muted-foreground">Atur kapasitas dan status slot per cabang & tanggal.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs"><MapPin className="inline h-3 w-3 mr-1" />Cabang</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs"><CalendarDays className="inline h-3 w-3 mr-1" />Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ringkasan</Label>
            <div className="flex gap-2 items-center text-xs h-10 px-3 rounded-md border bg-card">
              <Badge variant="secondary">{summary.used}/{summary.total} terpakai</Badge>
              {summary.closed > 0 && <Badge variant="destructive">{summary.closed} tutup</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Slot — {format(new Date(date), "dd MMM yyyy")}</CardTitle>
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
                return (
                  <div key={r.slot_time} className="flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-card">
                    <div className="w-16 font-mono text-sm font-semibold">{r.slot_time}</div>

                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Kap.</Label>
                      <Input
                        type="number" min={1} max={50}
                        value={r.max_capacity}
                        onChange={(e) => updateRow(r.slot_time, { max_capacity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="h-8 w-20 text-sm"
                      />
                    </div>

                    <Badge variant={pctFull ? "destructive" : "secondary"} className="text-[10px]">
                      {r.booked}/{r.max_capacity} booked
                    </Badge>

                    <Select value={r.status} onValueChange={(v: any) => updateRow(r.slot_time, { status: v })}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">🟢 Available</SelectItem>
                        <SelectItem value="full">🔴 Full</SelectItem>
                        <SelectItem value="closed">⛔ Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="ml-auto flex gap-1.5">
                      {r.status !== "closed" ? (
                        <Button variant="outline" size="sm" onClick={() => updateRow(r.slot_time, { status: "closed" })}>
                          <Lock className="h-3.5 w-3.5 mr-1" />Tutup
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => updateRow(r.slot_time, { status: "available" })}>
                          <Unlock className="h-3.5 w-3.5 mr-1" />Buka
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={!r.dirty || saving === r.slot_time}
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
