// Phase 5.3 — Signature pad (canvas), touch + mouse. Design-only, state local.
import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  label: string;
  /** Kept for API compatibility — the pad is now fluid (aspect-ratio based). */
  height?: number;
  onChange?: (dataUrl: string | null) => void;
  className?: string;
}

export function SignaturePad({ label, onChange, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Fluid canvas: track the container size and re-scale the backing store,
  // preserving any existing ink across resizes / orientation changes.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const applySize = () => {
      const rect = c.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const nextW = Math.round(rect.width * dpr);
      const nextH = Math.round(rect.height * dpr);
      if (c.width === nextW && c.height === nextH) return;

      // Snapshot existing ink so a resize never wipes a signature.
      let snapshot: HTMLCanvasElement | null = null;
      if (c.width > 0 && c.height > 0) {
        snapshot = document.createElement("canvas");
        snapshot.width = c.width;
        snapshot.height = c.height;
        snapshot.getContext("2d")?.drawImage(c, 0, 0);
      }

      c.width = nextW;
      c.height = nextH;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      if (snapshot) ctx.drawImage(snapshot, 0, 0, nextW, nextH);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "hsl(var(--foreground))";
    };

    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const getPos = (e: PointerEvent | React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };
  const end = () => {
    drawing.current = false;
    const c = canvasRef.current;
    if (c && onChange) onChange(hasInk ? c.toDataURL("image/png") : null);
  };
  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div className={cn("w-full max-w-full space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 break-words text-[clamp(0.7rem,2vw,0.8rem)] font-medium leading-snug text-muted-foreground [overflow-wrap:anywhere]">
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="h-7 gap-1 px-2 text-xs"
          disabled={!hasInk}
        >
          <Eraser className="h-3 w-3" />
          Hapus
        </Button>
      </div>
      <div className="relative aspect-[16/6] max-h-[180px] min-h-[110px] w-full max-w-full rounded-lg border border-dashed border-border bg-background/60">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-full w-full touch-none rounded-lg"
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center text-[clamp(0.66rem,2vw,0.75rem)] text-muted-foreground/60">
            Tanda tangan di sini
          </span>
        )}
      </div>
    </div>
  );
}