import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Car, Info, Loader2, X, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const formatIDR = (n: number) => {
  if (!n || n <= 0) return "FREE";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
};

const statusColors: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "in-progress": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export interface MobileBookingCardData {
  id: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  service_price: number;
  car_type: string | null;
  car_plate_number: string | null;
}

interface Props {
  booking: MobileBookingCardData;
  onViewDetail: () => void;
  onCancel?: () => void;
  cancelling?: boolean;
  variant?: "active" | "cancelled";
  onPrimaryAction?: () => void;
  primaryLabel?: string;
}

/**
 * Mobile-only compact booking card (max 2 lines visible info).
 * Tap (i) → bottom sheet with full details.
 */
export const MobileBookingCard = ({
  booking,
  onViewDetail,
  onCancel,
  cancelling,
  variant = "active",
  onPrimaryAction,
  primaryLabel = "Lihat Detail",
}: Props) => {
  const [open, setOpen] = useState(false);
  const isCancelled = variant === "cancelled";
  const dateLabel = format(parseISO(booking.booking_date), "dd MMM yyyy");
  const dateShort = format(parseISO(booking.booking_date), "dd MMM");

  return (
    <>
      <div
        className={`relative flex items-center gap-3 p-3 rounded-xl border ${
          isCancelled ? "border-dashed bg-muted/30" : "bg-card hover:bg-accent/5"
        } transition-colors`}
      >
        {/* Icon */}
        <div className={`shrink-0 p-2 rounded-full ${isCancelled ? "bg-muted" : "bg-primary/10"}`}>
          <Wrench className={`h-4 w-4 ${isCancelled ? "text-muted-foreground" : "text-primary"}`} />
        </div>

        {/* Info — max 2 lines */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4
              className={`font-semibold text-sm leading-tight truncate ${
                isCancelled ? "text-muted-foreground" : ""
              }`}
            >
              {booking.service_name}
            </h4>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Info detail"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden">
            <span className="flex items-center gap-0.5 shrink-0">
              <Calendar className="h-3 w-3" />
              {dateShort}
            </span>
            <span className="flex items-center gap-0.5 shrink-0">
              <Clock className="h-3 w-3" />
              {booking.booking_time}
            </span>
          </div>
        </div>

        {/* Always-visible CTA */}
        <Button
          size="sm"
          variant={isCancelled ? "outline" : "default"}
          className="shrink-0 h-8 px-2.5 text-xs whitespace-nowrap"
          onClick={onPrimaryAction ?? onViewDetail}
        >
          {primaryLabel === "Lihat Detail" ? "Detail" : primaryLabel}
        </Button>
      </div>

      {/* Bottom Sheet — full info */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {booking.service_name}
            </DrawerTitle>
            <DrawerDescription>Detail jadwal servis Anda</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge variant="outline" className={statusColors[booking.status] || statusColors.pending}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground">Tanggal</span>
              <span className="text-sm font-medium">{dateLabel}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground">Jam</span>
              <span className="text-sm font-medium">{booking.booking_time}</span>
            </div>

            {(booking.car_type || booking.car_plate_number) && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Car className="h-3.5 w-3.5" />
                  Kendaraan
                </span>
                <span className="text-sm font-medium text-right">
                  {booking.car_type}
                  {booking.car_type && booking.car_plate_number && " • "}
                  {booking.car_plate_number}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/15">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-base font-bold text-primary">{formatIDR(booking.service_price)}</span>
            </div>
          </div>

          <DrawerFooter className="gap-2">
            <Button
              onClick={() => {
                setOpen(false);
                onViewDetail();
              }}
            >
              Lihat Detail Lengkap
            </Button>
            {!isCancelled && booking.status === "pending" && onCancel && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive gap-2"
                disabled={cancelling}
                onClick={() => {
                  setOpen(false);
                  onCancel();
                }}
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Batalkan Booking
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost">Tutup</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileBookingCard;