// Fluid auto-fit grid — replaces every fixed grid-cols-N in the SPK surface.
// Columns collapse to a single column automatically when the container is
// narrower than `min`, without any breakpoint bookkeeping.
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpkGridProps {
  children: ReactNode;
  /** Minimum comfortable column width. Defaults to 15rem. */
  min?: string;
  className?: string;
  style?: CSSProperties;
}

export function SpkGrid({ children, min = "15rem", className, style }: SpkGridProps) {
  return (
    <div
      className={cn("grid w-full max-w-full gap-3 [&>*]:min-w-0", className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}), 1fr))`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}