import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Calendar, Car, Info, Wrench } from "lucide-react";
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

export interface MobileReminderData {
  vehicleId: string;
  vehicleLabel: string;
  licensePlate: string;
  lastServiceDate: string | null;
  dueDate: string;
  daysLeft: number;
}

interface Props {
  data: MobileReminderData;
  onBookNow: () => void;
}

export const MobileReminderCard = ({ data, onBookNow }: Props) => {
  const [open, setOpen] = useState(false);
  const overdue = data.daysLeft < 0;

  return (
    <>
      <div
        className={`relative flex items-center gap-3 p-3 rounded-xl border transition-colors ${
          overdue ? "border-destructive/40 bg-destructive/5" : "bg-card hover:bg-accent/5"
        }`}
      >
        <div className={`shrink-0 p-2 rounded-full ${overdue ? "bg-destructive/10" : "bg-primary/10"}`}>
          {overdue ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Car className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-sm leading-tight truncate">{data.vehicleLabel}</h4>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Info detail"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] mt-0.5">
            <span className="text-muted-foreground truncate">{data.licensePlate}</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 ${
                overdue
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              {overdue ? `Telat ${Math.abs(data.daysLeft)}h` : `${data.daysLeft}h lagi`}
            </Badge>
          </div>
        </div>

        <Button size="sm" className="shrink-0 h-8 px-3 text-xs" onClick={onBookNow}>
          Booking
        </Button>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {data.vehicleLabel}
            </DrawerTitle>
            <DrawerDescription>Pengingat servis berkala</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Car className="h-3.5 w-3.5" />
                Plat Nomor
              </span>
              <span className="text-sm font-medium">{data.licensePlate}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground">Servis Terakhir</span>
              <span className="text-sm font-medium">
                {data.lastServiceDate ? format(parseISO(data.lastServiceDate), "dd MMM yyyy") : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Estimasi Berikutnya
              </span>
              <span className="text-sm font-medium">{format(parseISO(data.dueDate), "dd MMM yyyy")}</span>
            </div>

            <div
              className={`flex items-center justify-between p-3 rounded-lg border ${
                overdue
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-primary/5 border-primary/15"
              }`}
            >
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className={
                  overdue
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : "bg-primary/10 text-primary border-primary/20"
                }
              >
                {overdue ? `Telat ${Math.abs(data.daysLeft)} hari` : `${data.daysLeft} hari lagi`}
              </Badge>
            </div>
          </div>

          <DrawerFooter className="gap-2">
            <Button
              onClick={() => {
                setOpen(false);
                onBookNow();
              }}
            >
              Booking Sekarang
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost">Tutup</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileReminderCard;