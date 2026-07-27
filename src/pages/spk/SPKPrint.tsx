// SPK Printable View — Stroban Service Report, sinkron dengan Canvas via
// `buildSpkDisplay`. Item hasil pemeriksaan diwarnai (OK / Perlu Perhatian / N/A)
// dan PDF di-export via html2canvas + jsPDF.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import AIHealthCard from "@/components/spk/AIHealthCard";
import { describeEvent } from "@/lib/spk/eventLabels";
import {
  buildSpkDisplay,
  STATUS_PALETTE,
  type DisplayGroup,
  type DisplayItem,
  type KVGroup,
  type StatusToken,
  type EstimasiDisplay,
} from "@/lib/spk/spkDisplayMap";

const BRAND = "#ff2b2b";

// A4 geometry — the document is authored at a fixed 794px width (=210mm @96dpi)
// and never reflows, so screen preview, browser print and the exported PDF are
// pixel-identical. On narrow viewports the whole sheet is scaled down visually.
const DOC_W = 794;
const PDF_MARGIN_MM = 8;
const CONTENT_W_MM = 210 - PDF_MARGIN_MM * 2;
const CONTENT_H_MM = 297 - PDF_MARGIN_MM * 2;
const PX_PER_MM = DOC_W / CONTENT_W_MM;
const PAGE_CSS_H = CONTENT_H_MM * PX_PER_MM;

const PRINT_CSS = `
@page { size: A4 portrait; margin: 8mm; }
@media print {
  html, body { background: #fff !important; }
  .spk-print-toolbar { display: none !important; }
  .spk-print-frame { height: auto !important; overflow: visible !important; }
  .spk-print-doc {
    transform: none !important;
    width: ${DOC_W}px !important;
    box-shadow: none !important;
    margin: 0 !important;
  }
  [data-pdf-block] { break-inside: avoid; page-break-inside: avoid; }
}
`;

