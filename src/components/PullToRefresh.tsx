import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const TRIGGER = 70;
const MAX = 110;

/** Bilah tarik-untuk-muat-ulang; konten tidak ikut tertarik. */
const PullToRefresh = () => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const insideOverlay = (t: EventTarget | null) => {
      if (!(t instanceof Element)) return false;
      if (t.closest('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper],[vaul-drawer],[data-vaul-drawer]')) return true;
      for (let el: Element | null = t; el && el !== document.body; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) return true;
      }
      return false;
    };
    const onStart = (e: TouchEvent) => {
      const overlayOpen = document.querySelector('[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]');
      if (overlayOpen || insideOverlay(e.target)) { startY.current = null; return; }
      if (window.scrollY <= 0 && !refreshing && e.touches.length === 1) startY.current = e.touches[0].clientY;
      else startY.current = null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) { pullRef.current = 0; setPull(0); return; }
      if (e.cancelable) e.preventDefault();
      const v = Math.min(MAX, dy * 0.5);
      pullRef.current = v;
      setPull(v);
    };
    const onEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pullRef.current >= TRIGGER) {
        setRefreshing(true);
        setPull(TRIGGER);
        setTimeout(() => window.location.reload(), 400);
      } else setPull(0);
      pullRef.current = 0;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [refreshing]);

  if (pull <= 0 && !refreshing) return null;
  const ready = pull >= TRIGGER;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center lg:hidden"
      style={{ top: `calc(3.5rem + env(safe-area-inset-top) + ${pull * 0.4}px)`, opacity: Math.min(1, pull / 40) }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-xl">
        <RefreshCw
          className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
        {refreshing ? "Memuat ulang…" : ready ? "Lepas untuk muat ulang" : "Tarik untuk muat ulang"}
      </div>
    </div>
  );
};

export default PullToRefresh;
