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
import { CarFront, LogOut, User, Settings, CalendarCheck, MapPin, Phone, Wrench, Info, Disc3, Package, LayoutDashboard, ClipboardCheck, Tag, LayoutGrid } from "lucide-react";
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
  const [showBookBtn, setShowBookBtn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [activeBooking, setActiveBooking] = useState<{ id: string; status: string; pendingSpkId?: string | null } | null>(null);
  const [showQuickBooking, setShowQuickBooking] = useState(false);

  // Fetch pending bookings + customer approval shortcut for status button
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
      // Highest priority: any SPK that needs the customer approval, even if
      // its booking is not the latest active booking shown in the tracker.
      const { data: pendingSpk } = await supabase
        .from("spk_orders")
        .select("id, booking_id, status")
        .eq("customer_id", user.id)
        .eq("status", "awaiting_customer_approval")
        .not("booking_id", "is", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingSpk?.id) {
        setActiveBooking({
          id: pendingSpk.booking_id ?? pendingSpk.id,
          status: pendingSpk.status,
          pendingSpkId: pendingSpk.id,
        });
        return;
      }

      const { data } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("user_id", user.id)
        .not("status", "in", "(completed,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) { setActiveBooking(null); return; }
      setActiveBooking({ ...data, pendingSpkId: null });
    };
    fetchPending();
    fetchActive();

    const bookingChannel = supabase
      .channel("navbar-booking-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, () => {
        fetchPending();
        fetchActive();
      })
      .subscribe();

    const spkChannel = supabase
      .channel("navbar-spk-approval-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "spk_orders", filter: `customer_id=eq.${user.id}` }, () => {
        fetchActive();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(spkChannel);
    };
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
    {/* Spacer to offset fixed navbar height (incl. safe-area for notch/status bar on Android edge-to-edge) */}
    <div
      aria-hidden
      style={{ height: "calc(3.5rem + env(safe-area-inset-top))" }}
    />
    <nav
      className={`fixed top-0 inset-x-0 z-50 border-b border-border/60 transition-colors duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl shadow-sm"
          : "bg-background"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-2 lg:gap-3 py-0">
          <div className="flex items-center gap-2 shrink-0">
            <DesktopSidebar />
            <button
              onClick={() => {
                if (user && activeBooking) {
                  const path = activeBooking.pendingSpkId
                    ? `/spk/${activeBooking.pendingSpkId}/approve`
                    : activeBooking.status === "in_progress"
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
                 const needsApproval = !!activeBooking?.pendingSpkId;
                return (
                  <div
                    className={`relative p-1.5 rounded-lg transition-colors ${
                      isLive
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30"
                        : "bg-muted border border-border"
                    }`}
                     title={
                       needsApproval
                         ? "SPK menunggu persetujuan Anda — klik untuk approve"
                         : isLive
                         ? "Pesanan Anda sedang berjalan — klik untuk melihat status"
                         : "Belum ada booking aktif — yuk buat pesanan baru!"
                     }
                     aria-label={needsApproval ? "SPK menunggu persetujuan" : isLive ? "Status booking: aktif" : "Status booking: tidak aktif"}
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
                         <span className="text-xs font-semibold text-primary pr-1">
                           {needsApproval ? "Approve SPK" : "Status"}
                         </span>
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
            </button>
          </div>

          <div className="flex-1" />

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
