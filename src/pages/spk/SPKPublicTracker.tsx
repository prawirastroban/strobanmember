// Live tracker publik SPK — mirror `PublicBookingTracker` untuk pengalaman
// tanpa login. Fetch via RPC `get_public_spk` (SECURITY DEFINER), auto-poll
// setiap 15 detik saat tab visible.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Loader2, ClipboardList, CheckCircle2, Wrench, UserCheck,
  MessageCircle, RefreshCw, ShieldAlert, FileText, Car,
} from "lucide-react";
import { describeEvent } from "@/lib/spk/eventLabels";
import { computeSpkFillProgress } from "@/lib/spk/spkProgress";
import { buildSpkDisplay } from "@/lib/spk/spkDisplayMap";

const SUPPORT_WA = "628973700800";

const STAGES = [
  { key: "draft", label: "Draft", icon: ClipboardList },
  { key: "awaiting_customer", label: "Persetujuan Customer", icon: UserCheck },
  { key: "in_progress", label: "Pengerjaan Mekanik", icon: Wrench },
  { key: "completed", label: "Selesai", icon: CheckCircle2 },
] as const;

function stageIndex(status: string | null | undefined): number {
  const s = (status || "").toLowerCase();
  if (s === "closed" || s === "completed" || s === "done") return 3;
  if (s === "in_progress" || s === "mechanic" || s === "pengerjaan" || s === "final_check") return 2;
  if (s === "awaiting_customer" || s === "customer_approval" || s === "awaiting_approval") return 1;
  return 0;
}

export default function SPKPublicTracker() {
  const { id } = useParams<{ id: string }>();
  const [spk, setSpk] = useState<any>(null);
  const [branch, setBranch] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpk = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc("get_public_spk", { p_id: id });
      if (error) throw error;
      if (!data) {
        setError("SPK tidak ditemukan atau link sudah tidak berlaku.");
        setSpk(null);
      } else {
        const payload = data as any;
        setSpk(payload.spk ?? null);
        setBranch(payload.branch ?? null);
        setTimeline(Array.isArray(payload.timeline) ? payload.timeline : []);
        setError(null);
      }
    } catch {
      setError("Tidak dapat memuat data SPK. Coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSpk();
    document.title = "Live Tracking SPK — Bengkel Mobil Stroban";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, [fetchSpk]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") fetchSpk();
    }, 15_000);
    return () => clearInterval(t);
  }, [fetchSpk]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !spk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Link Tidak Valid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error ?? "SPK tidak ditemukan."}</p>
            <Button asChild className="w-full">
              <a href={`https://wa.me/${SUPPORT_WA}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Hubungi Bengkel
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Ke Beranda</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const display = buildSpkDisplay(spk?.data ?? {});
  const currentIdx = stageIndex(spk.status);
  const progress = ((currentIdx + 1) / STAGES.length) * 100;
  const fill = computeSpkFillProgress(spk?.data);
  const isCompleted = currentIdx >= 3;

  const customerName = display.customer.find((i) => /nama|customer/i.test(i.label))?.value || "Pelanggan";
  const vehicleLabel = display.vehicle.map((i) => i.value).filter((v) => v && v !== "—").slice(0, 2).join(" • ");

  const openedAt = spk.opened_at || spk.created_at;
  const openedStr = openedAt ? new Date(openedAt).toLocaleString("id-ID") : "-";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="max-w-2xl mx-auto pt-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Live Tracking SPK</h1>
          <p className="text-sm text-muted-foreground">
            Pantau progres pengerjaan servis Anda secara langsung.
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate font-mono text-base">{spk.spk_number ?? "SPK"}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {customerName} • {vehicleLabel || "-"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {branch?.name ? `${branch.name} • ` : ""}Dibuka {openedStr}
                </p>
              </div>
              <Badge variant={isCompleted ? "default" : "secondary"}>
                {STAGES[currentIdx].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {Math.round(progress)}% tahap
              </p>
            </div>

            <div className="space-y-2">
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                const reached = i <= currentIdx;
                const active = i === currentIdx && !isCompleted;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-3 p-2 rounded-lg transition ${active ? "bg-primary/10" : ""}`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${reached ? "font-medium" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                    {active && (
                      <Badge variant="outline" className="ml-auto text-xs">Sekarang</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Progres Pemeriksaan Mekanik</span>
                </div>
                <span className="text-xs font-mono">
                  {fill.filled}/{fill.total} item
                </span>
              </div>
              <Progress value={fill.percent} className="h-2" />
              <p className="text-[11px] text-muted-foreground text-right">{fill.percent}% terisi</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Kendaraan</p>
                <p className="text-sm font-medium truncate">
                  <Car className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  {vehicleLabel || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cabang</p>
                <p className="text-sm font-medium truncate">{branch?.name || "-"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={fetchSpk} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button asChild size="sm">
                <Link to={`/spk/${spk.id}/print`}>
                  <FileText className="mr-2 h-4 w-4" /> Lembar SPK (PDF)
                </Link>
              </Button>
            </div>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <a
                href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(
                  `Halo, saya ingin tanya SPK ${spk.spk_number ?? ""}`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Hubungi Bengkel
              </a>
            </Button>
          </CardContent>
        </Card>

        {timeline.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Riwayat Aktivitas</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-xs">
                {timeline.slice().reverse().map((t: any) => (
                  <li key={t.id} className="flex gap-2 border-l-2 border-primary/40 pl-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("id-ID")}
                      </p>
                      <p className="text-foreground">
                        {describeEvent({ event_type: t.event_type, payload: t.meta ?? t.payload, title: t.title })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground">
          Halaman ini diperbarui otomatis setiap 15 detik.
          <br />
          <Link to="/auth" className="underline">Login</Link> untuk akses penuh riwayat servis Anda.
        </div>
      </div>
    </div>
  );
}