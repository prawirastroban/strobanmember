import { useEffect, useState } from "react";
import { Truck, MapPin, MessageCircle, Camera, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PICKUP_STATUS_FLOW, PICKUP_STATUS_LABEL } from "@/lib/pickupSettings";

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

  const openMaps = () => {
    const q = encodeURIComponent(booking.pickup_address || "");
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
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

  const save = async () => {
    setBusy(true);
    const patch: Record<string, any> = {
      pickup_status: status,
      pickup_odometer_start: odoStart ? parseInt(odoStart) : null,
      pickup_odometer_end: odoEnd ? parseInt(odoEnd) : null,
      pickup_handover_photos: photos,
    };
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    setBusy(false);
    if (error) { toast.error("Gagal menyimpan", { description: error.message }); return; }
    toast.success("Status pick-up diperbarui");
    setOpen(false);
    onUpdated?.();
  };

  return (
    <>
      <div className="flex flex-wrap gap-1 mt-1">
        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={openMaps}>
          <MapPin className="h-3 w-3" /> Maps
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={openWA}>
          <MessageCircle className="h-3 w-3" /> WA
        </Button>
        <Button size="sm" className="h-7 text-[11px] gap-1 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setOpen(true)}>
          <Truck className="h-3 w-3" /> Kelola Pick-up
        </Button>
        <span className="text-[10px] text-muted-foreground w-full">
          Status: <b className="text-foreground">{PICKUP_STATUS_LABEL[booking.pickup_status || "idle"] || "Belum Dijemput"}</b>
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-600" /> Kelola Pick-up Service
            </DialogTitle>
            <DialogDescription className="text-xs">
              {booking.customer_name} • {booking.pickup_distance_km ?? "-"} km
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Alamat Penjemputan</p>
              <p className="whitespace-pre-wrap">{booking.pickup_address || "-"}</p>
              <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-xs" onClick={openMaps}>
                Buka di Google Maps →
              </Button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Status Penjemputan</label>
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