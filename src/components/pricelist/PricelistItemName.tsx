import { useLayoutEffect, useRef, useState } from "react";
import { CarFront, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function PricelistItemName({ name, vehicleModel }: { name: string | null; vehicleModel: string | null }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) {
      setTruncated(false);
      return;
    }
    // The detail button is absolutely positioned: showing it must not change
    // the measured text width and create a resize feedback loop.
    const measure = () => setTruncated(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [name, vehicleModel]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 shrink truncate text-[15px] font-semibold leading-5">{name}</div>
      {vehicleModel && (
        <div className="relative flex min-w-0 flex-1 items-center gap-1 pr-6 text-[11px] leading-5 text-muted-foreground">
          <CarFront className="h-3 w-3 shrink-0" />
          <span ref={textRef} className="min-w-0 flex-1 truncate">{vehicleModel}</span>
          {truncated && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute right-0 h-5 w-5 rounded text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3" aria-label={`Lihat model kendaraan untuk ${name || "barang"}`} title="Lihat model kendaraan lengkap">
                  <Info />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
                <p className="break-words text-sm font-semibold">{name}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Model kendaraan</p>
                <p className="mt-2 max-h-[50dvh] overflow-y-auto whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{vehicleModel}</p>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
}