import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export interface CatalogTire {
  id: string;
  brand: string;
  type: string;
  size: string;
  category: string;
  description: string | null;
  oem_compatibility: string[];
  image_url: string | null;
  logo_url: string | null;
}

interface TireResultCardProps {
  tire: CatalogTire;
  onOpen: (tire: CatalogTire) => void;
}

const TireResultCard = ({ tire, onOpen }: TireResultCardProps) => (
  <article
    onClick={() => onOpen(tire)}
    className="group relative flex items-stretch gap-3 bg-card border border-border rounded-2xl overflow-hidden p-2.5 hover:border-primary/60 hover:shadow-[0_8px_24px_hsl(var(--primary)/0.15)] transition-all duration-300 cursor-pointer"
  >
    <div className="relative w-24 sm:w-28 shrink-0 self-stretch min-h-[104px] rounded-xl overflow-hidden bg-muted">
      <img
        src={tire.image_url || "/placeholder.svg"}
        alt={`Ban ${tire.brand} ${tire.type} ukuran ${tire.size}`}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/placeholder.svg";
        }}
        className="w-full h-full object-cover"
      />
    </div>

    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Badge className="mb-1 bg-primary text-primary-foreground text-[9px] uppercase tracking-wide">
            Ban
          </Badge>
          <h3 className="text-[15px] font-extrabold text-primary leading-tight line-clamp-2">
            {tire.brand} {tire.type}
          </h3>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(tire);
          }}
          aria-label={`Info lengkap ban ${tire.brand} ${tire.type}`}
          className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full border border-border text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {tire.description && (
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {tire.description}
        </p>
      )}

      <div className="mt-auto pt-2 flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="font-mono text-[11px] border-primary/30 text-primary px-1.5 py-0">
          {tire.size}
        </Badge>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {tire.category}
        </Badge>
      </div>
    </div>
  </article>
);

export default TireResultCard;
