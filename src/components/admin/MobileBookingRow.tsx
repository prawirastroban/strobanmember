import { useState } from "react";
import { format } from "date-fns";
import { Car, Info, RefreshCw, ShieldCheck, Wrench, Ban, Flame, AlertTriangle, MapPin } from "lucide-react";
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
import { isStatusRestricted, isBookingDateReached } from "@/lib/bookingDateRule";

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full text-left rounded-[12px] border bg-card transition-colors hover:bg-accent/5 ${
          overdue ? "border-red-500/40 bg-red-500/5" : "border-border/60"
        } ${booking.cancel_requested && booking.status !== "cancelled" ? "border-primary/40" : ""}`}
        style={{ padding: "10px 12px", marginBottom: 0 }}
      >
        {/* Top row: name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <h4 className="text-[13px] font-semibold leading-tight truncate">{booking.customer_name}</h4>
            <Info className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
          <Badge className={`${meta.badgeClass} border text-[11px] font-medium px-2 py-0 h-5 rounded-full shrink-0`}>
            {meta.label}
          </Badge>
        </div>

        {/* Middle: car + branch */}
        <div className="mt-1.5 space-y-0.5">
          {(booking.car_type || booking.car_plate_number) && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Car className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {booking.car_type || "—"}
                {booking.car_plate_number ? ` · ${booking.car_plate_number.toUpperCase()}` : ""}
              </span>
            </div>
          )}
          {booking.branch && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate capitalize">Cabang {booking.branch}</span>
            </div>
          )}
        </div>

        {/* Bottom row: service (red) + date/time + priority/cancel hints */}
        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-primary truncate flex-1">{booking.service_name}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {format(new Date(booking.booking_date), "EEE dd MMM")} · {booking.booking_time}
          </span>
        </div>

        {/* Priority / overdue / quick-action hints */}
        {(priority === "high" || overdue || needsConfirm || (booking.cancel_requested && booking.status !== "cancelled")) && (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              {priority === "high" && (
                <span className={`${pmeta.badgeClass} inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border`}>
                  <Flame className="h-2.5 w-2.5" />
                  {pmeta.label}
                </span>
              )}
              {overdue && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/30">
                  <AlertTriangle className="h-2.5 w-2.5" /> Terlambat
                </span>
              )}
              {booking.cancel_requested && booking.status !== "cancelled" && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                  <Ban className="h-2.5 w-2.5" /> Permintaan batal
                </span>
              )}
            </div>
            {needsConfirm && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md text-white ${
                  busy ? "bg-emerald-600/60" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {busy ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                Konfirmasi
              </span>
            )}
          </div>
        )}
      </button>

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
                  {statusOptions.map((s) => {
                    const blocked =
                      isStatusRestricted(s.value) && !isBookingDateReached(booking.booking_date);
                    return (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        disabled={blocked}
                        title={blocked ? "Tanggal booking belum tiba" : undefined}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <s.icon className="h-4 w-4" />
                          <span>{s.label}</span>
                          {blocked && (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              terkunci
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!isBookingDateReached(booking.booking_date) && (
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                  Check-In, Sedang Dikerjakan, dan Selesai baru aktif pada tanggal booking ({format(new Date(booking.booking_date), "dd MMM yyyy")}).
                </p>
              )}
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