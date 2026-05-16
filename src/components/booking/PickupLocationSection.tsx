import { useEffect, useState } from "react";
import {
  Truck,
  Building2,
  MapPin,
  AlertCircle,
  Crosshair,
  Link2,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchPickupSettings,
  type PickupSettings,
  DEFAULT_PICKUP_SETTINGS,
} from "@/lib/pickupSettings";
import {
  fetchBranchesWithGeo,
  findNearestBranch,
  parseMapsLink,
  reverseGeocode,
  staticMapUrl,
  getBrowserLocation,
  type BranchGeo,
} from "@/lib/geoUtils";
import { toast } from "sonner";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export interface PickupValue {
  serviceLocation: "workshop" | "pickup";
  address: string;
  distanceKm: string; // keep as string for input handling
  withReturn: boolean;
  pickupFee: number;
  returnFee: number;
  isValid: boolean;
  enabled: boolean;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  source?: "gps" | "maps_link" | "manual" | null;
  nearestBranchId?: string | null;
  nearestBranchName?: string | null;
}

interface Props {
  value: PickupValue;
  onChange: (v: PickupValue) => void;
  compact?: boolean;
}

export const buildInitialPickupValue = (): PickupValue => ({
  serviceLocation: "workshop",
  address: "",
  distanceKm: "",
  withReturn: false,
  pickupFee: 0,
  returnFee: 0,
  isValid: true,
  enabled: true,
  lat: null,
  lng: null,
  accuracyM: null,
  source: null,
  nearestBranchId: null,
  nearestBranchName: null,
});

