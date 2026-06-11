import * as XLSX from "xlsx";
import { fileStamp } from "@/lib/reportFormat";

export interface FinancialExportPayload {
  meta: { period: string; branch: string; customer: string; promo: string; status: string };
  kpi: Record<string, number | string>;
  paymentBreakdown: { category: string; count: number; revenue: number; pct: number }[];
  promoTable: { promo: string; used: number; potongan: number; revenue: number }[];
  loyalty: { metric: string; value: number }[];
  referralTable: { referrer: string; referrals: number; bookings: number; revenue: number }[];
  freeClaim: { category: string; count: number; value: number }[];
  discountCost: { source: string; amount: number }[];
  netRevenue: { label: string; amount: number }[];
  insights: string[];
}

const sheet = (aoa: any[][]) => XLSX.utils.aoa_to_sheet(aoa);

export function exportFinancialExcel(payload: FinancialExportPayload) {
  const wb = XLSX.utils.book_new();

  const overview: any[][] = [
    ["Laporan Keuangan"],
    [`Periode: ${payload.meta.period}`],
    [`Cabang: ${payload.meta.branch}`],
    [`Customer: ${payload.meta.customer || "-"}`],
    [`Promo: ${payload.meta.promo || "-"}`],
    [`Status: ${payload.meta.status || "-"}`],
    [],
    ["KPI", "Nilai"],
    ...Object.entries(payload.kpi).map(([k, v]) => [k, v]),
  ];
  XLSX.utils.book_append_sheet(wb, sheet(overview), "Overview");

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Kategori", "Jumlah Transaksi", "Total Revenue", "Kontribusi %"],
    ...payload.paymentBreakdown.map((r) => [r.category, r.count, r.revenue, r.pct]),
  ]), "Payment Breakdown");

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Promo", "Digunakan", "Total Potongan", "Revenue"],
    ...payload.promoTable.map((r) => [r.promo, r.used, r.potongan, r.revenue]),
  ]), "Promo");

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Metric", "Nilai"], ...payload.loyalty.map((r) => [r.metric, r.value]),
  ]), "Loyalty");

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Referrer", "Total Referral", "Booking Berhasil", "Revenue"],
    ...payload.referralTable.map((r) => [r.referrer, r.referrals, r.bookings, r.revenue]),
  ]), "Referral");

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Kategori", "Jumlah", "Nilai (Rp)"],
    ...payload.freeClaim.map((r) => [r.category, r.count, r.value]),
  ]), "Free & Claim");

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Sumber", "Nilai Potongan (Rp)"],
    ...payload.discountCost.map((r) => [r.source, r.amount]),
  ]), "Discount Cost");

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Komponen", "Nilai (Rp)"],
    ...payload.netRevenue.map((r) => [r.label, r.amount]),
  ]), "Net Revenue");

  XLSX.utils.book_append_sheet(wb, sheet([["Top Insight"], ...payload.insights.map((s) => [s])]), "Insight");

  XLSX.writeFile(wb, `financial_report_${fileStamp()}.xlsx`);
}
