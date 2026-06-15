import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePromoPopups, markSeen, logPopupEvent } from "@/hooks/usePromoPopups";
import PromoPopupDialog from "./PromoPopupDialog";

const PromoPopupManager = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { popup } = usePromoPopups(location.pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (popup) {
      setOpen(true);
      logPopupEvent(popup.id, "impression", user?.id ?? null);
      markSeen(popup);
    }
  }, [popup, user?.id]);

  if (!popup) return null;

  return (
    <PromoPopupDialog
      popup={popup}
      open={open}
      onClose={() => {
        logPopupEvent(popup.id, "dismiss", user?.id ?? null);
        setOpen(false);
      }}
      onCtaClick={(which) => {
        logPopupEvent(
          popup.id,
          which === "primary" ? "cta_click" : "cta_secondary_click",
          user?.id ?? null,
        );
      }}
    />
  );
};

export default PromoPopupManager;