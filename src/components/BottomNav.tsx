import { useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarCheck, User, ClipboardList, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { t } = useLanguage();
  const { count: cartCount } = useCart();

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
      label: "Pesanan",
      icon: ClipboardList,
      path: "/reminder-service",
      active:
        location.pathname.startsWith("/reminder-service") ||
        location.pathname.startsWith("/profile/history") ||
        location.pathname.startsWith("/my-booking") ||
        location.pathname.startsWith("/booking/status"),
      onClick: () => goToAuthAware("/reminder-service"),
    },
    {
      label: "Pesan",
      icon: CalendarCheck,
      path: "/booking",
      active: location.pathname === "/booking",
      onClick: () => goToAuthAware("/booking"),
      primary: true,
    },
    {
      label: "Checkout",
      icon: ShoppingCart,
      path: "/checkout",
      active: location.pathname === "/checkout",
      onClick: () => goToAuthAware("/checkout"),
      badge: cartCount,
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
              tab.primary
                ? "relative"
                : tab.active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.primary ? (
              <span
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-[3.75rem] h-[3.75rem] -mt-6 rounded-full shadow-[0_4px_20px_hsl(var(--primary)/0.4)] transition-all ring-4 ring-background",
                  "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground hover:shadow-[0_4px_24px_hsl(var(--primary)/0.55)] hover:scale-105"
                )}
              >
                <tab.icon className="h-5 w-5 drop-shadow-sm" />
                <span className="text-[9px] font-bold leading-none tracking-wide">
                  {tab.label}
                </span>
              </span>
            ) : (
              <>
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
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
