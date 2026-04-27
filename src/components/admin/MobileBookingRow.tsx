import { useState } from "react";
import { format } from "date-fns";
import { Car, Clock, Info, RefreshCw, ShieldCheck, Wrench, Ban, Flame, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getBookingStatusMeta } from "@/lib/bookingStatus";
import { PRIORITY_META } from "@/lib/bookingPriority";

interface BookingLite {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_status: string;
  car_type: string | null;
  car_plate_number: string | null;
  branch: string | null;
  cancel_requested?: boolean;
  cancel_reason?: string | null;
}

interface Props {
  booking: BookingLite;
  priority: keyof typeof PRIORITY_META;
  overdue: boolean;
  busy: boolean;
  statusOptions: { value: string; label: string; icon: any }[];
  onConfirm: () => void;
  onUpdateStatus: (newStatus: string) => void;
  onApproveCancel: () => void;
  onRejectCancel: () => void;
}

export const MobileBookingRow = ({
  booking, priority, overdue, busy, statusOptions,
  onConfirm, onUpdateStatus, onApproveCancel, onRejectCancel,
}: Props) => {
  const [open, setOpen] = useState(false);
  const meta = getBookingStatusMeta(booking.status);
  const pmeta = PRIORITY_META[priority];
  const needsConfirm =
    (booking.status === "waiting_confirmation" ||
      (booking.status === "pending" && ["paid", "pay_later"].includes(booking.payment_status)));

  return (
    <>
      <div
        className={`relative flex items-center gap-3 p-3 rounded-xl border bg-card ${
          overdue ? "border-red-500/40 bg-red-500/5" : ""
        } ${booking.cancel_requested && booking.status !== "cancelled" ? "border-primary/40" : ""}`}
      >
        <div className="shrink-0 p-2 rounded-full bg-primary/10">
          <Wrench className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-sm leading-tight truncate">{booking.customer_name}</h4>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 text-muted-foreground hover:text-primary"
              aria-label="Detail"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{booking.service_name}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {format(new Date(booking.booking_date), "dd MMM")} • {booking.booking_time}
            </span>
            <Badge variant="outline" className={`${pmeta.badgeClass} h-4 px-1 text-[9px] gap-0.5`}>
              {priority === "high" && <Flame className="h-2.5 w-2.5" />}
              {pmeta.label}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`${meta.badgeClass} border text-[10px] px-1.5 h-5`}>{meta.label}</Badge>
          {needsConfirm ? (
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={busy}
              className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
              Konfirmasi
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => setOpen(true)}>
              Kelola
            </Button>
          )}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {booking.customer_name}
            </DrawerTitle>
            <DrawerDescription>{booking.service_name}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-2 max-h-[55vh] overflow-y-auto">
            {overdue && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600">
                <AlertTriangle className="h-4 w-4" /> Terlambat konfirmasi
              </div>
            )}

            {booking.cancel_requested && booking.status !== "cancelled" && (
              <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs space-y-2">
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <Ban className="h-3 w-3" /> Permintaan Pembatalan
                </div>
                {booking.cancel_reason && (
                  <p className="text-muted-foreground italic">"{booking.cancel_reason}"</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" disabled={busy} onClick={onApproveCancel}>
                    Setujui
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" disabled={busy} onClick={onRejectCancel}>
                    Tolak
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Field label="Email" value={booking.customer_email} />
              <Field label="Telepon" value={booking.customer_phone} />
              <Field label="Cabang" value={booking.branch || "—"} className="capitalize" />
              <Field label="Pembayaran" value={booking.payment_status} />
              <Field label="Kendaraan" value={booking.car_type || "—"} />
              <Field label="Plat Nomor" value={booking.car_plate_number || "—"} className="uppercase font-mono" />
              <Field label="Tanggal" value={format(new Date(booking.booking_date), "dd MMM yyyy")} />
              <Field label="Jam" value={booking.booking_time} />
            </div>

            {meta.description && (
              <p className="text-[11px] text-muted-foreground p-2 rounded-md bg-muted/40">{meta.description}</p>
            )}
          </div>

          <DrawerFooter className="gap-2">
            {needsConfirm && (
              <Button onClick={() => { onConfirm(); setOpen(false); }} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <ShieldCheck className="h-4 w-4" /> Konfirmasi Booking
              </Button>
            )}
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Ubah Status</p>
              <Select value={booking.status} onValueChange={(v) => { onUpdateStatus(v); }} disabled={busy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2"><s.icon className="h-4 w-4" />{s.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost">Tutup</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

const Field = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className="p-2 rounded-md bg-muted/40">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className={`text-xs font-medium truncate ${className || ""}`}>{value}</p>
  </div>
);

export default MobileBookingRow;