import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fileStamp, formatRupiah, formatDateTimeID } from "@/lib/reportFormat";
import type { FinancialExportPayload } from "./exportFinancialExcel";

export function exportFinancialPdf(brandName: string, payload: FinancialExportPayload) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(brandName, 40, 40);
  doc.setFontSize(12); doc.text("Laporan Keuangan", 40, 58);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(
    [
      `Periode: ${payload.meta.period}`,
      `Cabang: ${payload.meta.branch}`,
      payload.meta.customer ? `Customer: ${payload.meta.customer}` : "",
      payload.meta.promo ? `Promo: ${payload.meta.promo}` : "",
      payload.meta.status ? `Status: ${payload.meta.status}` : "",
      `Dicetak: ${formatDateTimeID(new Date())}`,
    ].filter(Boolean).join("   ·   "),
    40, 74, { maxWidth: pw - 80 },
  );

  let y = 100;
  const section = (title: string, head: string[], body: any[][]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(title, 40, y); y += 6;
    autoTable(doc, {
      startY: y + 4,
      head: [head],
      body,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 } as any,
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
    if (y > 760) { doc.addPage(); y = 40; }
  };

  section("Section 1 - KPI", ["KPI", "Nilai"], Object.entries(payload.kpi).map(([k, v]) => [k, String(v)]));
  section("Section 2 - Payment Breakdown", ["Kategori", "Tx", "Revenue", "%"],
    payload.paymentBreakdown.map((r) => [r.category, r.count, formatRupiah(r.revenue), `${r.pct.toFixed(1)}%`]));
  section("Section 3 - Promo Analytics", ["Promo", "Digunakan", "Potongan", "Revenue"],
    payload.promoTable.map((r) => [r.promo, r.used, formatRupiah(r.potongan), formatRupiah(r.revenue)]));
  section("Section 4 - Loyalty", ["Metric", "Nilai"], payload.loyalty.map((r) => [r.metric, String(r.value)]));
  section("Section 5 - Referral", ["Referrer", "Referral", "Booking", "Revenue"],
    payload.referralTable.map((r) => [r.referrer, r.referrals, r.bookings, formatRupiah(r.revenue)]));
  section("Section 6 - Free & Claim", ["Kategori", "Jumlah", "Nilai"],
    payload.freeClaim.map((r) => [r.category, r.count, formatRupiah(r.value)]));
  section("Section 7 - Discount Cost", ["Sumber", "Nilai"],
    payload.discountCost.map((r) => [r.source, formatRupiah(r.amount)]));
  section("Section 8 - Net Revenue", ["Komponen", "Nilai"],
    payload.netRevenue.map((r) => [r.label, formatRupiah(r.amount)]));

  if (y > 700) { doc.addPage(); y = 40; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Section 9 - Top Insight", 40, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  payload.insights.forEach((s) => { doc.text(`• ${s}`, 40, y, { maxWidth: pw - 80 }); y += 14; });

  doc.save(`financial_report_${fileStamp()}.pdf`);
}
