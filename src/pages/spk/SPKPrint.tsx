// SPK Printable View — Stroban Service Report, sinkron dengan Canvas via
// `buildSpkDisplay`. Item hasil pemeriksaan diwarnai (OK / Perlu Perhatian / N/A)
// dan PDF di-export via html2canvas + jsPDF.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AIHealthCard from "@/components/spk/AIHealthCard";
import {
  buildSpkDisplay,
  STATUS_PALETTE,
  type DisplayGroup,
  type DisplayItem,
  type KVGroup,
  type StatusToken,
} from "@/lib/spk/spkDisplayMap";

const BRAND = "#ff2b2b";

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
        .from("spk_timeline").select("*").eq("spk_id", id).order("created_at", { ascending: true });
      setTimeline(tl ?? []);
      setLoading(false);
    })();
  }, [id]);

  const display = useMemo(() => buildSpkDisplay(spk?.data), [spk?.data]);

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
        windowWidth: 794,
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
          <Button size="sm" onClick={downloadPdf} disabled={downloading} className="gap-1.5" style={{ background: BRAND }}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Unduh PDF
          </Button>
        </div>
      </div>

      <div
        ref={docRef}
        className="mx-auto bg-white my-4 shadow-sm"
        style={{ width: 794, maxWidth: "100%" }}
      >
        {/* Brand strip */}
        <div style={{ height: 6, background: BRAND }} />

        <div className="p-6 space-y-3">
          {/* Header */}
          <div className="rounded-md p-4" style={{ border: `2px solid ${BRAND}` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-tight" style={{ color: BRAND }}>STROBAN SERVICE</h2>
                <p className="text-xs text-black/70">Surat Perintah Kerja / Service Report</p>
                {branch && <p className="text-[11px] text-black/60 mt-0.5">Cabang: {branch.name}</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-black/60">SPK No.</p>
                <p className="font-mono text-sm font-bold">{spk.spk_number}</p>
                <p className="text-[10px] mt-1">
                  {new Date(spk.opened_at || spk.created_at).toLocaleString("id-ID")}
                </p>
                <StatusPill status={spk.status} />
              </div>
            </div>
          </div>

          {/* Customer & Vehicle */}
          <div className="grid grid-cols-2 gap-3">
            <KVCard title="Pelanggan" items={display.customer} />
            <KVCard title="Kendaraan" items={display.vehicle} />
          </div>

          {/* Complaint */}
          <SectionShell title="Keluhan Pelanggan">
            <p className="text-sm whitespace-pre-wrap">{display.complaint.note}</p>
            {(display.complaint.estimasi !== "—" || display.complaint.konfirmasi !== "—") && (
              <p className="text-[11px] text-black/70 mt-1">
                Estimasi: {display.complaint.estimasi} · Konfirmasi: {display.complaint.konfirmasi}
              </p>
            )}
          </SectionShell>

          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px]" style={{ paddingLeft: 4 }}>
            <span className="text-black/60 uppercase">Legenda:</span>
            {(["ok", "not", "na", "empty"] as StatusToken[]).map((t) => (
              <StatusChip key={t} status={t} />
            ))}
          </div>

          {/* Service order */}
          <KVGroupCard group={display.serviceOrder} />

          {/* Engine */}
          <GroupCard group={display.engine} />
          <div className="grid grid-cols-2 gap-3">
            <GroupCard group={display.lamps} compact />
            <GroupCard group={display.electrical} compact />
          </div>

          {/* Tyre */}
          <SectionShell title="Tyre Check">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {display.tyre.items.map((it) => <KVRow key={it.label} item={it} />)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {display.tyre.checks.map((c) => <InspRow key={c.label} item={c} />)}
            </div>
          </SectionShell>

          {/* AC */}
          <GroupCard group={display.ac} />

          {/* Suspension */}
          <GroupCard group={display.suspension} />

          {/* Mechanic note */}
          <SectionShell title="Catatan Mekanik">
            <p className="text-sm whitespace-pre-wrap min-h-[3em]">{display.mechanicNote}</p>
          </SectionShell>

          {/* Times */}
          <KVGroupCard group={display.workTimes} />

          <AIHealthCard spk={spk} readOnly print />

          {timeline.length > 0 && (
            <SectionShell title="Riwayat Timeline">
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
            </SectionShell>
          )}

          {display.revision.note && (
            <div className="rounded-md p-3" style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}>
              <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Catatan Revisi Customer</p>
              <p className="text-sm">{display.revision.note}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-3 pt-6">
            <SignatureBlock label="Admin / Sales Advisor" dataUrl={display.signatures.admin} accent="#64748B" />
            <SignatureBlock label="Customer" dataUrl={display.signatures.customer} accent={display.signatures.customer ? "#16A34A" : "#64748B"} />
            <SignatureBlock label="Mekanik — Final Check" dataUrl={display.signatures.qc} accent="#64748B" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md p-3" style={{ border: "1px solid rgba(0,0,0,0.15)", borderLeft: `3px solid ${BRAND}` }}>
      <p className="text-[10px] font-bold uppercase mb-2" style={{ color: BRAND }}>{title}</p>
      {children}
    </div>
  );
}

function KVCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <SectionShell title={title}>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline gap-2 border-b border-dashed border-black/15 pb-0.5">
            <span className="text-[10px] uppercase text-black/60 shrink-0 min-w-[90px]">{it.label}</span>
            <span className="text-xs font-medium break-words">{it.value}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function KVGroupCard({ group }: { group: KVGroup }) {
  return (
    <SectionShell title={group.title}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {group.items.map((it) => <KVRow key={it.label} item={it} />)}
      </div>
      {group.note && group.note !== "—" && (
        <p className="mt-2 text-[11px] text-black/70">Catatan: {group.note}</p>
      )}
    </SectionShell>
  );
}

function KVRow({ item }: { item: { label: string; value: string } }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dashed border-black/15 pb-0.5">
      <span className="text-[10px] uppercase text-black/60 shrink-0 min-w-[110px]">{item.label}</span>
      <span className="text-xs font-medium break-words">{item.value}</span>
    </div>
  );
}

function GroupCard({ group, compact = false }: { group: DisplayGroup; compact?: boolean }) {
  return (
    <SectionShell title={group.title}>
      <div className={compact ? "grid grid-cols-1 gap-1.5" : "grid grid-cols-2 gap-x-3 gap-y-1.5"}>
        {group.items.map((it) => <InspRow key={it.label} item={it} />)}
      </div>
      {group.note && group.note !== "—" && (
        <p className="mt-2 text-[11px] text-black/70">Catatan: {group.note}</p>
      )}
    </SectionShell>
  );
}

function InspRow({ item }: { item: DisplayItem }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded" style={{ background: "#FAFAFA" }}>
      <span className="text-[11px] text-black/80">{item.label}</span>
      <div className="flex items-center gap-1">
        {item.extra && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#E0E7FF", color: "#3730A3" }}>{item.extra}</span>
        )}
        <StatusChip status={item.status} />
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: StatusToken }) {
  const p = STATUS_PALETTE[status];
  return (
    <span
      className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
      style={{ background: p.bg, color: p.fg, border: `1px solid ${p.border}` }}
    >
      {p.label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
      style={{ background: BRAND, color: "#fff" }}
    >
      {status}
    </span>
  );
}

function SignatureBlock({ label, dataUrl, accent }: { label: string; dataUrl?: string | null; accent: string }) {
  return (
    <div className="text-center">
      <div
        className="h-16 flex items-end justify-center overflow-hidden rounded"
        style={{ borderBottom: `2px solid ${accent}` }}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={label} className="max-h-16 object-contain" crossOrigin="anonymous" />
        ) : null}
      </div>
      <p className="mt-1 text-[10px] uppercase font-semibold" style={{ color: accent }}>{label}</p>
    </div>
  );
}
