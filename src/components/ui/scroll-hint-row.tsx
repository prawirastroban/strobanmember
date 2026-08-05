import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollHintRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** className untuk container scroll (horizontal) */
  className?: string;
  /** className untuk wrapper luar (relative) */
  wrapperClassName?: string;
  children: React.ReactNode;
}

/**
 * Membungkus baris scroll horizontal dan menampilkan panah + fade
 * di sisi kiri/kanan saat konten masih bisa digeser.
 */
export const ScrollHintRow = React.forwardRef<HTMLDivElement, ScrollHintRowProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const [canLeft, setCanLeft] = React.useState(false);
    const [canRight, setCanRight] = React.useState(false);

    const update = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      setCanLeft(el.scrollLeft > 4);
      setCanRight(max > 4 && el.scrollLeft < max - 4);
    }, []);

    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      update();
      el.addEventListener("scroll", update, { passive: true });
      const ro = new ResizeObserver(update);
      ro.observe(el);
      Array.from(el.children).forEach((c) => ro.observe(c));
      window.addEventListener("resize", update);
      return () => {
        el.removeEventListener("scroll", update);
        ro.disconnect();
        window.removeEventListener("resize", update);
      };
    }, [update, children]);

    const scrollBy = (dir: -1 | 1) => {
      const el = innerRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.7), behavior: "smooth" });
    };

    return (
      <div className={cn("relative min-w-0", wrapperClassName)}>
        <div
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={className}
          {...props}
        >
          {children}
        </div>

        {canLeft && (
          <button
            type="button"
            aria-label="Geser ke kiri"
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-card/95 border border-border/70 shadow-sm flex items-center justify-center text-muted-foreground active:scale-95 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}

        {canRight && (
          <button
            type="button"
            aria-label="Geser ke kanan"
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-card/95 border border-border/70 shadow-sm flex items-center justify-center text-muted-foreground active:scale-95 transition"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);
ScrollHintRow.displayName = "ScrollHintRow";

interface ScrollHintColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  wrapperClassName?: string;
  children: React.ReactNode;
}

/** Versi vertikal: panah atas/bawah + fade saat konten masih bisa digulir. */
export const ScrollHintColumn = React.forwardRef<HTMLDivElement, ScrollHintColumnProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const [canUp, setCanUp] = React.useState(false);
    const [canDown, setCanDown] = React.useState(false);

    const update = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setCanUp(el.scrollTop > 4);
      setCanDown(max > 4 && el.scrollTop < max - 4);
    }, []);

    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      update();
      el.addEventListener("scroll", update, { passive: true });
      const ro = new ResizeObserver(update);
      ro.observe(el);
      Array.from(el.children).forEach((c) => ro.observe(c));
      window.addEventListener("resize", update);
      return () => {
        el.removeEventListener("scroll", update);
        ro.disconnect();
        window.removeEventListener("resize", update);
      };
    }, [update, children]);

    const scrollBy = (dir: -1 | 1) => {
      const el = innerRef.current;
      if (!el) return;
      el.scrollBy({ top: dir * Math.max(120, el.clientHeight * 0.7), behavior: "smooth" });
    };

    return (
      <div className={cn("relative min-h-0", wrapperClassName)}>
        <div
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={className}
          {...props}
        >
          {children}
        </div>

        {canUp && (
          <button
            type="button"
            aria-label="Gulir ke atas"
            onClick={() => scrollBy(-1)}
            className="absolute left-1/2 top-0 -translate-x-1/2 h-6 w-6 rounded-full bg-card/95 border border-border/70 shadow-sm flex items-center justify-center text-muted-foreground active:scale-95 transition"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        )}

        {canDown && (
          <button
            type="button"
            aria-label="Gulir ke bawah"
            onClick={() => scrollBy(1)}
            className="absolute left-1/2 bottom-0 -translate-x-1/2 h-6 w-6 rounded-full bg-card/95 border border-border/70 shadow-sm flex items-center justify-center text-muted-foreground active:scale-95 transition"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);
ScrollHintColumn.displayName = "ScrollHintColumn";
