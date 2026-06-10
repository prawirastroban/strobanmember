import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardBadges } from "@/hooks/useDashboardBadges";
import {
  getOverviewTiles,
  SECTION_META,
  type DashboardSection,
} from "@/config/dashboardMenu";

type Tone = "green" | "blue" | "violet";

const SECTION_TONE: Record<DashboardSection, Tone> = {
  operasional: "green",
  marketing: "blue",
  lainnya: "violet",
};

const SECTION_ORDER: DashboardSection[] = ["operasional", "marketing", "lainnya"];

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
  const { isStaff, isAdminCabang } = useUserRole();
  const { badgeFor } = useDashboardBadges();
  const buckets = getOverviewTiles({ isStaff, isAdminCabang });

  return (
    <div className="space-y-6">
      {SECTION_ORDER.map((sectionKey) => {
        const tiles = buckets[sectionKey];
        if (!tiles || tiles.length === 0) return null;
        const tone = toneClasses[SECTION_TONE[sectionKey]];
        return (
          <section key={sectionKey} className="space-y-3">
            <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
              {SECTION_META[sectionKey].title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tiles.map((tile) => {
                const Icon = tile.icon;
                const badge = badgeFor(tile.url);
                return (
                  <button
                    key={`${tile.url}-${tile.title}`}
                    type="button"
                    onClick={() => navigate(tile.url)}
                    className={`group relative rounded-lg border ${tone.card} p-4 flex flex-col items-center justify-center text-center gap-3 min-h-[120px] transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]`}
                  >
                    {badge > 0 && (
                      <span className="absolute top-2 right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-white/70">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${tone.icon} shadow-sm`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[12.5px] font-medium text-foreground/90 leading-tight line-clamp-2">
                      {tile.title}
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