export default function PickupLocationSection({ value, onChange, compact }: Props) {
  const [settings, setSettings] = useState<PickupSettings>(DEFAULT_PICKUP_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [branches, setBranches] = useState<BranchGeo[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [manualKm, setManualKm] = useState(false);

  useEffect(() => {
    Promise.all([fetchPickupSettings(), fetchBranchesWithGeo()]).then(
      ([s, b]) => {
        setSettings(s);
        setBranches(b);
        setLoaded(true);
        onChange({ ...value, enabled: s.enabled });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<PickupValue>) => {
    const next = { ...value, ...patch };
    if (next.serviceLocation === "pickup") {
      next.pickupFee = settings.base_fee;
      next.returnFee = next.withReturn ? settings.return_fee : 0;
      const dist = parseFloat(next.distanceKm || "0");
      const distOK = !!next.distanceKm && !isNaN(dist) && dist > 0 && dist <= settings.max_distance_km;
      const hasCoords = typeof next.lat === "number" && typeof next.lng === "number";
      const addrOK = next.address.trim().length >= 10;
      // Valid jika: punya koordinat (GPS/link) ATAU alamat lengkap manual
      next.isValid = distOK && (hasCoords || addrOK);
    } else {
      next.pickupFee = 0;
      next.returnFee = 0;
      next.isValid = true;
      next.lat = null;
      next.lng = null;
      next.accuracyM = null;
      next.source = null;
      next.nearestBranchId = null;
      next.nearestBranchName = null;
    }
    onChange(next);
  };

  const applyCoords = async (
    lat: number,
    lng: number,
    source: "gps" | "maps_link",
    accuracyM?: number,
  ) => {
    const nearest = findNearestBranch({ lat, lng }, branches);
    const distanceKm = nearest ? nearest.distanceKm : 0;
    const patch: Partial<PickupValue> = {
      lat,
      lng,
      accuracyM: accuracyM ?? null,
      source,
      nearestBranchId: nearest?.branch.id ?? null,
      nearestBranchName: nearest?.branch.name ?? null,
      distanceKm: distanceKm ? String(distanceKm) : "",
    };
    update(patch);
    setManualKm(false);

    // Reverse geocode untuk auto-isi alamat (kalau kosong)
    if (!value.address || value.address.trim().length < 10) {
      const addr = await reverseGeocode(lat, lng);
      if (addr) update({ ...patch, address: addr.slice(0, 500) });
    }
  };

  const handleGps = async () => {
    setGpsLoading(true);
    try {
      const { lat, lng, accuracy } = await getBrowserLocation();
      await applyCoords(lat, lng, "gps", accuracy);
      toast.success("Lokasi berhasil dideteksi");
    } catch (err: any) {
      const msg =
        err?.code === 1
          ? "Izin lokasi ditolak. Aktifkan di pengaturan browser, atau tempel link Google Maps."
          : "Gagal mendapatkan lokasi. Coba tempel link Google Maps.";
      toast.error(msg);
      setShowLinkInput(true);
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePasteLink = () => {
    const parsed = parseMapsLink(linkInput);
    if (!parsed) {
      toast.error(
        "Link tidak dikenali. Buka Google Maps → Tap titik lokasi → Bagikan → Salin link, atau tempel format: -6.95,107.61",
      );
      return;
    }
    applyCoords(parsed.lat, parsed.lng, "maps_link");
    setLinkInput("");
    toast.success("Lokasi diset dari link");
  };

  const clearCoords = () => {
    update({
      lat: null,
      lng: null,
      accuracyM: null,
      source: null,
      nearestBranchId: null,
      nearestBranchName: null,
      distanceKm: "",
    });
    setManualKm(false);
  };

  if (loaded && !settings.enabled) return null;

  const isPickup = value.serviceLocation === "pickup";
  const dist = parseFloat(value.distanceKm || "0");
  const overLimit = isPickup && !!value.distanceKm && !isNaN(dist) && dist > settings.max_distance_km;
  const hasCoords = typeof value.lat === "number" && typeof value.lng === "number";

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-3 space-y-3", compact && "p-3")}>
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <MapPin className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-semibold leading-none">Lokasi Servis</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pilih datang ke bengkel atau dijemput dari lokasi Anda
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => update({ serviceLocation: "workshop" })}
          className={cn(
            "rounded-xl border p-3 text-left transition-all flex items-start gap-2",
            !isPickup
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border/60 hover:border-border bg-muted/20"
          )}
        >
          <Building2 className={cn("h-4 w-4 shrink-0 mt-0.5", !isPickup ? "text-primary" : "text-muted-foreground")} />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">Datang ke Bengkel</span>
            <span className="block text-[10.5px] text-muted-foreground leading-snug">Tanpa biaya tambahan</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => update({ serviceLocation: "pickup" })}
          className={cn(
            "rounded-xl border p-3 text-left transition-all flex items-start gap-2",
            isPickup
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border/60 hover:border-border bg-muted/20"
          )}
        >
          <Truck className={cn("h-4 w-4 shrink-0 mt-0.5", isPickup ? "text-primary" : "text-muted-foreground")} />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">Pick-up Service</span>
            <span className="block text-[10.5px] text-muted-foreground leading-snug">
              {formatIDR(settings.base_fee)} • max {settings.max_distance_km} km
            </span>
          </span>
        </button>
      </div>

      {/* Pickup details */}
      {isPickup && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* GPS / link card */}
          {!hasCoords ? (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleGps}
                disabled={gpsLoading}
                className="w-full h-11 gap-2 rounded-xl bg-primary text-primary-foreground"
              >
                {gpsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                {gpsLoading ? "Mendeteksi lokasi..." : "Pakai Lokasi Saya (GPS)"}
              </Button>
              <button
                type="button"
                onClick={() => setShowLinkInput((v) => !v)}
                className="w-full text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
              >
                <Link2 className="h-3 w-3" />
                {showLinkInput ? "Sembunyikan link" : "Atau tempel link Google Maps"}
              </button>
              {showLinkInput && (
                <div className="flex gap-2">
                  <Input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://maps.google.com/?q=-6.95,107.61"
                    className="h-10 rounded-xl text-[12px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePasteLink}
                    className="h-10 rounded-xl"
                  >
                    Pakai
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-[12px]">
                  <p className="font-semibold text-emerald-700 leading-tight">
                    Lokasi terdeteksi
                    {value.source === "gps" && value.accuracyM ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        • akurasi ~{value.accuracyM} m
                      </span>
                    ) : null}
                  </p>
                  {value.nearestBranchName && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      Cabang terdekat: <b className="text-foreground">{value.nearestBranchName}</b>
                      {value.distanceKm ? ` • ${value.distanceKm} km` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearCoords}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Hapus lokasi"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <img
                src={staticMapUrl({ lat: value.lat!, lng: value.lng! }, 480, 140, 15)}
                alt="Peta lokasi penjemputan"
                className="w-full h-[110px] object-cover rounded-lg border border-border/40"
                loading="lazy"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">
              {hasCoords
                ? "Patokan / detail tambahan (opsional)"
                : "Alamat lengkap penjemputan"}
            </label>
            <Textarea
              value={value.address}
              onChange={(e) => update({ address: e.target.value.slice(0, 500) })}
              placeholder={
                hasCoords
                  ? "Patokan: depan Indomaret, pagar hitam, dst."
                  : "Contoh: Jl. Merdeka No. 12, RT 03/04, Sukajadi, Bandung — patokan: depan Indomaret"
              }
              className="mt-1 min-h-[60px] resize-none text-[13px] rounded-xl bg-muted/30 border-border/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Jarak (km)
                </label>
                {hasCoords && !manualKm && (
                  <button
                    type="button"
                    onClick={() => setManualKm(true)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    edit
                  </button>
                )}
              </div>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={value.distanceKm}
                readOnly={hasCoords && !manualKm}
                onChange={(e) => update({ distanceKm: e.target.value })}
                placeholder="contoh: 8"
                className={cn(
                  "mt-1 h-10 rounded-xl text-[13px]",
                  overLimit && "border-destructive",
                  hasCoords && !manualKm && "bg-muted/40 cursor-default",
                )}
              />
            </div>
            <label className="flex items-end gap-2 cursor-pointer pb-0.5">
              <input
                type="checkbox"
                checked={value.withReturn}
                onChange={(e) => update({ withReturn: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-[12px] text-foreground leading-tight">
                Antar pulang setelah selesai
                <span className="block text-[10px] text-muted-foreground">
                  +{formatIDR(settings.return_fee)}
                </span>
              </span>
            </label>
          </div>

          {overLimit && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11.5px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Lokasi di luar area pick-up. Maksimum {settings.max_distance_km} km dari cabang.</span>
            </div>
          )}

          <div className="rounded-xl bg-muted/40 border border-border/40 p-2.5 text-[12px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya jemput</span>
              <span className="font-medium tabular-nums">{formatIDR(value.pickupFee)}</span>
            </div>
            {value.withReturn && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Biaya antar pulang</span>
                <span className="font-medium tabular-nums">{formatIDR(value.returnFee)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}