import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useEffect, useState } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      duration={4000}
      visibleToasts={4}
      closeButton
      offset={isMobile ? 24 : 32}
      className="toaster group"
      style={
        {
          // center the toast container with comfortable side padding
          "--width": isMobile ? "calc(100vw - 2rem)" : "380px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "toast-float group toast !mx-auto !rounded-2xl !shadow-2xl",
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
