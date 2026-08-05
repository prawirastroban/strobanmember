import { useNavigate } from "react-router-dom";
import { ShoppingBasket, Minus, Plus, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useCartDialog } from "@/contexts/CartDialogContext";
import { cn } from "@/lib/utils";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const QtyStepper = ({
  item,
  onMinus,
  onPlus,
}: {
  item: CartItem;
  onMinus: () => void;
  onPlus: () => void;
}) => (
  <div className="flex items-center gap-2 shrink-0">
    <button
      type="button"
      onClick={onMinus}
      aria-label={`Kurangi ${item.name}`}
      className="h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/70 flex items-center justify-center transition-colors active:scale-95"
    >
      <Minus className="h-4 w-4" />
    </button>
    <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-foreground">
      {item.qty ?? 1}
    </span>
    <button
      type="button"
      onClick={onPlus}
      aria-label={`Tambah ${item.name}`}
      className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors active:scale-95 shadow-[0_6px_18px_-8px_hsl(var(--primary))]"
    >
      <Plus className="h-4 w-4" />
    </button>
  </div>
);

const ItemRow = ({ item }: { item: CartItem }) => {
  const { increment, decrement, items, setItems } = useCart();
  const handleMinus = () => {
    if ((item.qty ?? 1) <= 1) {
      const snapshot = items.slice();
      decrement(item.id);
      toast.success(`${item.name} dihapus`, {
        action: { label: "Urungkan", onClick: () => setItems(snapshot) },
        duration: 4000,
      });
      return;
    }
    decrement(item.id);
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground line-clamp-2">{item.name}</p>
        <p className="text-sm font-bold text-primary tabular-nums mt-0.5">
          {formatIDR((item.price || 0) * (item.qty ?? 1))}
        </p>
      </div>
      <QtyStepper item={item} onMinus={handleMinus} onPlus={() => increment(item.id)} />
    </div>
  );
};

/**
 * Popup "Keranjang Servis" — muncul sebelum user lanjut ke halaman booking.
 * Alur: pilih layanan → popup keranjang → booking/checkout.
 */
const CartSheetDialog = () => {
  const navigate = useNavigate();
  const { open, setOpen, closeCart } = useCartDialog();
  const { items, total } = useCart();

  const services = items.filter((i) => (i.kind ?? "service") === "service");
  const products = items.filter((i) => i.kind === "product");
  const grouped = products.length > 0;

  const handleContinue = () => {
    closeCart();
    navigate("/booking?cart=1");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-border/60 bg-card/95 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
          <ShoppingBasket className="h-6 w-6 text-primary shrink-0" />
          <DialogTitle className="flex-1 text-lg font-bold text-foreground">Keranjang Servis</DialogTitle>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Tutup keranjang"
            className="h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/70 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="max-h-[45vh] overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Keranjang masih kosong.</p>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  navigate("/katalog");
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
              >
                Lihat Katalog <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {grouped && services.length > 0 && (
                <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Layanan
                </p>
              )}
              {services.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
              {grouped && (
                <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Produk
                </p>
              )}
              {products.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border/60 bg-muted/30 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total Pembayaran:</span>
              <span className="text-xl font-extrabold text-primary tabular-nums">
                {formatIDR(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-full py-3.5",
                "bg-primary text-primary-foreground font-bold",
                "shadow-[0_12px_30px_-12px_hsl(var(--primary))] transition-transform active:scale-[0.99]"
              )}
            >
              Lanjut ke Pembayaran <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CartSheetDialog;
