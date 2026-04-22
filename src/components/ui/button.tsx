import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/40 shadow-[0_0_6px_hsl(var(--primary)/0.2)] hover:bg-primary hover:scale-[1.02] hover:shadow-[0_0_10px_hsl(var(--primary)/0.3),0_0_20px_hsl(var(--primary)/0.1)]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/40 shadow-[0_0_6px_hsl(var(--destructive)/0.2)] hover:scale-[1.02] hover:shadow-[0_0_10px_hsl(var(--destructive)/0.3),0_0_20px_hsl(var(--destructive)/0.1)]",
        outline:
          "border border-primary/30 bg-background/40 backdrop-blur-sm text-foreground hover:bg-primary/10 hover:border-primary/50 hover:scale-[1.02] hover:shadow-[0_0_8px_hsl(var(--primary)/0.25)] hover:text-primary",
        secondary:
          "bg-card/70 backdrop-blur-sm text-foreground border border-primary/25 hover:scale-[1.02] hover:border-primary/45 hover:shadow-[0_0_10px_hsl(var(--primary)/0.25)] hover:text-primary",
        ghost:
          "text-foreground hover:bg-primary/10 hover:text-primary hover:scale-[1.02] hover:shadow-[0_0_6px_hsl(var(--primary)/0.2)]",
        link: "text-primary underline-offset-4 hover:underline",
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
  loading?: boolean;
  loadingText?: string;
}

interface Ripple { id: number; x: number; y: number; size: number; }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, disabled, onClick, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [ripples, setRipples] = React.useState<Ripple[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const id = Date.now() + Math.random();
      setRipples((prev) => [...prev, { id, x, y, size }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
      onClick?.(e);
    };

    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {loading && loadingText ? loadingText : children}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="pointer-events-none absolute rounded-full bg-current opacity-25 animate-[ripple_600ms_ease-out_forwards]"
            style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          />
        ))}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
