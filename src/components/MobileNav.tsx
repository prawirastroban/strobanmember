import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Car, LogOut, User, Settings, Menu, Calendar, Home } from "lucide-react";

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isStaff, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/auth");
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <span>Service Buddy</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-4 mt-8">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {user.user_metadata?.full_name || "Member"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {user.email}
                  </span>
                </div>
              </div>

              <nav className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleNavigate("/")}
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleNavigate("/booking")}
                >
                  <Calendar className="h-5 w-5" />
                  Book Service
                </Button>
                {!roleLoading && isStaff && (
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-12"
                    onClick={() => handleNavigate("/admin")}
                  >
                    <Settings className="h-5 w-5" />
                    Admin Panel
                  </Button>
                )}
              </nav>

              <div className="mt-auto pt-4 border-t">
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground px-3">
                Sign in to manage your vehicle services
              </p>
              <Button onClick={() => handleNavigate("/auth")} className="w-full">
                <User className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
