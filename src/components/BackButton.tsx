import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Global floating back button.
 * - Hidden on home, auth, and reset-password routes.
 * - Uses browser history when possible, otherwise falls back to "/".
 * - Styled to match the badge-float (red primary glow) language.
 */
const HIDDEN_ROUTES = ["/", "/auth", "/reset-password"];

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDDEN_ROUTES.includes(location.pathname)) return null;

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Kembali"
      className="back-float fixed left-4 top-[calc(env(safe-area-inset-top,0px)+72px)] md:top-20 z-40 h-10 w-10 rounded-full flex items-center justify-center"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
};

export default BackButton;
