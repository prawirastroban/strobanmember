import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useCartDialog } from "@/contexts/CartDialogContext";
import { cn } from "@/lib/utils";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Gojek-style floating "Pesanan" pill that appears above the bottom nav
 * whenever the user has services in their cart but hasn't checked out yet.
 * Hidden on /booking* (its own sticky bar handles it), /dashboard, /auth.
 */
const FloatingCartPill = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { items, count, total, clear, setItems } = useCart();
  const { openCart } = useCartDialog();

  const hidden =
    count === 0 ||
    pathname === "/booking" ||
    pathname.startsWith("/booking/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/checkout");

  if (hidden) return null;

  const summary =
    count === 1
      ? items[0].name
      : `${items[0].name} +${count - 1} lainnya`;

  const goToBooking = () => openCart();

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const snapshot: CartItem[] = items.slice();
    clear();
    toast.success("Pesanan dikosongkan", {
      action: {
        label: "Urungkan",
        onClick: () => setItems(snapshot),
      },
      duration: 5000,
    });
  };

  // mobile: bottom-[72px] (above 64px BottomNav + safe area). desktop md+: bottom-6 right-6.
  return (
    <div
      className={cn(
        "fixed z-40 px-3 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:px-0 md:max-w-md",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
      style={{
        // On mobile, sit above BottomNav (h-16 = 4rem) + Android gesture/home
        // inset. md+ override comes from md:bottom-6 utility above.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem + 0.5rem)",
      }}
      role="region"
      aria-label="Pesanan tersimpan"
    >
      <button
        type="button"
        onClick={goToBooking}
        className={cn(
          "group w-full flex items-center gap-3 rounded-full px-4 py-3 text-left",
          "bg-primary text-primary-foreground",
          "shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.7),0_0_18px_hsl(var(--primary)/0.45)]",
          "border border-primary/40 backdrop-blur-md",
          "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
        )}
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-foreground/15 shrink-0">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold leading-tight">
              {count} layanan
            </span>
            <span className="text-sm font-bold leading-tight opacity-90">
              · {formatIDR(total)}
            </span>
          </div>
          <p className="text-[11px] opacity-90 truncate leading-tight">
            Lanjutkan pesanan: {summary}
          </p>
        </div>
        <span
          onClick={handleClear}
          role="button"
          aria-label="Kosongkan pesanan"
          className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 shrink-0 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </span>
      </button>
    </div>
  );
};

export default FloatingCartPill;