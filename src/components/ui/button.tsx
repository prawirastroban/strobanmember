import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-[15px] font-semibold normal-case ring-offset-background transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[#ff2b2b] text-white hover:bg-[#ff2b2b]/95 active:opacity-90",
        destructive:
          "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/20",
        outline:
          "bg-white/10 text-foreground border border-white/15 hover:bg-white/15",
        secondary:
          "bg-white/10 text-foreground border border-white/15 hover:bg-white/15",
        ghost:
          "text-foreground hover:bg-white/8",
        link:
          "text-[#ff2b2b] font-medium underline-offset-4 hover:underline active:opacity-70 px-0 active:scale-100",
      },
      size: {
        default: "min-h-[44px] px-6 py-3",
        sm: "min-h-[36px] rounded-[12px] px-4 text-[13px]",
        lg: "min-h-[48px] rounded-[14px] px-8",
        icon: "h-9 w-9 rounded-full bg-white/8 hover:bg-white/12 p-0",
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
