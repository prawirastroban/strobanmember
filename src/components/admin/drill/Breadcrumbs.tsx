import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  history: "Pusat Histori",
  customers: "Customer",
  bookings: "Booking",
  services: "Layanan",
  keuangan: "Keuangan",
  payment: "Payments",
  report: "Financial Report",
  "manual-payment": "Pembayaran Manual",
  referral: "Referral",
  loyalty: "Loyalty",
  promo: "Promo",
  marketing: "Marketing",
  rewards: "Rewards",
  promos: "Promo",
  complaints: "Pengaduan",
  reports: "Daftar Laporan",
  analytics: "Web Analytics",
  legal: "Legal",
  branches: "Cabang",
  "audit-log": "Audit Log",
  feedback: "Bug Reports",
  vehicles: "Kendaraan",
  invoice: "Invoice",
  spk: "SPK",
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length <= 1) return null;

  const crumbs = segs.map((seg, i) => {
    const href = "/" + segs.slice(0, i + 1).join("/");
    const isUuid = /^[0-9a-f-]{20,}$/i.test(seg);
    const label = isUuid ? `#${seg.slice(0, 6).toUpperCase()}` : (LABELS[seg] || decodeURIComponent(seg));
    return { href, label, last: i === segs.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
      <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1">
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.slice(1).map((c) => (
        <span key={c.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {c.last ? (
            <span className="text-foreground font-medium">{c.label}</span>
          ) : (
            <Link to={c.href} className="hover:text-foreground">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}