import { useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarCheck, User } from "lucide-react";
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

  // Hide on auth / reset-password pages
  // Hide on auth, reset-password, and admin pages
  if (["/auth", "/reset-password"].includes(location.pathname) || location.pathname.startsWith("/dashboard")) return null;

  const tabs = [
    {
      label: t.navbar.dashboard,
      icon: Home,
      path: "/",
      active: location.pathname === "/",
      onClick: () => navigate("/"),
    },
    {
      label: t.hero.bookService,
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
      label: t.navbar.myProfile,
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
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={tab.onClick}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
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
                  "flex flex-col items-center justify-center gap-0.5 w-[4.5rem] h-[4.5rem] -mt-7 rounded-full shadow-[0_4px_20px_hsl(var(--primary)/0.4)] transition-all ring-4 ring-background",
                  "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground hover:shadow-[0_4px_24px_hsl(var(--primary)/0.55)] hover:scale-105"
                )}
              >
                <tab.icon className="h-6 w-6 drop-shadow-sm" />
                <span className="text-[10px] font-bold leading-none tracking-wide">
                  {tab.label}
                </span>
                <span className="text-[7px] font-bold leading-none opacity-90">
                  BUKA SETIAP HARI
                </span>
              </span>
            ) : (
              <>
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">
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
