import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
            {/* Swipe-up affordance */}
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-foreground/15" />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
