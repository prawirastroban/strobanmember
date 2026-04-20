import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "badge-float focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "",
        secondary: "",
        destructive: "",
        outline: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

// Detect dominant tone from className so border/glow follow content color
const detectTone = (className?: string): string => {
  if (!className) return "primary";
  const c = className.toLowerCase();
  if (/(emerald|green)-/.test(c)) return "emerald";
  if (/(amber|yellow)-/.test(c)) return "amber";
  if (/(blue|sky|indigo)-/.test(c)) return "blue";
  if (/(red|rose)-/.test(c) || c.includes("destructive")) return "red";
  if (/(muted|gray|slate|zinc|neutral)-/.test(c) || c.includes("muted")) return "neutral";
  return "primary";
};

function Badge({ className, variant, ...props }: BadgeProps) {
  const tone = detectTone(className);
  return <div data-tone={tone} className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
