import { useNavigate } from "react-router-dom";
import {
  CalendarCheck, CalendarClock, Truck, BarChart2, Users, Building2,
  Megaphone, LayoutGrid, Tag, Trophy, Gift, Image as ImageIcon,
  Clock, FileBarChart, Wallet, FileText, ShieldAlert, Bug,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardBadges } from "@/hooks/useDashboardBadges";

type Tone = "green" | "blue" | "violet";

interface Tile {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  ownerOnly?: boolean;
}

interface Section {
  title: string;
  tone: Tone;
  tiles: Tile[];
}

const sections: Section[] = [
  {
    title: "Operasional",
    tone: "green",
    tiles: [
      { label: "Confirmation Bookings", icon: CalendarCheck, to: "/dashboard/bookings" },
      { label: "Kapasitas Slot", icon: CalendarClock, to: "/dashboard/slots" },
      { label: "Pick-up Service", icon: Truck, to: "/dashboard/pickup-settings", ownerOnly: true },
      { label: "CRM", icon: BarChart2, to: "/dashboard/crm" },
      { label: "Customers & Vehicles", icon: Users, to: "/dashboard/customers" },
      { label: "Pengaturan Cabang", icon: Building2, to: "/dashboard/branches", ownerOnly: true },
    ],
  },
  {
    title: "Marketing",
    tone: "blue",
    tiles: [
      { label: "Overview", icon: Megaphone, to: "/dashboard/marketing", ownerOnly: true },
      { label: "Services", icon: LayoutGrid, to: "/dashboard/marketing/services", ownerOnly: true },
      { label: "Promo", icon: Tag, to: "/dashboard/marketing/promos", ownerOnly: true },
      { label: "Loyalty", icon: Trophy, to: "/dashboard/marketing/loyalty", ownerOnly: true },
      { label: "Rewards", icon: Gift, to: "/dashboard/marketing/rewards", ownerOnly: true },
      { label: "Branding & Logo", icon: ImageIcon, to: "/dashboard/marketing/branding", ownerOnly: true },
    ],
  },
  {
    title: "Lainnya",
    tone: "violet",
    tiles: [
      { label: "Transaction History", icon: Clock, to: "/dashboard/history" },
      { label: "Daftar Laporan", icon: FileBarChart, to: "/dashboard/reports" },
      { label: "Keuangan", icon: Wallet, to: "/dashboard/keuangan/payment" },
      { label: "Legal & Dokumen", icon: FileText, to: "/dashboard/legal", ownerOnly: true },
      { label: "Audit Log", icon: ShieldAlert, to: "/dashboard/audit-log", ownerOnly: true },
      { label: "Bug & Masukan", icon: Bug, to: "/dashboard/feedback" },
    ],
  },
];

const toneClasses: Record<Tone, { card: string; icon: string }> = {
  green: {
    card: "bg-accurate-green-bg border-accurate-green-border hover:border-accurate-green-fg/50",
    icon: "text-accurate-green-fg bg-white/60",
  },
  blue: {
    card: "bg-accurate-blue-bg border-accurate-blue-border hover:border-accurate-blue-fg/50",
    icon: "text-accurate-blue-fg bg-white/60",
  },
  violet: {
    card: "bg-accurate-violet-bg border-accurate-violet-border hover:border-accurate-violet-fg/50",
    icon: "text-accurate-violet-fg bg-white/60",
  },
};

const DashboardMenuGrid = () => {
  const navigate = useNavigate();
  const { isStaff } = useUserRole();
  const { badgeFor } = useDashboardBadges();

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const tiles = section.tiles.filter((t) => !t.ownerOnly || isStaff);
        if (tiles.length === 0) return null;
        const tone = toneClasses[section.tone];
        return (
          <section key={section.title} className="space-y-3">
            <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
              {section.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tiles.map((tile) => {
                const Icon = tile.icon;
                const badge = badgeFor(tile.to);
                return (
                  <button
                    key={tile.to}
                    type="button"
                    onClick={() => navigate(tile.to)}
                    className={`group relative rounded-lg border ${tone.card} p-4 flex flex-col items-center justify-center text-center gap-3 min-h-[120px] transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]`}
                  >
                    {badge > 0 && (
                      <span className="absolute top-2 right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-white/70 animate-pulse">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${tone.icon} shadow-sm`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[12.5px] font-medium text-foreground/90 leading-tight line-clamp-2">
                      {tile.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default DashboardMenuGrid;