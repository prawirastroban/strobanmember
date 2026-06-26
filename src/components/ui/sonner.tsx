import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  // Use a pure CSS expression so the offset always reflects the live
  // safe-area-inset-top (Android status bar / iOS notch) without any JS
  // race condition. 3.5rem = navbar height (h-14), 0.5rem = gap.
  const topOffset =
    "calc(env(safe-area-inset-top, 0px) + 3.5rem + 0.5rem)";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      duration={4000}
      visibleToasts={4}
      closeButton
      swipeDirections={["top", "left", "right"]}
      offset={topOffset}
      mobileOffset={topOffset}
      className="toaster group"
      style={
        {
          // center the toast container horizontally with comfortable side padding
          "--width": "min(380px, calc(100vw - 2rem))",
          left: "50%",
          right: "auto",
          transform: "translateX(-50%)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "toast-float group toast !mx-auto !rounded-2xl !shadow-2xl !cursor-pointer",
          title: "text-sm font-semibold",
          description: "text-xs text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:!bg-card group-[.toast]:!border-primary/50 group-[.toast]:!text-primary group-[.toast]:!h-6 group-[.toast]:!w-6 group-[.toast]:!rounded-full group-[.toast]:!aspect-square group-[.toast]:!flex group-[.toast]:!items-center group-[.toast]:!justify-center group-[.toast]:!p-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
