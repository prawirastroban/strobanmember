import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, MapPin, Tag, LayoutGrid } from "lucide-react";
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
    location.pathname.startsWith("/booking/")
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
      label: "Promo",
      icon: Tag,
      path: "/promo",
      active: location.pathname === "/promo",
      onClick: () => goTo("/promo"),
      shine: true,
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
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={tab.onClick}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              tab.active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="relative">
              <tab.icon className={cn("h-5 w-5", tab.shine && "shine-rainbow-icon")} />
            </span>
            <span
              className={cn(
                "text-[10px] font-medium leading-none text-center inline-flex flex-col items-center gap-0.5",
                tab.shine && "shine-rainbow"
              )}
            >
              {tab.label}
              {tab.shine && (
                <span className="shine-rainbow-line h-[2px] w-5" aria-hidden="true" />
              )}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
