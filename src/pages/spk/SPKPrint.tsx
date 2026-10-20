import { BanPrintSheet } from "@/components/spk/ban/BanPrintSheet";
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
import { withSpkLoadTimeout } from "@/lib/spk/loadTimeout";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
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
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
      // Publik: pakai RPC SECURITY DEFINER agar bisa dibuka tanpa login
      // (link/QR share). RPC hanya mengembalikan 1 SPK sesuai id.
      const { data, error } = await withSpkLoadTimeout(supabase.rpc("get_public_spk", { p_id: id }));
      if (cancelled) return;
      if (error) throw error;
      if (!data) throw new Error("SPK tidak ditemukan.");
        const payload = data as any;
        setSpk(payload.spk ?? null);
        setBranch(payload.branch ?? null);
        setTimeline(Array.isArray(payload.timeline) ? payload.timeline : []);
      } catch (e) {
        if (!cancelled) {
          setSpk(null);
          setLoadError(e instanceof Error ? e.message : "Gagal memuat SPK. Silakan coba lagi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, retryTick]);

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
        <p>{loadError ?? "SPK tidak ditemukan."}</p>
        <Button onClick={() => setRetryTick((tick) => tick + 1)}>Coba lagi</Button>
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
          className="spk-print-doc spk-a4-scope bg-white shadow-sm"
          style={{
            width: DOC_W,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
        {spk.spk_type === "ban" ? (
          <BanPrintSheet spk={spk} branch={branch} />
        ) : (<>
        <div className="spk-html-scope p-5 flex flex-col gap-1.5" style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 12.5, lineHeight: 1.45, color: "#0f1117" }}>
          {/* Header */}
          <div data-pdf-block className="flex items-start justify-between gap-3 pb-2.5" style={{ borderBottom: `3px solid ${HTML_RED}` }}>
            <div className="min-w-0 flex-1">
              <h2 style={{ color: HTML_RED, fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1 }}>STROBAN</h2>
              <p style={{ fontSize: 9, fontWeight: 600, color: "#9299aa", textTransform: "uppercase", letterSpacing: ".12em", marginTop: 1 }}>First Class Service</p>
              <p className="break-words" style={{ fontSize: 10.5, color: "#52596a", marginTop: 3 }}>
                Surat Perintah Kerja / Service Report{branch ? ` · ${branch.name}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0 whitespace-nowrap">
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#9299aa" }}>Service Report</p>
              <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, margin: "1px 0" }}>{spk.spk_number}</p>
              <p style={{ fontSize: 10.5, color: "#52596a" }}>
                {new Date(spk.opened_at || spk.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <StatusPill status={spk.status} />
            </div>
          </div>

          {/* Customer · Vehicle · Waktu */}
          <div data-pdf-block className="grid grid-cols-3" style={CARD}>
            {[
              display.customer,
              display.vehicle,
              [
                { label: "Waktu Estimasi", value: display.complaint.estimasi ?? "—" },
                { label: "Waktu Konfirmasi", value: display.complaint.konfirmasi ?? "—" },
              ],
            ].map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]" style={{ padding: "7px 10px", borderLeft: ci ? "1px solid #e4e7ed" : undefined }}>
                {col.map((it) => <DotRow key={it.label} item={it} />)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 items-start">
            {/* LEFT — Sales Advisor */}
            <div className="flex flex-col gap-1.5">
              <div data-pdf-block style={CARD}>
                <p style={{ ...HEAD_STYLE, background: "#0f1117" }}>Sales Advisor</p>
                <div style={{ padding: "7px 10px" }} className="flex flex-col gap-[3px]">
                  {display.serviceOrder.items.map((it) => <DotRow key={it.label} item={it} />)}
                  {display.serviceOrder.note && display.serviceOrder.note !== "—" && (
                    <p className="text-[11px] mt-1 break-words"><b>Others Service:</b> {display.serviceOrder.note}</p>
                  )}
                </div>
              </div>
              <HtmlCard title="Catatan Customer">
                <div style={NOTE_BOX}>{display.complaint.note}</div>
              </HtmlCard>
              <HtmlCard title="Tanggal & Waktu" grey>
                <div className="grid grid-cols-2" style={{ border: "1px solid #e4e7ed", borderRadius: 5, overflow: "hidden" }}>
                  {display.workTimes.items.map((it, i) => (
                    <div key={it.label} style={{ padding: "4px 6px", textAlign: "center", borderRight: i % 2 === 0 ? "1px solid #e4e7ed" : undefined, borderTop: i > 1 ? "1px solid #e4e7ed" : undefined }}>
                      <span className="block" style={LBL}>{it.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11.5 }}>{it.value}</span>
                    </div>
                  ))}
                </div>
                {display.workTimes.note && display.workTimes.note !== "—" && (
                  <p className="text-[11px] mt-1 break-words">Catatan: {display.workTimes.note}</p>
                )}
              </HtmlCard>
              <HtmlCard title="Tyres Check" grey>
                <div className="flex flex-col gap-[3px] mb-1.5">
                  {display.tyre.items.map((it) => <DotRow key={it.label} item={it} />)}
                </div>
                <DiagTable groups={[{ title: "", items: display.tyre.checks }]} />
              </HtmlCard>
              <HtmlCard title="Note by Mechanic">
                <div style={NOTE_BOX} className="whitespace-pre-wrap break-words">{display.mechanicNote}</div>
              </HtmlCard>
            </div>

            {/* RIGHT — Mekanik */}
            <div className="flex flex-col gap-1.5">
              <div data-pdf-block className="flex flex-wrap items-center gap-2.5" style={{ padding: "4px 8px", fontSize: 10, color: "#52596a", background: "#f1f3f6", borderRadius: 5 }}>
                <b>Legenda:</b>
                {(["ok", "warn", "not", "na"] as StatusToken[]).map((t) => (
                  <span key={t} className="flex items-center gap-1"><StatusBox status={t} />{STATUS_PALETTE[t].label}</span>
                ))}
              </div>
              <div style={CARD}>
                <p data-pdf-block style={{ ...HEAD_STYLE, background: "#0f1117" }}>Mekanik / Diagnostic Check</p>
                <DiagTable groups={[display.engine, display.lamps, display.electrical, display.ac, display.suspension]} />
              </div>
              <HtmlCard title="Part Replacement" grey>
                <div style={NOTE_BOX} className="break-words">{display.suspension.note || "—"}</div>
              </HtmlCard>
              {(display.estimasi.items.length > 0 || display.estimasi.subtotal > 0) && (
                <EstimasiCard est={display.estimasi} />
              )}
            </div>
          </div>

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

          <PhotoGrid title="Foto SPK Asli" photos={display.photos.original} />
          <PhotoGrid title="Foto Keluhan" photos={display.photos.complaint} />
          <PhotoGrid title="Foto Temuan Mekanik" photos={display.photos.mechanic} />

          <div data-pdf-block className="grid grid-cols-3 gap-1.5 pt-2">
            <ApprovalBlock label="Technician" info={display.approvals.mekanik} />
            <ApprovalBlock label="Sales Advisor" info={display.approvals.admin} />
            <ApprovalBlock label="Customer" info={display.approvals.customer} />
          </div>
        </div>
        </>)}
        </div>
      </div>
    </div>
  );
}

function SectionShell({ title, children, block }: { title: string; children: React.ReactNode; block?: boolean }) {
  return SectionShellImpl({ title, children, block });
}

// Galeri foto lampiran — ikut tercetak pada PDF.
function PhotoGrid({ title, photos }: { title: string; photos: { url: string }[] }) {
  if (!photos?.length) return null;
  return (
    <div data-pdf-block style={{ background: "#f9fafb", border: "1px solid #e4e7ed", borderRadius: 5, overflow: "hidden" }}>
      <p style={HEAD_STYLE}>{title}</p>
      <div className="grid grid-cols-3 gap-2" style={{ padding: "8px 10px" }}>
        {photos.map((p, i) => (
          <img
            key={`${p.url}-${i}`}
            src={p.url}
            alt={`${title} ${i + 1}`}
            crossOrigin="anonymous"
            className="w-full rounded"
            style={{ height: 150, objectFit: "cover", border: "1px solid rgba(0,0,0,0.12)" }}
          />
        ))}
      </div>
    </div>
  );
}

const HEAD_STYLE: React.CSSProperties = {
  background: BRAND,
  color: "#fff",
  padding: "5px 10px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

function SectionShellImpl({ title, children, block }: { title: string; children: React.ReactNode; block?: boolean }) {
  return (
    <div
      {...(block ? { "data-pdf-block": "" } : {})}
      className="h-full flex flex-col"
      style={{ background: "#f9fafb", border: "1px solid #e4e7ed", borderRadius: 5, overflow: "hidden" }}
    >
      <p style={HEAD_STYLE}>{title}</p>
      <div className="flex-1" style={{ padding: "8px 10px" }}>{children}</div>
    </div>
  );
}

function KVCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <SectionShell title={title}>
      <div className="flex flex-col gap-[3px]">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline min-w-0">
            <span className="shrink-0 min-w-[80px]" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#9299aa" }}>{it.label}</span>
            <span className="flex-1" style={{ borderBottom: "1px dotted #d0d5df", margin: "0 4px 3px", minWidth: 8 }} />
            <span className="break-words text-right" style={{ maxWidth: "60%", fontSize: 12.5 }}>{it.value}</span>
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
    <SectionShell title={group.title} block>
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
        <p className="mt-2 text-[11px] text-black/70 break-words">Catatan: {group.note}</p>
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
      <span className="text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa] border-b border-dotted border-black/20 pb-0.5 min-h-[20px] leading-[18px]">
        {item.label}
      </span>
      <span className="text-xs font-medium break-words border-b border-dotted border-black/20 pb-0.5 min-h-[20px] leading-[18px]">
        {item.value}
      </span>
    </>
  );
}

function KVRow({ item }: { item: { label: string; value: string } }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dotted border-black/20 pb-0.5 min-h-[20px]">
      <span className="text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa] shrink-0 w-[110px]">{item.label}</span>
      <span className="text-xs font-medium break-words flex-1">{item.value}</span>
    </div>
  );
}

function GroupCard({ group, compact = false }: { group: DisplayGroup; compact?: boolean }) {
  return (
    <SectionShell title={group.title} block>
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
        <p className="mt-2 text-[11px] text-black/70 break-words">Catatan: {group.note}</p>
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

function ApprovalBlock({
  label,
  info,
}: {
  label: string;
  info: { approved: boolean; by?: string; at?: string };
}) {
  const accent = info.approved ? "#16A34A" : "#64748B";
  const when = info.at ? new Date(info.at) : null;
  const whenText =
    when && !Number.isNaN(when.getTime())
      ? when.toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  return (
    <div
      className="rounded-md p-3 text-center h-full flex flex-col justify-center"
      style={{ border: `1px solid ${accent}33`, borderBottom: `2px solid ${accent}` }}
    >
      <p className="text-[10px] uppercase font-semibold" style={{ color: accent }}>
        {label}
      </p>
      <p className="mt-1 text-[12px] font-bold" style={{ color: accent }}>
        {info.approved ? "DISETUJUI" : "BELUM DISETUJUI"}
      </p>
      {info.by ? <p className="text-[10px] text-black/70 break-words">{info.by}</p> : null}
      <p className="text-[9px] text-black/50">{whenText}</p>
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
    <SectionShell title="Estimasi Pergantian Spareparts" block>
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
              <th className="text-left p-1.5 font-semibold text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa]">Nama</th>
              <th className="text-center p-1.5 font-semibold text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa]">Qty</th>
              <th className="text-right p-1.5 font-semibold text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa]">Harga</th>
              <th className="text-right p-1.5 font-semibold text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa]">Subtotal</th>
              <th className="text-center p-1.5 font-semibold text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa]">Urg.</th>
              <th className="text-center p-1.5 font-semibold text-[9.5px] font-bold uppercase tracking-[.07em] text-[#9299aa]">Persetujuan</th>
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
        <div className="flex justify-between border-b border-dotted border-black/20">
          <span className="text-black/60 uppercase text-[10px]">Total Produk</span>
          <span className="font-semibold tabular-nums">{est.totalItems} item</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-black/20">
          <span className="text-black/60 uppercase text-[10px]">Sub Total</span>
          <span className="font-semibold tabular-nums">{fmt(est.subtotal)}</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-black/20">
          <span className="text-black/60 uppercase text-[10px]">Diskon Jasa</span>
          <span className="font-semibold tabular-nums">− {fmt(est.diskonJasa)}</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-black/20">
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

// ── Gaya mengikuti SPK_Stroban_1-3.html ──
const HTML_RED = "#E53935";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const CARD: React.CSSProperties = { background: "#f9fafb", border: "1px solid #e4e7ed", borderRadius: 5, overflow: "hidden" };
const LBL: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#9299aa" };
const NOTE_BOX: React.CSSProperties = { border: "1px dashed #d0d5df", borderRadius: 5, padding: "6px 8px", minHeight: 36, fontSize: 11.5, color: "#52596a", background: "#fff" };

function HtmlCard({ title, grey, children }: { title: string; grey?: boolean; children: React.ReactNode }) {
  return (
    <div data-pdf-block style={CARD}>
      <p style={grey ? { ...HEAD_STYLE, background: "#f1f3f6", color: "#52596a", borderBottom: "1px solid #e4e7ed" } : { ...HEAD_STYLE, background: HTML_RED }}>{title}</p>
      <div style={{ padding: "8px 10px" }}>{children}</div>
    </div>
  );
}

function DotRow({ item }: { item: { label: string; value: string } }) {
  return (
    <div className="flex items-baseline min-w-0">
      <span className="shrink-0" style={LBL}>{item.label}</span>
      <span className="flex-1" style={{ borderBottom: "1px dotted #d0d5df", margin: "0 4px 3px", minWidth: 8 }} />
      <span className="break-words text-right" style={{ maxWidth: "62%", fontSize: 12 }}>{item.value}</span>
    </div>
  );
}

const BOX: Record<StatusToken, { bg: string; fg: string; ch: string }> = {
  ok: { bg: "#f0faf3", fg: "#15803d", ch: "G" },
  warn: { bg: "#fffbeb", fg: "#b45309", ch: "!" },
  not: { bg: "#fee2e2", fg: "#b71c1c", ch: "R" },
  na: { bg: "#f1f3f6", fg: "#9299aa", ch: "—" },
  empty: { bg: "#f1f3f6", fg: "#9299aa", ch: "—" },
};

function StatusBox({ status }: { status: StatusToken }) {
  const b = BOX[status] ?? BOX.na;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: 3, background: b.bg, color: b.fg, fontSize: 9, fontWeight: 800 }}>{b.ch}</span>
  );
}

function DiagTable({ groups }: { groups: Array<{ title: string; items: DisplayItem[]; note?: string }> }) {
  const td: React.CSSProperties = { padding: "3.5px 6px", borderBottom: "1px solid #e4e7ed", fontSize: 11.5, verticalAlign: "middle" };
  return (
    <table className="w-full" style={{ borderCollapse: "collapse", background: "#fff" }}>
      <tbody>
        {groups.flatMap((g) => [
          g.title ? (
            <tr key={`h-${g.title}`} data-pdf-block>
              <td colSpan={3} style={{ ...td, ...LBL, color: "#52596a", background: "#f1f3f6", borderBottom: "1px solid #d0d5df", padding: "4px 6px" }}>{g.title}</td>
            </tr>
          ) : null,
          ...g.items.map((it) => (
            <tr key={`${g.title}-${it.label}`} data-pdf-block>
              <td style={td}>
                {it.label}
                {it.note && <span className="block text-[9.5px] italic" style={{ color: "#52596a" }}>↳ {it.note}</span>}
              </td>
              <td style={{ ...td, width: 22, textAlign: "center" }}><StatusBox status={it.status} /></td>
              <td style={{ ...td, color: "#9299aa", fontSize: 10.5, whiteSpace: "nowrap", width: 1 }}>{it.extra ?? "Good / Attention / Replace"}</td>
            </tr>
          )),
          g.note && g.note !== "—" && g.title ? (
            <tr key={`n-${g.title}`}><td colSpan={3} style={{ ...td, fontSize: 10.5, color: "#52596a" }}>Catatan: {g.note}</td></tr>
          ) : null,
        ])}
      </tbody>
    </table>
  );
}
