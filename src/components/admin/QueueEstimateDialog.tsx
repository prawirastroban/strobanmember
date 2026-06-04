import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Loader2, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: {
    id: string;
    user_id?: string;
    booking_date: string;
    service_name: string;
    queue_estimated_start?: string | null;
    queue_note?: string | null;
  };
  onSaved: (next: { queue_estimated_start: string | null; queue_note: string | null; queue_set_at: string | null }) => void;
}

const toLocalTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const defaultTime = () => {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export default function QueueEstimateDialog({ open, onOpenChange, booking, onSaved }: Props) {
  const { toast } = useToast();
  const [time, setTime] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTime(toLocalTime(booking.queue_estimated_start) || defaultTime());
    setNote(booking.queue_note || "");
  }, [open, booking.queue_estimated_start, booking.queue_note]);

  const buildIso = (hhmm: string): string | null => {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h, m] = hhmm.split(":").map(Number);
    // Estimasi pada tanggal booking
    const [yy, mo, dd] = booking.booking_date.split("-").map(Number);
    const d = new Date(yy, (mo || 1) - 1, dd || 1, h, m, 0, 0);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleSave = async () => {
    const iso = buildIso(time);
    if (!iso) {
      toast({ variant: "destructive", title: "Format jam tidak valid", description: "Gunakan format HH:mm" });
      return;
    }
    if ((note || "").length > 280) {
      toast({ variant: "destructive", title: "Catatan terlalu panjang", description: "Maksimal 280 karakter" });
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const nowIso = new Date().toISOString();
    const cleanNote = note.trim() || null;

    const { error } = await supabase
      .from("bookings")
      .update({
        queue_estimated_start: iso,
        queue_note: cleanNote,
        queue_set_at: nowIso,
        queue_set_by: auth.user?.id ?? null,
      })
      .eq("id", booking.id);

    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Gagal menyimpan", description: error.message });
      return;
    }

    // Notify customer
    if (booking.user_id) {
      const hhmm = time;
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "Estimasi Pengerjaan Diperbarui",
        message:
          `Kendaraan Anda dalam antrian. Estimasi mulai dikerjakan pukul ${hhmm}` +
          (cleanNote ? ` — ${cleanNote}` : "."),
        type: "booking",
        metadata: {
          booking_id: booking.id,
          queue_estimated_start: iso,
          queue_note: cleanNote,
          redirect_to: `/booking/status/${booking.id}`,
        },
      });
    }

    // CRM activity log
    await supabase.from("activity_logs").insert({
      type: "booking",
      description: `Queue estimate set: ${time}${cleanNote ? ` — ${cleanNote}` : ""} (${booking.service_name})`,
      user_id: booking.user_id ?? null,
      metadata: {
        booking_id: booking.id,
        action: "queue_estimate_set",
        estimated_start: iso,
        note: cleanNote,
        set_by: auth.user?.id ?? null,
      },
    });

    setSaving(false);
    toast({ title: "Estimasi antrian disimpan", description: `Mulai dikerjakan pukul ${time}` });
    onSaved({ queue_estimated_start: iso, queue_note: cleanNote, queue_set_at: nowIso });
    onOpenChange(false);
  };

  const handleClear = async () => {
    setClearing(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("bookings")
      .update({
        queue_estimated_start: null,
        queue_note: null,
        queue_set_at: null,
        queue_set_by: null,
      })
      .eq("id", booking.id);

    if (error) {
      setClearing(false);
      toast({ variant: "destructive", title: "Gagal menghapus", description: error.message });
      return;
    }

    await supabase.from("activity_logs").insert({
      type: "booking",
      description: `Queue estimate cleared (${booking.service_name})`,
      user_id: booking.user_id ?? null,
      metadata: {
        booking_id: booking.id,
        action: "queue_estimate_cleared",
        cleared_by: auth.user?.id ?? null,
      },
    });

    setClearing(false);
    toast({ title: "Estimasi antrian dihapus" });
    onSaved({ queue_estimated_start: null, queue_note: null, queue_set_at: null });
    onOpenChange(false);
  };

  const hasExisting = !!booking.queue_estimated_start;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Estimasi Antrian
          </DialogTitle>
          <DialogDescription>
            Atur perkiraan jam kendaraan mulai dikerjakan. Pelanggan akan otomatis menerima notifikasi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estimasi Mulai Dikerjakan</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Tanggal mengikuti booking: {booking.booking_date}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Catatan Antrian <span className="opacity-60">(opsional, max 280)</span>
            </Label>
            <Textarea
              rows={3}
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: ada 2 mobil di depan, menunggu lift kosong."
            />
            <p className="text-[11px] text-muted-foreground text-right">{note.length}/280</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasExisting && (
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={clearing || saving}
              className="gap-2 text-destructive hover:text-destructive mr-auto"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || clearing}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || clearing} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}