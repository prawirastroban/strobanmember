import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Native-like edge-swipe back gesture (mobile only).
 * - Drag right from the LEFT 24px edge.
 * - Threshold: > 80px OR > 25% viewport width.
 * - Skips when there's no history (e.g. first load on /).
 */
const EDGE_PX = 24;
const SwipeBackProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Add a brief enter animation on every navigation
    document.body.classList.add("page-swipe-enter");
    const t = window.setTimeout(() => document.body.classList.remove("page-swipe-enter"), 260);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;

    const overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:9999",
      "background:hsl(var(--background))",
      "transform:translateX(-100%)",
      "pointer-events:none", "will-change:transform,opacity",
      "opacity:0",
    ].join(";");
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    const reset = (animate: boolean) => {
      if (!overlay) return;
      overlay.style.transition = animate
        ? "transform 200ms cubic-bezier(0.2,0,0,1), opacity 200ms ease"
        : "none";
      overlay.style.transform = "translateX(-100%)";
      overlay.style.opacity = "0";
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (x > EDGE_PX) return;
      // Skip if user is interacting with horizontal scroller
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-no-swipe-back], .embla, .keen-slider, [data-radix-scroll-area-viewport]")) return;
      startX.current = x;
      startY.current = y;
      tracking.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startX.current == null || startY.current == null) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      // If predominantly vertical, abort (let normal scroll happen)
      if (dy > 30 && dy > dx) {
        tracking.current = false;
        reset(true);
        return;
      }
      if (dx <= 0) return;
      const w = window.innerWidth;
      const pct = Math.min(1, dx / w);
      overlay.style.transition = "none";
      overlay.style.transform = `translateX(${-100 + pct * 100}%)`;
      overlay.style.opacity = String(Math.min(1, pct * 1.4));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current || startX.current == null) return;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - startX.current;
      tracking.current = false;
      const w = window.innerWidth;
      if (dx > Math.max(80, w * 0.25)) {
        // commit: animate overlay fully then navigate back
        overlay.style.transition = "transform 180ms cubic-bezier(0.2,0,0,1), opacity 180ms ease";
        overlay.style.transform = "translateX(0)";
        overlay.style.opacity = "1";
        window.setTimeout(() => {
          if (window.history.length > 1) navigate(-1);
          reset(false);
        }, 180);
      } else {
        reset(true);
      }
      startX.current = null;
      startY.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      overlay.remove();
      overlayRef.current = null;
    };
  }, [navigate]);

  return <>{children}</>;
};

export default SwipeBackProvider;