export default function SPKPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const embed = sp.get("embed") === "1";
  const autoShare = sp.get("share") === "1";
  const bridge = sp.get("bridge") === "1";
  const [spk, setSpk] = useState<any>(null);
  const [branch, setBranch] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const autoShareDone = useRef(false);
  const docRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frameH, setFrameH] = useState<number | undefined>(undefined);

  // Fit the fixed-width A4 sheet inside any viewport without reflowing it.
  useEffect(() => {
    const recompute = () => {
      const frame = frameRef.current;
      const doc = docRef.current;
      if (!frame || !doc) return;
      const avail = frame.clientWidth;
      const next = Math.min(1, avail / DOC_W);
      setScale(next);
      setFrameH(doc.offsetHeight * next);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (frameRef.current) ro.observe(frameRef.current);
    if (docRef.current) ro.observe(docRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [loading, spk]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      // Publik: pakai RPC SECURITY DEFINER agar bisa dibuka tanpa login
      // (link/QR share). RPC hanya mengembalikan 1 SPK sesuai id.
      const { data, error } = await supabase.rpc("get_public_spk", { p_id: id });
      if (error || !data) {
        setSpk(null);
        setBranch(null);
        setTimeline([]);
      } else {
        const payload = data as any;
        setSpk(payload.spk ?? null);
        setBranch(payload.branch ?? null);
        setTimeline(Array.isArray(payload.timeline) ? payload.timeline : []);
      }
      setLoading(false);
    })();
  }, [id]);

  const display = useMemo(() => buildSpkDisplay(spk?.data), [spk?.data]);

  const buildPdfBlob = async (): Promise<{ blob: Blob; filename: string } | null> => {
    if (!docRef.current || !spk) return null;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const node = docRef.current;
    // Capture at true A4 pixel width — drop the fit-to-width preview scaling.
    const prevTransform = node.style.transform;
    node.style.transform = "none";
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: DOC_W,
      windowWidth: DOC_W,
    });

    // Element-aware pagination: never cut a card, table or signature in half.
    const docRect = node.getBoundingClientRect();
    const cssScale = docRect.width / DOC_W || 1;
    const docH = docRect.height / cssScale;
    const blocks = Array.from(node.querySelectorAll<HTMLElement>("[data-pdf-block]")).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        top: (r.top - docRect.top) / cssScale,
        bottom: (r.bottom - docRect.top) / cssScale,
      };
    });

    const canvasScale = canvas.width / DOC_W;
    const pdf = new jsPDF("p", "mm", "a4");
    node.style.transform = prevTransform;
    let start = 0;
    let first = true;
    let guard = 0;
    while (start < docH - 1 && guard++ < 60) {
      let end = Math.min(docH, start + PAGE_CSS_H);
      if (end < docH) {
        // If a block straddles the cut, move the cut up to that block's top.
        const straddling = blocks
          .filter((b) => b.top > start + 24 && b.top < end && b.bottom > end && b.bottom - b.top <= PAGE_CSS_H)
          .map((b) => b.top);
        if (straddling.length) end = Math.min(...straddling);
      }
      const sliceTop = Math.round(start * canvasScale);
      const sliceH = Math.max(1, Math.round((end - start) * canvasScale));
      const page = document.createElement("canvas");
      page.width = canvas.width;
      page.height = sliceH;
      const ctx = page.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, page.width, page.height);
        ctx.drawImage(canvas, 0, sliceTop, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      }
      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(
        page.toDataURL("image/png"),
        "PNG",
        PDF_MARGIN_MM,
        PDF_MARGIN_MM,
        CONTENT_W_MM,
        (end - start) / PX_PER_MM,
      );
      start = end;
    }
    const blob = pdf.output("blob") as Blob;
    const filename = `SPK-${spk.spk_number || spk.id}.pdf`;
    return { blob, filename };
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await buildPdfBlob();
      if (!res) return;
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal membuat PDF", { description: e?.message ?? "Coba lagi" });
    } finally {
      setDownloading(false);
    }
  };

  const sharePdf = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const res = await buildPdfBlob();
      if (!res) return;
      const file = new File([res.blob], res.filename, { type: "application/pdf" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      const shareData: ShareData = {
        files: [file],
        title: `SPK ${spk.spk_number ?? ""}`.trim(),
        text: `SPK ${spk.spk_number ?? ""} — Stroban Service`,
      };
      if (nav.canShare?.(shareData) && nav.share) {
        await nav.share(shareData);
        toast.success("PDF dibagikan");
      } else {
        // Fallback: unduh PDF + buka WhatsApp share dengan link publik
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        const link = `${window.location.origin}/spk/${spk.id}/print`;
        const waText = encodeURIComponent(
          `SPK ${spk.spk_number ?? ""} — Stroban Service\n${link}\n(Lampirkan PDF yang baru diunduh)`,
        );
        window.open(`https://wa.me/?text=${waText}`, "_blank", "noopener");
        toast.info("Web Share tidak tersedia — PDF diunduh & WhatsApp dibuka");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error("Gagal membagikan PDF", { description: e?.message ?? "Coba lagi" });
      }
    } finally {
      setSharing(false);
    }
  };

  // Auto-trigger share when dialog opens via `?share=1`.
  useEffect(() => {
    if (!autoShare || autoShareDone.current || loading || !spk) return;
    autoShareDone.current = true;
    // Delay a tick so the DOM (docRef) is fully painted.
    const t = window.setTimeout(() => { void sharePdf(); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShare, loading, spk]);

  // Bridge: parent (SPKViewDialog) can request share/download via postMessage.
  // Because the iframe is same-origin, user activation from the parent click
  // propagates and navigator.share works.
  useEffect(() => {
    if (!bridge) return;
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as { type?: string; action?: string } | null;
      if (!data || data.type !== "spk-print") return;
      if (data.action === "share") void sharePdf();
      else if (data.action === "download") void downloadPdf();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, spk]);

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
      <style>{PRINT_CSS}</style>
      {!embed && (
        <div className="spk-print-toolbar sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ml-2 shrink-0 rounded-full p-2 hover:bg-muted"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-sm font-bold sm:text-base">SPK {spk.spk_number}</h1>
            <Button
              size="sm"
              variant="outline"
              onClick={sharePdf}
              disabled={sharing || downloading}
              className="shrink-0 gap-1.5"
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden xs:inline sm:inline">Bagikan</span>
            </Button>
            <Button size="sm" onClick={downloadPdf} disabled={downloading || sharing} className="shrink-0 gap-1.5 text-white" style={{ background: BRAND }}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="whitespace-nowrap">Unduh PDF</span>
            </Button>
          </div>
        </div>
      )}

      {/* Fit-to-width frame: the sheet keeps its exact A4 pixel geometry and is
          only visually scaled, so screen == print == PDF. */}
      <div
        ref={frameRef}
        className="spk-print-frame mx-auto w-full overflow-hidden px-2 py-4 sm:px-4"
        style={{ height: frameH ? frameH + 32 : undefined, maxWidth: DOC_W + 32 }}
      >
        <div
          ref={docRef}
          className="spk-print-doc bg-white shadow-sm"
          style={{
            width: DOC_W,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
        {/* Brand strip */}
        <div style={{ height: 6, background: BRAND }} />

        <div className="p-6 space-y-3">
          {/* Header */}
          <div data-pdf-block className="rounded-md p-4" style={{ border: `2px solid ${BRAND}` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-tight" style={{ color: BRAND }}>STROBAN SERVICE</h2>
                <p className="text-xs text-black/70">Surat Perintah Kerja / Service Report</p>
                {branch && <p className="text-[11px] text-black/60 mt-0.5 truncate">Cabang: {branch.name}</p>}
              </div>
              <div className="text-right shrink-0 whitespace-nowrap">
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
          <div data-pdf-block className="grid grid-cols-2 gap-3 items-stretch">
            <KVCard title="Pelanggan" items={display.customer} />
            <KVCard title="Kendaraan" items={display.vehicle} />
          </div>

          {/* Complaint */}
          <SectionShell title="Keluhan Pelanggan" block>
            <p className="text-sm whitespace-pre-wrap">{display.complaint.note}</p>
            {(display.complaint.estimasi !== "—" || display.complaint.konfirmasi !== "—") && (
              <p className="text-[11px] text-black/70 mt-1">
                Estimasi: {display.complaint.estimasi} · Konfirmasi: {display.complaint.konfirmasi}
              </p>
            )}
          </SectionShell>

          {/* Legend */}
          <div data-pdf-block className="flex flex-wrap items-center gap-2 text-[10px]" style={{ paddingLeft: 4 }}>
            <span className="text-black/60 uppercase">Legenda:</span>
            {(["ok", "warn", "not", "na"] as StatusToken[]).map((t) => (
              <StatusChip key={t} status={t} />
            ))}
          </div>

          {/* Service order */}
          <KVGroupCard group={display.serviceOrder} />

          {/* Engine */}
          <GroupCard group={display.engine} />
          <div className="grid grid-cols-2 gap-3 items-stretch">
            <GroupCard group={display.lamps} compact />
            <GroupCard group={display.electrical} compact />
          </div>

          {/* Tyre */}
          <SectionShell title="Tyre Check" block>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {display.tyre.items.map((it) => <KVRow key={it.label} item={it} />)}
            </div>
            <div className="grid grid-cols-2 gap-2 auto-rows-fr items-stretch">
              {display.tyre.checks.map((c) => <InspRow key={c.label} item={c} />)}
            </div>
          </SectionShell>

          {/* AC */}
          <GroupCard group={display.ac} />

          {/* Suspension */}
          <GroupCard group={display.suspension} />

          {/* Estimasi Pergantian Spareparts */}
          {(display.estimasi.items.length > 0 || display.estimasi.subtotal > 0) && (
            <EstimasiCard est={display.estimasi} />
          )}

          {/* Mechanic note */}
          <SectionShell title="Catatan Mekanik" block>
            <p className="text-sm whitespace-pre-wrap break-words min-h-[3em]">{display.mechanicNote}</p>
          </SectionShell>

          {/* Times */}
          <KVGroupCard group={display.workTimes} />

          <div data-pdf-block>
            <AIHealthCard spk={spk} readOnly print />
          </div>

          {timeline.length > 0 && (
            <SectionShell title="Riwayat Timeline" block>
              <ol className="space-y-1 text-xs">
                {timeline.map((t) => (
                  <li key={t.id} className="flex gap-2">
                    <span className="text-black/50 shrink-0">
                      {new Date(t.created_at).toLocaleString("id-ID")}
                    </span>
                    <span className="min-w-0 break-words">{describeEvent({ event_type: t.event_type, payload: t.meta ?? t.payload, title: t.title })}</span>
                  </li>
                ))}
              </ol>
            </SectionShell>
          )}

          {display.revision.note && (
            <div data-pdf-block className="rounded-md p-3" style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}>
              <p className="text-[10px] font-bold uppercase text-black/60 mb-1">Catatan Revisi Customer</p>
              <p className="text-sm break-words whitespace-pre-wrap">{display.revision.note}</p>
            </div>
          )}

          {/* Signatures */}
          <div data-pdf-block className="grid grid-cols-3 gap-3 pt-6">
            <SignatureBlock label="Admin / Sales Advisor" dataUrl={display.signatures.admin} accent="#64748B" />
            <SignatureBlock label="Customer" dataUrl={display.signatures.customer} accent={display.signatures.customer ? "#16A34A" : "#64748B"} />
            <SignatureBlock label="Mekanik — Final Check" dataUrl={display.signatures.mekanik} accent="#64748B" />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function SectionShell({ title, children, block }: { title: string; children: React.ReactNode; block?: boolean }) {
  return (
    <div
      {...(block ? { "data-pdf-block": "" } : {})}
      className="rounded-md p-3 h-full flex flex-col"
      style={{ border: "1px solid rgba(0,0,0,0.15)", borderLeft: `3px solid ${BRAND}` }}
    >
      <p className="text-[10px] font-bold uppercase mb-2" style={{ color: BRAND }}>{title}</p>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function KVCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <SectionShell title={title}>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline gap-2 border-b border-dashed border-black/15 pb-0.5 min-h-[20px]">
            <span className="text-[10px] uppercase text-black/60 shrink-0 w-[110px]">{it.label}</span>
            <span className="text-xs font-medium break-words flex-1">{it.value}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function KVGroupCard({ group }: { group: KVGroup }) {
  // Pair items into a symmetric 4-column grid: label|value|label|value.
  const items = group.items;
  const rows: Array<[typeof items[number] | null, typeof items[number] | null]> = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i] ?? null, items[i + 1] ?? null]);
  }
  return (
    <SectionShell title={group.title}>
      <div
        className="grid gap-x-4 gap-y-2"
        style={{ gridTemplateColumns: "120px 1fr 120px 1fr" }}
      >
        {rows.flatMap(([a, b], i) => [
          <KVCell key={`a-${i}`} item={a} />,
          <KVCell key={`b-${i}`} item={b} />,
        ])}
      </div>
      {group.note && group.note !== "—" && (
        <p className="mt-2 text-[11px] text-black/70">Catatan: {group.note}</p>
      )}
    </SectionShell>
  );
}

function KVCell({ item }: { item: { label: string; value: string } | null }) {
  if (!item) {
    return <><span /><span /></>;
  }
  return (
    <>
      <span className="text-[10px] uppercase text-black/60 border-b border-dashed border-black/15 pb-0.5 min-h-[20px] leading-[18px]">
        {item.label}
      </span>
      <span className="text-xs font-medium break-words border-b border-dashed border-black/15 pb-0.5 min-h-[20px] leading-[18px]">
        {item.value}
      </span>
    </>
  );
}

function KVRow({ item }: { item: { label: string; value: string } }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dashed border-black/15 pb-0.5 min-h-[20px]">
      <span className="text-[10px] uppercase text-black/60 shrink-0 w-[110px]">{item.label}</span>
      <span className="text-xs font-medium break-words flex-1">{item.value}</span>
    </div>
  );
}

function GroupCard({ group, compact = false }: { group: DisplayGroup; compact?: boolean }) {
  return (
    <SectionShell title={group.title}>
      <div
        className={
          compact
            ? "grid grid-cols-2 gap-x-3 gap-y-2 auto-rows-fr items-stretch"
            : "grid grid-cols-2 gap-x-3 gap-y-2 auto-rows-fr items-stretch"
        }
      >
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
    <div className="rounded px-2 py-1 min-h-[34px] flex flex-col justify-start h-full" style={{ background: "#FAFAFA" }}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-black/80 leading-tight">{item.label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {item.extra && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#E0E7FF", color: "#3730A3" }}>{item.extra}</span>
          )}
          <StatusChip status={item.status} />
        </div>
      </div>
      {item.note && (
        <p className="mt-0.5 text-[9px] italic text-black/60 leading-snug overflow-hidden" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>↳ {item.note}</p>
      )}
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
        className="h-20 flex items-end justify-center overflow-hidden rounded"
        style={{ borderBottom: `2px solid ${accent}` }}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={label} className="max-h-20 object-contain" crossOrigin="anonymous" />
        ) : null}
      </div>
      <p className="mt-1 text-[10px] uppercase font-semibold truncate" style={{ color: accent }}>{label}</p>
    </div>
  );
}

