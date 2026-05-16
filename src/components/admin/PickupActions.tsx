import { useEffect, useState } from "react";
import {
  Truck,
  MapPin,
  MessageCircle,
  Camera,
  Loader2,
  Upload,
  X,
  ChevronDown,
  Navigation,
  PlayCircle,
  Home,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PICKUP_STATUS_FLOW, PICKUP_STATUS_LABEL } from "@/lib/pickupSettings";
import { logAdminAction } from "@/lib/auditLog";

export interface PickupBookingMini {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_location?: string | null;
  pickup_address?: string | null;
  pickup_distance_km?: number | null;
  pickup_status?: string | null;
  pickup_return?: boolean | null;
  pickup_odometer_start?: number | null;
  pickup_odometer_end?: number | null;
  pickup_handover_photos?: any;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
}

export function PickupBadge({ booking }: { booking: PickupBookingMini }) {
  if (booking.service_location !== "pickup") return null;
  return (
    <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 gap-1 text-[10px]">
      <Truck className="h-3 w-3" />
      {booking.pickup_return ? "Pick-up + Antar" : "Pick-up"}
    </Badge>
  );
}

export default function PickupActions({ booking, onUpdated }: { booking: PickupBookingMini; onUpdated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(booking.pickup_status || "idle");
  const [odoStart, setOdoStart] = useState<string>(booking.pickup_odometer_start?.toString() || "");
  const [odoEnd, setOdoEnd] = useState<string>(booking.pickup_odometer_end?.toString() || "");
  const [photos, setPhotos] = useState<string[]>(
    Array.isArray(booking.pickup_handover_photos) ? booking.pickup_handover_photos as string[] : []
  );
  const [busy, setBusy] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(booking.pickup_status || "idle");
      setOdoStart(booking.pickup_odometer_start?.toString() || "");
      setOdoEnd(booking.pickup_odometer_end?.toString() || "");
      setPhotos(Array.isArray(booking.pickup_handover_photos) ? booking.pickup_handover_photos as string[] : []);
    }
  }, [open, booking]);

  if (booking.service_location !== "pickup") return null;

  const hasCoords =
    typeof booking.pickup_lat === "number" && typeof booking.pickup_lng === "number";

  const openMaps = () => {
    if (hasCoords) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${booking.pickup_lat},${booking.pickup_lng}`,
        "_blank",
      );
      return;
    }
    const q = encodeURIComponent(booking.pickup_address || "");
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  const openRoute = () => {
    if (hasCoords) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${booking.pickup_lat},${booking.pickup_lng}&travelmode=driving`,
        "_blank",
      );
      return;
    }
    const q = encodeURIComponent(booking.pickup_address || "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`, "_blank");
  };

  const openWA = () => {
    const phone = (booking.customer_phone || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    if (!phone) { toast.error("Nomor customer kosong"); return; }
    const msg = encodeURIComponent(`Halo ${booking.customer_name}, kami dari Bengkel Stroban — terkait jadwal pick-up Anda.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files).slice(0, 8 - photos.length)) {
      const path = `${booking.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
      const { error } = await supabase.storage.from("pickup-handover").upload(path, file);
      if (error) { toast.error(`Upload gagal: ${error.message}`); continue; }
      const { data } = await supabase.storage.from("pickup-handover").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) newUrls.push(data.signedUrl);
    }
    setPhotos((p) => [...p, ...newUrls]);
    setUploading(false);
  };

  const removePhoto = (idx: number) => setPhotos((p) => p.filter((_, i) => i !== idx));

  /** Quick stage transition with audit log + auto timestamp. */
  const quickAdvance = async (
    nextStatus: string,
    timestampField: string | null,
    label: string,
  ) => {
    setQuickBusy(true);
    const before = { pickup_status: booking.pickup_status || "idle" };
    const patch: Record<string, any> = { pickup_status: nextStatus };
    if (timestampField) patch[timestampField] = new Date().toISOString();

    const { error } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", booking.id);
    setQuickBusy(false);
    if (error) {
      toast.error("Gagal update", { description: error.message });
      return;
    }
    await logAdminAction({
      action: "booking.pickup_status_change",
      targetId: booking.id,
      targetLabel: booking.customer_name,
      before,
      after: { pickup_status: nextStatus },
      metadata: { quick_action: label },
    });
    toast.success(label);
    onUpdated?.();
  };

  const save = async () => {
    setBusy(true);
    const before = {
      pickup_status: booking.pickup_status || "idle",
      pickup_odometer_start: booking.pickup_odometer_start ?? null,
      pickup_odometer_end: booking.pickup_odometer_end ?? null,
    };
    const patch: Record<string, any> = {
      pickup_status: status,
      pickup_odometer_start: odoStart ? parseInt(odoStart) : null,
      pickup_odometer_end: odoEnd ? parseInt(odoEnd) : null,
      pickup_handover_photos: photos,
    };
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) { toast.error("Gagal menyimpan", { description: error.message }); return; }
    await logAdminAction({
      action: "booking.pickup_detail_update",
      targetId: booking.id,
      targetLabel: booking.customer_name,
      before,
      after: {
        pickup_status: status,
        pickup_odometer_start: patch.pickup_odometer_start,
        pickup_odometer_end: patch.pickup_odometer_end,
      },
    });
    toast.success("Status pick-up diperbarui");
    setOpen(false);
    onUpdated?.();
  };

  // Tentukan tombol cepat berdasarkan stage saat ini
  const currentStage = booking.pickup_status || "idle";
  const renderQuickButtons = () => {
    if (currentStage === "idle") {
      return (
        <Button
          size="sm"
          disabled={quickBusy}
          onClick={() => quickAdvance("dispatched", "pickup_dispatched_at", "Driver berangkat menjemput")}
          className="h-8 text-[11px] gap-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {quickBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
          Berangkat Jemput
        </Button>
      );
    }
    if (["dispatched", "arrived", "car_picked"].includes(currentStage)) {
      return (
        <Button
          size="sm"
          disabled={quickBusy}
          onClick={() => quickAdvance("at_workshop", "pickup_at_workshop_at", "Mobil tiba di bengkel")}
          className="h-8 text-[11px] gap-1 bg-orange-600 hover:bg-orange-700 text-white"
        >
          {quickBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
          Mobil di Bengkel
        </Button>
      );
    }
    if (currentStage === "at_workshop") {
      return (
        <>
          {booking.pickup_return && (
            <Button
              size="sm"
              disabled={quickBusy}
              onClick={() => quickAdvance("returning", null, "Mengantar pulang")}
              className="h-8 text-[11px] gap-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Home className="h-3 w-3" /> Antar Pulang
            </Button>
          )}
          <Button
            size="sm"
            disabled={quickBusy}
            onClick={() => quickAdvance("returned", "pickup_returned_at", "Pick-up selesai")}
            className="h-8 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-3 w-3" /> Selesai
          </Button>
        </>
      );
    }
    if (currentStage === "returning") {
      return (
        <Button
          size="sm"
          disabled={quickBusy}
          onClick={() => quickAdvance("returned", "pickup_returned_at", "Selesai diantar")}
          className="h-8 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 className="h-3 w-3" /> Selesai Diantar
        </Button>
      );
    }
    // returned
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px]">
        ✓ Pick-up selesai
      </Badge>
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-1 mt-1">
        {/* Quick action utama */}
        {renderQuickButtons()}

        {/* Quick links */}
        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={openRoute}>
          <Navigation className="h-3 w-3" /> Rute
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={openWA}>
          <MessageCircle className="h-3 w-3" /> WA
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-muted-foreground" onClick={() => setOpen(true)}>
          <ChevronDown className="h-3 w-3" /> Detail
        </Button>

        <span className="text-[10px] text-muted-foreground w-full">
          Status: <b className="text-foreground">{PICKUP_STATUS_LABEL[currentStage] || "Belum Dijemput"}</b>
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-600" /> Detail Pick-up Service
            </DialogTitle>
            <DialogDescription className="text-xs">
              {booking.customer_name} • {booking.pickup_distance_km ?? "-"} km
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Alamat Penjemputan</p>
              <p className="whitespace-pre-wrap">{booking.pickup_address || "-"}</p>
              <div className="flex gap-3 mt-1">
                <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={openMaps}>
                  Buka di Maps →
                </Button>
                <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={openRoute}>
                  Navigasi rute →
                </Button>
              </div>
            </div>

            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-3 w-3" /> Pengaturan lanjutan (status manual, odometer, foto)
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status Penjemputan (manual)</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PICKUP_STATUS_FLOW.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Odometer saat dijemput (km)</label>
                    <Input type="number" inputMode="numeric" value={odoStart} onChange={(e) => setOdoStart(e.target.value)} placeholder="contoh: 45230" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Odometer saat dikembalikan (km)</label>
                    <Input type="number" inputMode="numeric" value={odoEnd} onChange={(e) => setOdoEnd(e.target.value)} placeholder="opsional" className="mt-1" />
                  </div>
                </div>

                <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Foto Serah-Terima ({photos.length}/8)
                </label>
                <label className="text-xs font-medium text-primary cursor-pointer inline-flex items-center gap-1">
                  <Upload className="h-3 w-3" /> {uploading ? "Mengunggah..." : "Tambah Foto"}
                  <input type="file" accept="image/*" multiple className="hidden" disabled={uploading || photos.length >= 8} onChange={(e) => handleUpload(e.target.files)} />
                </label>
              </div>
              {photos.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Belum ada foto.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="relative group rounded-md overflow-hidden border border-border">
                      <img src={url} alt={`Handover ${i + 1}`} className="w-full h-16 object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/70 text-white p-0.5 opacity-0 group-hover:opacity-100 transition">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={busy} className="gap-1 bg-purple-600 hover:bg-purple-700 text-white">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}