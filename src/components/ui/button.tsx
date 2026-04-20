import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.4),0_0_24px_hsl(var(--primary)/0.15)] hover:bg-primary hover:scale-[1.03] hover:shadow-[0_0_20px_hsl(var(--primary)/0.6),0_0_40px_hsl(var(--primary)/0.25)]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/60 shadow-[0_0_12px_hsl(var(--destructive)/0.4)] hover:scale-[1.03] hover:shadow-[0_0_20px_hsl(var(--destructive)/0.6),0_0_40px_hsl(var(--destructive)/0.25)]",
        outline:
          "border border-primary/50 bg-background/40 backdrop-blur-sm text-foreground shadow-[0_0_8px_hsl(var(--primary)/0.2)] hover:bg-primary/10 hover:border-primary/80 hover:scale-[1.03] hover:shadow-[0_0_16px_hsl(var(--primary)/0.45),0_0_32px_hsl(var(--primary)/0.15)] hover:text-primary",
        secondary:
          "bg-card/70 backdrop-blur-sm text-foreground border border-primary/40 shadow-[0_0_8px_hsl(var(--primary)/0.2)] hover:scale-[1.03] hover:border-primary/70 hover:shadow-[0_0_18px_hsl(var(--primary)/0.5),0_0_36px_hsl(var(--primary)/0.2)] hover:text-primary",
        ghost:
          "text-foreground hover:bg-primary/10 hover:text-primary hover:scale-[1.03] hover:shadow-[0_0_12px_hsl(var(--primary)/0.35)]",
        link: "text-primary underline-offset-4 hover:underline hover:[text-shadow:0_0_8px_hsl(var(--primary)/0.6)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
