import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePromoPopups, markSeen, logPopupEvent } from "@/hooks/usePromoPopups";
import { useOverlayQueue } from "@/contexts/OverlayQueueContext";
import PromoPopupDialog from "./PromoPopupDialog";

const PromoPopupManager = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { popup } = usePromoPopups(location.pathname);
  const { request, release, isActive } = useOverlayQueue();
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (popup && !requested) {
      request("promo");
      setRequested(true);
    }
  }, [popup, requested, request]);

  // Open the dialog only when our slot becomes active.
  useEffect(() => {
    if (popup && requested && isActive("promo") && !open) {
      setOpen(true);
      logPopupEvent(popup.id, "impression", user?.id ?? null);
      markSeen(popup);
    }
  }, [popup, requested, isActive, open, user?.id]);

  // Release the slot on unmount so queue can advance.
  useEffect(() => {
    return () => {
      release("promo");
    };
  }, [release]);

  if (!popup) return null;

  return (
    <PromoPopupDialog
      popup={popup}
      open={open}
      onClose={() => {
        logPopupEvent(popup.id, "dismiss", user?.id ?? null);
        setOpen(false);
        release("promo");
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