function EstimasiCard({ est }: { est: EstimasiDisplay }) {
  const fmt = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(Math.max(0, n))}`;
  const urgLabel = (u: "ok" | "bad" | "—") =>
    u === "ok" ? { text: "OK", bg: "#FEF3C7", fg: "#92400E" }
    : u === "bad" ? { text: "BAD", bg: "#FEE2E2", fg: "#991B1B" }
    : { text: "—", bg: "#F1F5F9", fg: "#64748B" };
  const apvLabel = (a: "yes" | "no" | "—") =>
    a === "yes" ? { text: "Setuju", bg: "#DCFCE7", fg: "#166534" }
    : a === "no" ? { text: "Tolak", bg: "#FEE2E2", fg: "#991B1B" }
    : { text: "—", bg: "#F1F5F9", fg: "#64748B" };

  return (
    <SectionShell title="Estimasi Pergantian Spareparts">
      {est.items.length > 0 ? (
        <table className="w-full text-[11px] border-collapse table-fixed">
          <colgroup>
            <col style={{ width: "38%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#F1F5F9" }}>
              <th className="text-left p-1.5 font-semibold text-[10px] uppercase text-black/60">Nama</th>
              <th className="text-center p-1.5 font-semibold text-[10px] uppercase text-black/60">Qty</th>
              <th className="text-right p-1.5 font-semibold text-[10px] uppercase text-black/60">Harga</th>
              <th className="text-right p-1.5 font-semibold text-[10px] uppercase text-black/60">Subtotal</th>
              <th className="text-center p-1.5 font-semibold text-[10px] uppercase text-black/60">Urg.</th>
              <th className="text-center p-1.5 font-semibold text-[10px] uppercase text-black/60">Persetujuan</th>
            </tr>
          </thead>
          <tbody>
            {est.items.map((r, i) => {
              const u = urgLabel(r.urgensi);
              const a = apvLabel(r.persetujuan);
              return (
                <tr key={i} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                  <td className="p-1.5 break-words">{r.nama || "—"}</td>
                  <td className="p-1.5 text-center tabular-nums">{r.qty}</td>
                  <td className="p-1.5 text-right tabular-nums">{fmt(r.harga)}</td>
                  <td className="p-1.5 text-right tabular-nums font-semibold">{fmt(r.subtotal)}</td>
                  <td className="p-1.5 text-center">
                    <span className="inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: u.bg, color: u.fg }}>{u.text}</span>
                  </td>
                  <td className="p-1.5 text-center">
                    <span className="inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: a.bg, color: a.fg }}>{a.text}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-[11px] text-black/50">Tidak ada item estimasi.</p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div className="flex justify-between border-b border-dashed border-black/15">
          <span className="text-black/60 uppercase text-[10px]">Total Produk</span>
          <span className="font-semibold tabular-nums">{est.totalItems} item</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-black/15">
          <span className="text-black/60 uppercase text-[10px]">Sub Total</span>
          <span className="font-semibold tabular-nums">{fmt(est.subtotal)}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-black/15">
          <span className="text-black/60 uppercase text-[10px]">Diskon Jasa</span>
          <span className="font-semibold tabular-nums">− {fmt(est.diskonJasa)}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-black/15">
          <span className="text-black/60 uppercase text-[10px]">Diskon Sparepart</span>
          <span className="font-semibold tabular-nums">− {fmt(est.diskonSparepart)}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between rounded px-3 py-2" style={{ background: BRAND, color: "#fff" }}>
        <span className="text-[11px] font-bold uppercase tracking-wider">Total Pembayaran</span>
        <span className="text-base font-black tabular-nums">{fmt(est.total)}</span>
      </div>
    </SectionShell>
  );
}
