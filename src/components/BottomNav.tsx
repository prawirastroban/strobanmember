import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, MapPin, ClipboardList, LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { t } = useLanguage();

  const goTo = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(path);
      // ensure new page starts at top
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  };
  const goToAuthAware = (path: string) => {
    if (!user) {
      openLoginDialog(path);
      return;
    }
    goTo(path);
  };

  // Hide on auth / reset-password / dashboard pages, the booking wizard, and checkout (each has its own sticky action bar)
  if (
    ["/auth", "/reset-password"].includes(location.pathname) ||
    location.pathname.startsWith("/dashboard") ||
    location.pathname === "/booking" ||
    location.pathname.startsWith("/booking/") ||
    location.pathname === "/spk" ||
    location.pathname.startsWith("/spk/")
  ) return null;

  const tabs = [
    {
      label: "Beranda",
      icon: Home,
      path: "/",
      active: location.pathname === "/",
      onClick: () => goTo("/"),
    },
    {
      label: "Pesanan",
      icon: ClipboardList,
      path: "/pesanan",
      active: location.pathname === "/pesanan",
      onClick: () => goToAuthAware("/pesanan"),
      shine: false,
    },
    {
      label: "Katalog",
      icon: LayoutGrid,
      path: "/katalog",
      active: location.pathname === "/katalog",
      onClick: () => goTo("/katalog"),
    },
    {
      label: "Cabang",
      icon: MapPin,
      path: "/cabang",
      active: location.pathname === "/cabang",
      onClick: () => goTo("/cabang"),
    },
    {
      label: "Akun",
      icon: User,
      path: "/profile",
      active: location.pathname === "/profile",
      onClick: () => goToAuthAware("/profile"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border safe-area-bottom">
      {/* Shared SVG gradient for the rainbow icon stroke (Lucide icons inherit currentColor by default — overriding stroke with this gradient makes the icon match the text). */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="rainbow-stroke" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff0040">
              <animate attributeName="stop-color"
                values="#ff0040;#ff8a00;#ffe600;#00e676;#00b8ff;#7c4dff;#ff00d4;#ff0040"
                dur="3.2s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#00e676">
              <animate attributeName="stop-color"
                values="#00e676;#00b8ff;#7c4dff;#ff00d4;#ff0040;#ff8a00;#ffe600;#00e676"
                dur="3.2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#7c4dff">
              <animate attributeName="stop-color"
                values="#7c4dff;#ff00d4;#ff0040;#ff8a00;#ffe600;#00e676;#00b8ff;#7c4dff"
                dur="3.2s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>
      </svg>
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={tab.onClick}
            type="button"
            aria-label={tab.label}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 rounded-lg transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none",
              tab.active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.active && (
              <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
            <span className="relative">
              <tab.icon
                className={cn("h-5 w-5", tab.shine && "shine-rainbow-icon")}
                {...(tab.shine ? { stroke: "url(#rainbow-stroke)" } : {})}
              />
            </span>
            <span
              className={cn(
                "text-[11px] font-medium leading-none text-center",
                tab.shine && "shine-rainbow"
              )}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
