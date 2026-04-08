import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface StaffRouteProps {
  children: React.ReactNode;
}

const StaffRoute = ({ children }: StaffRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only "staff" role can access, NOT admin
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default StaffRoute;
