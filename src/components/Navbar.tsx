import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CarFront, LogOut, User, Settings, CalendarCheck, MapPin, Phone, Wrench, Info, Disc3, Package, LayoutDashboard, ClipboardCheck, ArrowLeft, Tag, LayoutGrid } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import MobileNav from "./MobileNav";
import DesktopSidebar from "./DesktopSidebar";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import StaffQuickBookingDialog from "./admin/StaffQuickBookingDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useBranding } from "@/hooks/useBranding";

const SCROLL_THRESHOLD = 400;

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { logoLight, brandName } = useBranding();
  const { openLoginDialog } = useLoginDialog();
  const { isStaff, isAdminOrStaff, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const showBack = location.pathname !== "/" && location.pathname !== "/auth" && location.pathname !== "/reset-password";
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  const [showBookBtn, setShowBookBtn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [activeBooking, setActiveBooking] = useState<{ id: string; status: string } | null>(null);
  const [showQuickBooking, setShowQuickBooking] = useState(false);

  // Fetch pending bookings + most recent active booking for status shortcut
  useEffect(() => {
    if (!user) {
      setActiveBooking(null);
      setPendingBookings(0);
      return;
    }
    const fetchPending = async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      setPendingBookings(count || 0);
    };
    const fetchActive = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("user_id", user.id)
        .not("status", "in", "(completed,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveBooking(data ?? null);
    };
    fetchPending();
    fetchActive();

    const channel = supabase
      .channel("navbar-booking-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, () => {
        fetchPending();
        fetchActive();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const onScroll = () => {
      setShowBookBtn(window.scrollY > SCROLL_THRESHOLD);
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  const navLinks = [
    { label: t.navbar.dashboard || "Beranda", path: "/", icon: CarFront },
    { label: "Katalog", path: "/katalog", icon: LayoutGrid },
    { label: "Promo", path: "/promo", icon: Tag },
    { label: t.branches?.title || "Cabang", path: "/cabang", icon: MapPin },
  ];

  const scrollToSection = (hash: string) => {
    const id = hash.replace("/#", "");
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
    {/* Spacer to offset fixed navbar height */}
    <div aria-hidden className="h-16" />
    <nav
      className={`fixed top-0 inset-x-0 z-50 border-b border-border/60 transition-colors duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl shadow-sm"
          : "bg-background"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-2 lg:gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <DesktopSidebar />
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Kembali"
                className="back-float h-9 w-9 rounded-full flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => {
                if (user && activeBooking) {
                  const path = activeBooking.status === "in_progress"
                    ? `/service/progress/${activeBooking.id}`
                    : `/my-booking/${activeBooking.id}`;
                  navigate(path);
                } else if (user) {
                  toast("✨ Belum ada pesanan aktif", {
                    description: "Yuk buat booking servis sekarang, mobil sehat tanpa antri!",
                    action: {
                      label: "Pesan Sekarang",
                      onClick: () => {
                        if (isAdminOrStaff) setShowQuickBooking(true);
                        else navigate("/booking");
                      },
                    },
                  });
                } else {
                  navigate("/");
                }
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {(() => {
                if (!user) return null;
                if (location.pathname.startsWith("/dashboard")) return null;
                const isLive = !!user && !!activeBooking;
                return (
                  <div
                    className={`relative p-1.5 rounded-lg transition-colors ${
                      isLive
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30"
                        : "bg-muted border border-border"
                    }`}
                    title={
                      isLive
                        ? "Pesanan Anda sedang berjalan — klik untuk melihat status"
                        : "Belum ada booking aktif — yuk buat pesanan baru!"
                    }
                    aria-label={isLive ? "Status booking: aktif" : "Status booking: tidak aktif"}
                  >
                    <span className="flex items-center gap-1.5">
                      {isLive ? (
                        <motion.span
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                          className="inline-flex"
                        >
                          <CarFront className="h-5 w-5 text-primary" />
                        </motion.span>
                      ) : (
                        <CarFront
                          className="h-5 w-5 text-muted-foreground"
                        />
                      )}
                      {isLive && (
                        <span className="text-xs font-semibold text-primary pr-1">Status</span>
                      )}
                    </span>
                    <span
                      className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                        isLive
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-muted-foreground/50"
                      }`}
                    />
                  </div>
                );
              })()}
              <img src={logoLight} alt={brandName} className="h-7 w-auto object-contain hidden sm:block" />
              <span className="hidden 2xl:inline max-w-[160px] truncate font-bold text-lg">{brandName}</span>
            </button>
          </div>

          {/* Horizontal Nav Links - Desktop */}
          <div className="hidden md:flex flex-1 min-w-0 items-center justify-center px-0 lg:px-2">
            <div className="flex w-full max-w-[44rem] items-center justify-center gap-0.5 lg:gap-1 whitespace-nowrap">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => {
                    if (link.path.startsWith("/#")) scrollToSection(link.path);
                    else if (link.path === "/") {
                      navigate("/");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } else navigate(link.path);
                  }}
                  className={`group relative flex shrink-0 items-center justify-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all duration-200 hover:bg-primary/5 active:scale-95 ${
                    location.pathname === link.path
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <link.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
                  <span>{link.label}</span>
                  <span className={`absolute bottom-0.5 left-3 right-3 h-[2px] bg-primary rounded-full origin-left transition-transform duration-300 ease-out ${
                    location.pathname === link.path ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user && <NotificationBell />}
            {!user && (
              <Button onClick={() => openLoginDialog()} className="hidden md:flex">
                {t.common.signIn}
              </Button>
            )}
            <MobileNav />
          </div>
        </div>
      </div>
    </nav>
    {isAdminOrStaff && (
      <StaffQuickBookingDialog open={showQuickBooking} onOpenChange={setShowQuickBooking} />
    )}
    </>
  );
};

export default Navbar;
