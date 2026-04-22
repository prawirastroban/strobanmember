import { useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarCheck, User, ClipboardList, ShoppingCart } from "lucide-react";
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

  // Hide on auth / reset-password / dashboard pages, and on the booking wizard (which has its own sticky action bar)
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
      onClick: () => navigate("/"),
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
      onClick: () => {
        if (user) navigate("/reminder-service");
        else openLoginDialog("/reminder-service");
      },
    },
    {
      label: "Pesan",
      icon: CalendarCheck,
      path: "/booking",
      active: location.pathname === "/booking",
      onClick: () => {
        if (user) navigate("/booking");
        else openLoginDialog("/booking");
      },
      primary: true,
    },
    {
      label: "Checkout",
      icon: ShoppingCart,
      path: "/checkout",
      active: location.pathname === "/checkout",
      onClick: () => {
        if (user) navigate("/checkout");
        else openLoginDialog("/checkout");
      },
    },
    {
      label: "Akun",
      icon: User,
      path: "/profile",
      active: location.pathname === "/profile",
      onClick: () => {
        if (user) navigate("/profile");
        else openLoginDialog("/profile");
      },
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
                <tab.icon className="h-5 w-5" />
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
