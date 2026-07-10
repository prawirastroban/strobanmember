// SPK Printable View — mirrors physical Stroban Service Report layout.
// Read-only, opens with window.print() ready styling.
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import AIHealthCard from "@/components/spk/AIHealthCard";

type SPK = any;

export default function SPKPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spk, setSpk] = useState<SPK | null>(null);
  const [branch, setBranch] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: s } = await supabase.from("spk_orders").select("*").eq("id", id).maybeSingle();
      setSpk(s);
      if (s?.branch_id) {
        const { data: br } = await supabase.from("branches").select("*").eq("id", s.branch_id).maybeSingle();
        setBranch(br);
      }
      const { data: tl } = await supabase
        .from("spk_timeline")
        .select("*")
        .eq("spk_id", id)
        .order("created_at", { ascending: true });
      setTimeline(tl ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!spk) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        SPK tidak ditemukan.
      </div>
    );
  }

  const d = (spk.data ?? {}) as any;

  return (
    <div className="min-h-screen bg-white text-black print:bg-white">
      {/* No-print header */}
      <div className="print:hidden sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-base font-bold">SPK {spk.spk_number}</h1>
          <Button size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Unduh / Cetak
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6 print:px-8 print:py-4 space-y-4">
        {/* Header block */}
        <div className="border-2 border-black/80 rounded-md p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">STROBAN SERVICE</h2>
              <p className="text-xs text-black/70">Surat Perintah Kerja / Service Report</p>
              {branch && (
                <p className="text-[11px] text-black/60 mt-0.5">Cabang: {branch.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-black/60">SPK No.</p>
              <p className="font-mono text-sm font-bold">{spk.spk_number}</p>
              <p className="text-[10px] mt-1">{new Date(spk.opened_at).toLocaleString("id-ID")}</p>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-black/40 rounded-md p-3">
            <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Pelanggan</p>
            <p className="text-sm font-semibold">{d.customer_name || "—"}</p>
            <p className="text-xs">{d.customer_phone || "—"}</p>
          </div>
          <div className="border border-black/40 rounded-md p-3">
            <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Kendaraan</p>
            <p className="text-sm font-semibold">
              {d.vehicle_merk} {d.vehicle_tipe} {d.vehicle_tahun ? `· ${d.vehicle_tahun}` : ""}
            </p>
            <p className="text-xs font-mono">{d.vehicle_plate || "—"}</p>
            {d.vehicle_mileage_now && (
              <p className="text-[11px] text-black/70 mt-0.5">Odometer: {d.vehicle_mileage_now} km</p>
            )}
          </div>
        </div>

        {/* Complaint */}
        <div className="border border-black/40 rounded-md p-3">
          <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Keluhan Pelanggan</p>
          <p className="text-sm whitespace-pre-wrap">{d.complaint_note || spk.notes || "—"}</p>
          {d.complaint_estimasi && (
            <p className="text-[11px] text-black/70 mt-1">Estimasi: {d.complaint_estimasi}</p>
          )}
        </div>

        {/* Status */}
        <div className="border border-black/40 rounded-md p-3">
          <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Status</p>
          <p className="text-sm font-semibold uppercase">{spk.status}</p>
          <p className="text-[11px]">Prioritas: {spk.priority}</p>
        </div>

        {/* AI Health */}
        <AIHealthCard spk={spk} readOnly print />

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="border border-black/40 rounded-md p-3">
            <p className="text-[10px] font-bold uppercase text-black/60 mb-2">Riwayat Timeline</p>
            <ol className="space-y-1 text-xs">
              {timeline.map((t) => (
                <li key={t.id} className="flex gap-2">
                  <span className="text-black/50 shrink-0">{new Date(t.created_at).toLocaleString("id-ID")}</span>
                  <span>{t.label || t.event_type}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-3 pt-6">
          {["Mekanik", "Kepala Bengkel", "Pelanggan"].map((role) => (
            <div key={role} className="text-center">
              <div className="h-16 border-b border-black/60" />
              <p className="mt-1 text-[10px] uppercase text-black/60">{role}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}