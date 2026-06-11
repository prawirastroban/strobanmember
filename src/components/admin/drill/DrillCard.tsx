import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrillCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  /** Destination URL. Omit (or set undefined) → renders disabled state. */
  href?: string;
  trend?: number;
  trendLabel?: string;
  accent?: boolean;
  /** Reason shown in tooltip when href is missing. */
  reason?: string;
  className?: string;
}

/**
 * KPI card with drill-down. When `href` is set, the whole card becomes a
 * keyboard-accessible link with a hover ring + arrow affordance.
 * When `href` is missing, the card is rendered as a passive panel with a
 * tooltip explaining why detail is unavailable.
 */
export default function DrillCard({
  icon: Icon,
  label,
  value,
  href,
  trend,
  trendLabel,
  accent = false,
  reason = "Detail belum tersedia",
  className,
}: DrillCardProps) {
  const isUp = (trend ?? 0) >= 0;

  const body = (
    <Card
      className={cn(
        "bg-card/60 backdrop-blur-xl border-border/50 shadow-[var(--shadow-soft)] rounded-2xl transition-all duration-200",
        href && "group hover:shadow-[var(--shadow-medium)] hover:ring-1 hover:ring-primary/40 hover:-translate-y-0.5 cursor-pointer",
        accent && "ring-1 ring-primary/30",
        className,
      )}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight truncate">{value}</p>
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 min-h-[18px]">
          {trend !== undefined ? (
            <div className={cn("flex items-center gap-1 text-xs", isUp ? "text-emerald-400" : "text-red-400")}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span className="font-medium">{isUp ? "+" : ""}{trend}</span>
              {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
            </div>
          ) : <span />}
          {href && (
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div aria-disabled className="opacity-90">{body}</div>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to={href}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
      aria-label={`${label}: ${value}`}
    >
      {body}
    </Link>
  );
}