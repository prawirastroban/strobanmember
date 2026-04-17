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
import { Car, LogOut, User, Settings, CalendarCheck, MapPin, Phone, Wrench, Info, Disc3, Package, LayoutDashboard, ClipboardCheck } from "lucide-react";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import MobileNav from "./MobileNav";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import StaffQuickBookingDialog from "./admin/StaffQuickBookingDialog";
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

const SCROLL_THRESHOLD = 400;

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { isStaff, isAdminOrStaff, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showBookBtn, setShowBookBtn] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [showQuickBooking, setShowQuickBooking] = useState(false);

  // Fetch pending bookings for badge on profile
  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      setPendingBookings(count || 0);
    };
    fetchPending();

    const channel = supabase
      .channel("navbar-booking-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, () => {
        fetchPending();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const onScroll = () => setShowBookBtn(window.scrollY > SCROLL_THRESHOLD);
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
    { label: t.navbar.dashboard || "Beranda", path: "/", icon: Car },
    { label: t.catalog?.label || "Layanan", path: "/#services", icon: Wrench },
    { label: t.tireCatalog?.navLabel || "Katalog Ban", path: "/#tire-catalog", icon: Disc3 },
    { label: t.branches?.title || "Cabang", path: "/#branches", icon: MapPin },
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
    <nav className="bg-background border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <MobileNav />
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="p-1.5 bg-primary rounded-lg">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm sm:text-lg">{t.common.appName}</span>
            </button>
          </div>

          {/* Horizontal Nav Links - Desktop */}
          <div className="hidden md:flex flex-1 min-w-0 items-center justify-center px-2 lg:px-4">
            <div className="flex items-center gap-0.5 overflow-x-auto whitespace-nowrap no-scrollbar">
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
                  className="group relative flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-primary transition-all duration-200 hover:bg-primary/5 active:scale-95"
                >
                  <link.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
                  <span className="whitespace-nowrap">{link.label}</span>
                  <span className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-primary rounded-full origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showBookBtn && (
                <motion.button
                  key="nav-book"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  onClick={() => {
                    if (!user) return openLoginDialog("/booking");
                    if (isAdminOrStaff) return setShowQuickBooking(true);
                    navigate("/booking");
                  }}
                  className="hidden md:flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {t.hero.bookService}
                </motion.button>
              )}
            </AnimatePresence>
            <LanguageSwitcher />
            {user && <NotificationBell />}
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      {pendingBookings > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse ring-2 ring-background">
                          {pendingBookings > 9 ? "9+" : pendingBookings}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {user.user_metadata?.full_name || t.common.member}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/")}>
                      <User className="mr-2 h-4 w-4" />
                      {t.navbar.dashboard}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t.navbar.myProfile}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-vehicles")}>
                      <Car className="mr-2 h-4 w-4" />
                      Kendaraan Saya
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile/history-perawatan")}>
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      History Perawatan
                    </DropdownMenuItem>
                    {!roleLoading && isAdminOrStaff && (
                      <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowSignOutDialog(true)}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.common.signOut}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin keluar dari akun ini?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSignOut}>Ya, Keluar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button onClick={() => openLoginDialog()} className="hidden md:flex">
                {t.common.signIn}
              </Button>
            )}
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
