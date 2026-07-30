// Dialog Estimasi Pergantian Spareparts untuk card booking / faktur penjualan.
// UI identik dengan tab "Estimasi" di Canvas SPK Digital karena memakai
// komponen <EstimasiEditor /> yang sama. Sumber data tunggal ada di
// spk_orders.data (kunci estimasi_*), jadi perubahan dari sini langsung
// terlihat di Canvas SPK dan sebaliknya.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { EstimasiEditor, emptyEstimasiItem, type EstimasiItem } from "@/components/spk/canvas/v2/EstimasiEditor";
import { ESTIMASI_KEYS, computeEstimasiTotal, parseEstimasi } from "@/lib/spk/estimasi";
import { SPKService } from "@/services/spk/SPKService";
import type { SpkActor } from "@/services/spk/types";

export interface BookingEstimasiTarget {
  id: string;
  customer_name: string;
  service_name: string;
  service_price?: number | null;
}

interface Props {
  booking: BookingEstimasiTarget | null;
  onOpenChange: (open: boolean) => void;
  /** Dipanggil setelah simpan sukses agar card bisa memperbarui total. */
  onSaved?: (bookingId: string, total: number) => void;
}

const rp = (n: number) => `Rp ${Math.max(0, Math.round(n)).toLocaleString("id-ID")}`;

export default function BookingEstimasiDialog({ booking, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isStaff, isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spk, setSpk] = useState<{ id: string; spk_number: string } | null>(null);
  const [items, setItems] = useState<EstimasiItem[]>([emptyEstimasiItem()]);
  const [diskonJasa, setDiskonJasa] = useState(0);
  const [diskonSp, setDiskonSp] = useState(0);

  const open = !!booking;

  useEffect(() => {
    if (!booking) return;
    let cancelled = false;
    setLoading(true);
    setSpk(null);
    setItems([emptyEstimasiItem()]);
    setDiskonJasa(0);
    setDiskonSp(0);
    (async () => {
      const { data } = await supabase
        .from("spk_orders")
        .select("id, spk_number, data")
        .eq("booking_id", booking.id)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setSpk({ id: data.id, spk_number: data.spk_number });
        const snap = parseEstimasi(data.data);
        setItems(snap.items.length > 0 ? snap.items : [emptyEstimasiItem()]);
        setDiskonJasa(snap.diskonJasa);
        setDiskonSp(snap.diskonSparepart);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [booking?.id]);

  const total = computeEstimasiTotal({ items, diskonJasa, diskonSparepart: diskonSp });
  const servicePrice = Number(booking?.service_price ?? 0);

  const handleSave = async () => {
    if (!booking || saving) return;
    setSaving(true);
    try {
      let spkId = spk?.id ?? null;
      let spkNumber = spk?.spk_number ?? null;

      // Draft SPK dibuat lazy: hanya saat estimasi pertama kali disimpan.
      if (!spkId) {
        const actorRole: SpkActor = (isStaff || isAdmin ? "admin" : "admin_cabang") as SpkActor;
        const created = await SPKService.createFromBooking(booking.id, {
          actor: { user_id: user?.id ?? null, role: actorRole },
          occurred_at: new Date().toISOString(),
        });
        if (created.ok !== true) {
          toast({ variant: "destructive", title: "Gagal membuat draft SPK", description: created.error });
          setSaving(false);
          return;
        }
        spkId = created.data.id;
        spkNumber = created.data.spk_number;
        setSpk({ id: created.data.id, spk_number: created.data.spk_number });
      }

      // Read-modify-write: hanya kunci estimasi yang disentuh supaya hasil
      // kerja mekanik pada SPK tidak tertimpa.
      const { data: fresh, error: readErr } = await supabase
        .from("spk_orders")
        .select("data")
        .eq("id", spkId)
        .maybeSingle();
      if (readErr) throw new Error(readErr.message);

      const base = (fresh?.data && typeof fresh.data === "object" ? fresh.data : {}) as Record<string, unknown>;
      const nextData = {
        ...base,
        [ESTIMASI_KEYS.items]: items,
        [ESTIMASI_KEYS.diskonJasa]: diskonJasa,
        [ESTIMASI_KEYS.diskonSparepart]: diskonSp,
      };
      const { error: upErr } = await supabase
        .from("spk_orders")
        .update({ data: nextData as never })
        .eq("id", spkId);
      if (upErr) throw new Error(upErr.message);

      toast({
        title: "Estimasi tersimpan",
        description: `${spkNumber ?? "SPK"} • Total estimasi ${rp(total)}`,
      });
      onSaved?.(booking.id, total);
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan estimasi",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Estimasi Pergantian Spareparts
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>{booking?.customer_name} • {booking?.service_name}</span>
            {spk ? (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <FileText className="h-3 w-3" /> {spk.spk_number}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/40">
                Draft SPK dibuat otomatis saat disimpan
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <EstimasiEditor
            items={items}
            diskonJasa={diskonJasa}
            diskonSparepart={diskonSp}
            onItemsChange={setItems}
            onDiskonJasaChange={setDiskonJasa}
            onDiskonSparepartChange={setDiskonSp}
          />
        )}

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Harga servis booking</span>
            <span className="tabular-nums">{rp(servicePrice)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total estimasi</span>
            <span className="tabular-nums">{rp(total)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-dashed border-border/60 pt-1 font-semibold">
            <span>Total keseluruhan</span>
            <span className="tabular-nums">{rp(servicePrice + total)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {spk ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/spk/${spk.id}`} className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> Buka Canvas SPK
              </Link>
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Estimasi
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
