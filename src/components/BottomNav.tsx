import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, MapPin, Tag } from "lucide-react";
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

  // Scroll to top smoothly. If already on the target route, just scroll.
  // Otherwise navigate and then scroll to top.
  const goTo = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(path);
      // ensure new page starts at top
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  };
  // Scroll to a hash section on the homepage (navigate first if needed)
  const goToHash = (hash: string) => {
    const scrollToEl = () => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    };
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(scrollToEl, 250);
    } else {
      scrollToEl();
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
    location.pathname === "/checkout"
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
      path: "/#promo",
      active: false,
      onClick: () => goToHash("#promo"),
    },
    {
      label: "Cabang",
      icon: MapPin,
      path: "/#cabang",
      active: false,
      onClick: () => goToHash("#cabang"),
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
              <tab.icon className="h-5 w-5" />
              {"badge" in tab && tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              ) : null}
            </span>
            <span className="text-[10px] font-medium leading-none text-center">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
