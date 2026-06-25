import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useEffect, useState } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [topOffset, setTopOffset] = useState(32);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => {
      setIsMobile(mq.matches);
      // Read safe-area-inset-top via a probe element so we can offset toasts
      // below the Android/iOS status bar AND the fixed navbar (h-14 = 56px).
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:env(safe-area-inset-top);visibility:hidden;pointer-events:none;";
      document.body.appendChild(probe);
      const safeTop = probe.getBoundingClientRect().top;
      probe.remove();
      const navbar = 56; // h-14
      const gap = mq.matches ? 8 : 12;
      setTopOffset(Math.round(safeTop + navbar + gap));
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      duration={4000}
      visibleToasts={4}
      closeButton
      swipeDirections={["top", "left", "right"]}
      offset={topOffset}
      className="toaster group"
      style={
        {
          // center the toast container horizontally with comfortable side padding
          "--width": isMobile ? "calc(100vw - 2rem)" : "380px",
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
