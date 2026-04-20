import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      duration={4000}
      visibleToasts={4}
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "toast-float group toast",
          title: "text-sm font-semibold",
          description: "text-xs text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:!bg-card group-[.toast]:!border-primary/50 group-[.toast]:!text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
