import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 h-auto max-h-[85dvh] rounded-t-3xl border-t pb-[max(1rem,env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideClose?: boolean;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, hideClose, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <SwipeableSheetContent ref={ref} side={side} hideClose={hideClose} className={className} {...props}>
        {children}
      </SwipeableSheetContent>
    </SheetPortal>
  ),
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

/**
 * Inner content with native-like swipe-down-to-close gesture for `side="bottom"`.
 * Other sides keep the default behavior. Tap-outside-to-close is provided by Radix overlay.
 */
const SwipeableSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, hideClose, ...props }, ref) => {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

  const startY = React.useRef<number | null>(null);
  const dragging = React.useRef(false);
  const swipeEnabled = side === "bottom";

  const reset = () => {
    if (innerRef.current) {
      innerRef.current.style.transition = "transform 220ms cubic-bezier(0.2,0,0,1)";
      innerRef.current.style.transform = "";
      window.setTimeout(() => {
        if (innerRef.current) innerRef.current.style.transition = "";
      }, 240);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled) return;
    // Don't start if pointer began inside a scrollable element that isn't at the top
    const target = e.target as HTMLElement;
    const scrollContainer = target.closest<HTMLElement>("[data-sheet-scroll], .overflow-y-auto, .overflow-auto");
    if (scrollContainer && scrollContainer.scrollTop > 0) return;
    startY.current = e.clientY;
    dragging.current = true;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || startY.current == null || !innerRef.current) return;
    const dy = e.clientY - startY.current;
    if (dy <= 0) {
      innerRef.current.style.transform = "";
      return;
    }
    innerRef.current.style.transform = `translateY(${dy}px)`;
    innerRef.current.style.transition = "none";
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || startY.current == null) {
      dragging.current = false;
      startY.current = null;
      return;
    }
    const dy = e.clientY - startY.current;
    dragging.current = false;
    startY.current = null;
    const height = innerRef.current?.offsetHeight ?? 0;
    // Close if dragged more than 25% of sheet height OR > 120px
    if (dy > Math.max(120, height * 0.25)) {
      // dispatch ESC to close via Radix
      const closeBtn = innerRef.current?.querySelector<HTMLButtonElement>("[data-sheet-close]");
      if (closeBtn) closeBtn.click();
      else {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      }
      reset();
    } else {
      reset();
    }
  };

  return (
    <SheetPrimitive.Content
      ref={innerRef}
      className={cn(sheetVariants({ side }), className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      {...props}
    >
      {swipeEnabled && <div className="sheet-drag-handle" aria-hidden />}
      {children}
      {!hideClose && (
        <SheetPrimitive.Close
          data-sheet-close
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  );
});
SwipeableSheetContent.displayName = "SwipeableSheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
