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
import { Car, LogOut, User, Settings, CalendarCheck } from "lucide-react";
import MobileNav from "./MobileNav";
import LanguageSwitcher from "./LanguageSwitcher";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCROLL_THRESHOLD = 400;

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isStaff, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showBookBtn, setShowBookBtn] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBookBtn(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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

  return (
    <nav className="bg-background border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <MobileNav />
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="p-1.5 bg-primary rounded-lg">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-lg">{t.common.appName}</span>
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wide">BUKA SETIAP HARI</span>
              </div>
            </button>
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
                  onClick={() => user ? navigate("/booking") : navigate("/auth?redirect=/booking")}
                  className="hidden md:flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {t.hero.bookService}
                </motion.button>
              )}
            </AnimatePresence>
            <LanguageSwitcher />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
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
                  {!roleLoading && isStaff && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t.navbar.adminPanel}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.common.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/auth")} className="hidden md:flex">
                {t.common.signIn}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
