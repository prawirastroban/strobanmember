// SPK Printable View — Stroban Service Report layout with client-side PDF export.
// Auto-generates a downloadable PDF via html2canvas + jsPDF (no browser print dialog).
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AIHealthCard from "@/components/spk/AIHealthCard";

const YN = (v: unknown) =>
  v === true || v === "true" || v === "ok" || v === "good"
    ? "OK"
    : v === false || v === "bad"
      ? "Bad"
      : v == null || v === ""
        ? "—"
        : String(v);
const F = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

export default function SPKPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spk, setSpk] = useState<any>(null);
  const [branch, setBranch] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

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

  const downloadPdf = async () => {
    if (!docRef.current || !spk) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageH = 297;
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`SPK-${spk.spk_number || spk.id}.pdf`);
      toast.success("PDF berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal membuat PDF", { description: e?.message ?? "Coba lagi" });
    } finally {
      setDownloading(false);
    }
  };

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
    <div className="min-h-screen bg-slate-100 text-black">
      <div className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
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
          <Button size="sm" onClick={downloadPdf} disabled={downloading} className="gap-1.5">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Unduh PDF
          </Button>
        </div>
      </div>

      <div
        ref={docRef}
        className="mx-auto bg-white p-6 my-4 shadow-sm space-y-3"
        style={{ width: 794, maxWidth: "100%" }}
      >
        {/* Header */}
        <div className="border-2 border-black/80 rounded-md p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">STROBAN SERVICE</h2>
              <p className="text-xs text-black/70">Surat Perintah Kerja / Service Report</p>
              {branch && <p className="text-[11px] text-black/60 mt-0.5">Cabang: {branch.name}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-black/60">SPK No.</p>
              <p className="font-mono text-sm font-bold">{spk.spk_number}</p>
              <p className="text-[10px] mt-1">
                {new Date(spk.opened_at || spk.created_at).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-black/40 rounded-md p-3">
            <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Pelanggan</p>
            <p className="text-sm font-semibold">{F(d.customer_name)}</p>
            <p className="text-xs">{F(d.customer_phone)}</p>
            {d.customer_platform && (
              <p className="text-[11px] text-black/60 mt-0.5">Platform: {F(d.customer_platform)}</p>
            )}
          </div>
          <div className="border border-black/40 rounded-md p-3">
            <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Kendaraan</p>
            <p className="text-sm font-semibold">
              {F(d.vehicle_merk)} {F(d.vehicle_tipe)}{" "}
              {d.vehicle_tahun ? `· ${d.vehicle_tahun}` : ""}
            </p>
            <p className="text-xs font-mono">{F(d.vehicle_plate)}</p>
            {d.vehicle_mileage_now && (
              <p className="text-[11px] text-black/70 mt-0.5">
                Odometer: {F(d.vehicle_mileage_now)} km · Next: {F(d.vehicle_mileage_next)} km
              </p>
            )}
          </div>
        </div>

        {/* Complaint */}
        <div className="border border-black/40 rounded-md p-3">
          <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Keluhan Pelanggan</p>
          <p className="text-sm whitespace-pre-wrap">{F(d.complaint_note || spk.notes)}</p>
          {(d.complaint_estimasi || d.complaint_konfirmasi) && (
            <p className="text-[11px] text-black/70 mt-1">
              Estimasi: {F(d.complaint_estimasi)} · Konfirmasi: {F(d.complaint_konfirmasi)}
            </p>
          )}
        </div>

        <Grid title="Order Sales Advisor">
          <Cell label="Oli Merek" value={F(d.service_oil_brand)} />
          <Cell label="Oli Qty (L)" value={F(d.service_oil_qty)} />
          <Cell label="Paket Service" value={F(d.service_package)} />
          <Cell label="Order Lainnya" value={F(d.service_extra)} />
        </Grid>

        <Grid title="Diagnostic Check — Engine">
          <Cell label="Air Filter" value={YN(d.engine_air_filter)} />
          <Cell label="Oil Filter" value={YN(d.engine_oil_filter)} />
          <Cell label="Fuel Filter" value={YN(d.engine_fuel_filter)} />
          <Cell label="Aki / Battery" value={YN(d.engine_battery)} />
          <Cell label="Radiator" value={YN(d.engine_radiator)} />
          <Cell label="V-Belt" value={YN(d.engine_vbelt)} />
          <Cell label="Timing Belt" value={YN(d.engine_timing_belt)} />
          <Cell label="Busi" value={YN(d.engine_busi)} />
          <Cell label="Lainnya" value={F(d.engine_service_lainnya)} full />
        </Grid>

        <Grid title="Tyre Check">
          <Cell label="Depan Kiri (FL)" value={F(d.tyre_fl_status)} />
          <Cell label="Depan Kanan (FR)" value={F(d.tyre_fr_status)} />
          <Cell label="Belakang Kiri (RL)" value={F(d.tyre_rl_status)} />
          <Cell label="Belakang Kanan (RR)" value={F(d.tyre_rr_status)} />
          <Cell label="Tekanan FL/FR" value={`${F(d.tyre_fl_psi)} / ${F(d.tyre_fr_psi)} psi`} />
          <Cell label="Tekanan RL/RR" value={`${F(d.tyre_rl_psi)} / ${F(d.tyre_rr_psi)} psi`} />
        </Grid>

        <Grid title="AC Check">
          <Cell label="Kompresor" value={YN(d.ac_compressor)} />
          <Cell label="Kondensor" value={YN(d.ac_condenser)} />
          <Cell label="Freon" value={F(d.ac_freon)} />
          <Cell label="Suhu Kabin" value={F(d.ac_temp)} />
          <Cell label="Catatan" value={F(d.ac_remarks)} full />
        </Grid>

        <Grid title="Suspension & Brake">
          <Cell label="Shock Depan" value={YN(d.insp_suspension_front)} />
          <Cell label="Shock Belakang" value={YN(d.insp_suspension_rear)} />
          <Cell label="Ball Joint" value={YN(d.insp_ball_joint)} />
          <Cell label="Tie Rod" value={YN(d.insp_tie_rod)} />
          <Cell label="Brake Depan" value={YN(d.insp_brake_front)} />
          <Cell label="Brake Belakang" value={YN(d.insp_brake_rear)} />
          <Cell label="Part Replacement" value={F(d.insp_suspension_part_replacement)} full />
        </Grid>

        <div className="border border-black/40 rounded-md p-3">
          <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Catatan Mekanik</p>
          <p className="text-sm whitespace-pre-wrap min-h-[3em]">{F(d.mechanic_note)}</p>
        </div>

        <Grid title="Waktu Pengerjaan">
          <Cell label="Mulai" value={F(d.time_start)} />
          <Cell label="Selesai" value={F(d.time_end)} />
          <Cell label="Durasi" value={F(d.time_duration)} />
          <Cell label="Mekanik" value={F(d.mechanic_name)} />
        </Grid>

        <div className="border border-black/40 rounded-md p-3">
          <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Status</p>
          <p className="text-sm font-semibold uppercase">{spk.status}</p>
          <p className="text-[11px]">Prioritas: {spk.priority}</p>
          <div className="mt-2 flex gap-3 text-[11px]">
            <span>✔ Sesuai Order: {d.approval_as_order ? "Ya" : "—"}</span>
            <span>✔ Bersih: {d.approval_clean ? "Ya" : "—"}</span>
          </div>
        </div>

        <AIHealthCard spk={spk} readOnly print />

        {timeline.length > 0 && (
          <div className="border border-black/40 rounded-md p-3">
            <p className="text-[10px] font-bold uppercase text-black/60 mb-2">Riwayat Timeline</p>
            <ol className="space-y-1 text-xs">
              {timeline.map((t) => (
                <li key={t.id} className="flex gap-2">
                  <span className="text-black/50 shrink-0">
                    {new Date(t.created_at).toLocaleString("id-ID")}
                  </span>
                  <span>{t.label || t.event_type}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Signatures — 3-flow: Admin → Customer → Mekanik QC */}
        <div className="grid grid-cols-3 gap-3 pt-6">
          <SignatureBlock label="Admin / Sales Advisor" dataUrl={d.signature_admin} />
          <SignatureBlock label="Customer" dataUrl={d.signature_customer} />
          <SignatureBlock label="Mekanik QC" dataUrl={d.signature_qc} />
        </div>
      </div>
    </div>
  );
}

function Grid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-black/40 rounded-md p-3">
      <p className="text-[10px] font-bold uppercase text-black/60 mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

function Cell({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div
      className={
        "flex items-baseline gap-2 border-b border-dashed border-black/20 pb-0.5 " +
        (full ? "col-span-2" : "")
      }
    >
      <span className="text-[10px] uppercase text-black/60 shrink-0 min-w-[110px]">{label}</span>
      <span className="text-xs font-medium text-black break-words">{value}</span>
    </div>
  );
}

function SignatureBlock({ label, dataUrl }: { label: string; dataUrl?: string | null }) {
  return (
    <div className="text-center">
      <div className="h-16 border-b border-black/60 flex items-end justify-center overflow-hidden">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={label}
            className="max-h-16 object-contain"
            crossOrigin="anonymous"
          />
        ) : null}
      </div>
      <p className="mt-1 text-[10px] uppercase text-black/60">{label}</p>
    </div>
  );
}