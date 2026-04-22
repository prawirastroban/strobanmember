import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfDay, differenceInCalendarDays } from "date-fns";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  Car,
  Loader2,
  X,
  RotateCcw,
  History,
  Wrench,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { recommendNextService } from "@/lib/serviceRecommendation";
import { MobileBookingCard } from "@/components/reminder/MobileBookingCard";
import { MobileReminderCard } from "@/components/reminder/MobileReminderCard";

interface BookingRow {
  id: string;
  service_name: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  status: string;
  service_price: number;
  car_type: string | null;
  car_plate_number: string | null;
}

interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  last_service_date: string | null;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const statusColors: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "in-progress": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

const ReminderService = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<BookingRow[]>([]);
  const [cancelled, setCancelled] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [bookingToCancel, setBookingToCancel] = useState<BookingRow | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const fetchAll = async () => {
      const today = startOfDay(new Date());
      const todayStr = format(today, "yyyy-MM-dd");

      const [{ data: up }, { data: cn }, { data: vh }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, service_name, service_type, booking_date, booking_time, status, service_price, car_type, car_plate_number")
          .eq("user_id", user.id)
          .gte("booking_date", todayStr)
          .neq("status", "completed")
          .neq("status", "cancelled")
          .order("booking_date", { ascending: true })
          .order("booking_time", { ascending: true }),
        supabase
          .from("bookings")
          .select("id, service_name, service_type, booking_date, booking_time, status, service_price, car_type, car_plate_number")
          .eq("user_id", user.id)
          .eq("status", "cancelled")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("vehicles")
          .select("id, brand, model, license_plate, last_service_date")
          .eq("user_id", user.id),
      ]);

      if (!active) return;
      setUpcoming(up || []);
      setCancelled(cn || []);
      setVehicles(vh || []);
      setLoading(false);
    };

    fetchAll();

    const channel = supabase
      .channel("reminder-service")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => fetchAll(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const reminders = useMemo(() => {
    return vehicles
      .filter((v) => v.last_service_date)
      .map((v) => {
        const rec = recommendNextService("servis berkala", v.last_service_date as string);
        const due = parseISO(rec.date);
        const daysLeft = differenceInCalendarDays(due, new Date());
        return { vehicle: v, rec, daysLeft, dueDate: rec.date };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [vehicles]);

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    setCancellingId(bookingToCancel.id);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingToCancel.id)
      .eq("user_id", user?.id);
    if (error) {
      toast.error(t.upcomingBookings.failedToCancel, { description: error.message });
    } else {
      toast.success(t.upcomingBookings.bookingCancelled, {
        description: `${bookingToCancel.service_name} ${t.upcomingBookings.bookingCancelledDesc}`,
      });
    }
    setCancellingId(null);
    setBookingToCancel(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-3 md:pt-4 pb-20 md:pb-10 max-w-5xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              {t.reminderService.title}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{t.reminderService.subtitle}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex gap-2"
            onClick={() => navigate("/profile/history-perawatan")}
          >
            <History className="h-4 w-4" />
            {t.reminderService.viewHistory}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {/* Section 1 — Upcoming */}
            <Card className="shadow-lg border-primary/10 bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t.reminderService.upcomingSection}
                </CardTitle>
                <CardDescription>{t.reminderService.upcomingSectionDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground mb-4">{t.reminderService.noUpcoming}</p>
                    <Button onClick={() => navigate("/booking")}>
                      {t.upcomingBookings.scheduleService}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3 sm:max-h-none max-h-[260px] overflow-y-auto sm:overflow-visible pr-1 sm:pr-0">
                    {upcoming.map((b) => (
                      <div key={b.id}>
                        {/* Mobile compact */}
                        <div className="sm:hidden">
                          <MobileBookingCard
                            booking={b}
                            onViewDetail={() => navigate(`/my-booking/${b.id}`)}
                            onCancel={b.status === "pending" ? () => setBookingToCancel(b) : undefined}
                            cancelling={cancellingId === b.id}
                          />
                        </div>
                        {/* Desktop unchanged */}
                        <div className="hidden sm:flex sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Wrench className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{b.service_name}</h4>
                            {(b.car_type || b.car_plate_number) && (
                              <p className="text-sm text-muted-foreground">
                                {b.car_type}
                                {b.car_type && b.car_plate_number && " • "}
                                {b.car_plate_number}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(b.booking_date), "dd MMM yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {b.booking_time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-primary">{formatIDR(b.service_price)}</span>
                          <Badge variant="outline" className={statusColors[b.status] || statusColors.pending}>
                            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/my-booking/${b.id}`)}
                          >
                            {t.reminderService.viewDetail}
                          </Button>
                          {b.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setBookingToCancel(b)}
                              disabled={cancellingId === b.id}
                            >
                              {cancellingId === b.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 2 — Periodic Reminders */}
            <Card className="shadow-lg border-primary/10 bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-primary" />
                  {t.reminderService.recurringSection}
                </CardTitle>
                <CardDescription>{t.reminderService.recurringSectionDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {reminders.length === 0 ? (
                  <div className="text-center py-8">
                    <Wrench className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground mb-4">{t.reminderService.noReminders}</p>
                    <Button variant="outline" onClick={() => navigate("/my-vehicles")} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t.reminderService.addVehicle}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3 sm:max-h-none max-h-[260px] overflow-y-auto sm:overflow-visible pr-1 sm:pr-0">
                    {reminders.map(({ vehicle, rec, daysLeft, dueDate }) => {
                      const overdue = daysLeft < 0;
                      return (
                        <div key={vehicle.id}>
                          {/* Mobile compact */}
                          <div className="sm:hidden">
                            <MobileReminderCard
                              data={{
                                vehicleId: vehicle.id,
                                vehicleLabel: `${vehicle.brand} ${vehicle.model}`,
                                licensePlate: vehicle.license_plate,
                                lastServiceDate: vehicle.last_service_date,
                                dueDate,
                                daysLeft,
                              }}
                              onBookNow={() => navigate("/booking")}
                            />
                          </div>
                          {/* Desktop unchanged */}
                          <div
                            className={`hidden sm:flex sm:items-center sm:justify-between gap-3 p-4 rounded-lg border transition-colors ${
                            overdue
                              ? "border-destructive/40 bg-destructive/5"
                              : "bg-card hover:bg-accent/5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                overdue ? "bg-destructive/10" : "bg-primary/10"
                              }`}
                            >
                              {overdue ? (
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              ) : (
                                <Car className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold">
                                {vehicle.brand} {vehicle.model}
                              </h4>
                              <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t.reminderService.lastService}:{" "}
                                {vehicle.last_service_date
                                  ? format(parseISO(vehicle.last_service_date), "dd MMM yyyy")
                                  : "-"}
                              </p>
                              <p className="text-sm mt-1">
                                <span className="text-muted-foreground">
                                  {t.reminderService.estimatedNext}:{" "}
                                </span>
                                <span className="font-medium">
                                  {format(parseISO(dueDate), "dd MMM yyyy")}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                overdue
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : "bg-primary/10 text-primary border-primary/20"
                              }
                            >
                              {overdue
                                ? `${t.reminderService.overdue} ${Math.abs(daysLeft)} ${t.reminderService.days}`
                                : `${t.reminderService.dueIn} ${daysLeft} ${t.reminderService.days}`}
                            </Badge>
                            <Button size="sm" onClick={() => navigate("/booking")}>
                              {t.reminderService.bookNow}
                            </Button>
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3 — Cancelled */}
            <Card className="shadow-lg border-primary/10 bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <X className="h-5 w-5 text-muted-foreground" />
                  {t.reminderService.cancelledSection}
                </CardTitle>
                <CardDescription>{t.reminderService.cancelledSectionDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {cancelled.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">{t.reminderService.noCancelled}</p>
                ) : (
                  <div className="space-y-2 sm:space-y-3 sm:max-h-none max-h-[260px] overflow-y-auto sm:overflow-visible pr-1 sm:pr-0">
                    {cancelled.map((b) => (
                      <div key={b.id}>
                        {/* Mobile compact */}
                        <div className="sm:hidden">
                          <MobileBookingCard
                            booking={b}
                            variant="cancelled"
                            onViewDetail={() => navigate(`/my-booking/${b.id}`)}
                            onPrimaryAction={() => navigate(`/booking?service=${b.service_type}`)}
                            primaryLabel={t.upcomingBookings.reschedule}
                          />
                        </div>
                        {/* Desktop unchanged */}
                        <div className="hidden sm:flex sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-dashed bg-muted/30">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            <Car className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-muted-foreground">{b.service_name}</h4>
                            {(b.car_type || b.car_plate_number) && (
                              <p className="text-sm text-muted-foreground/70">
                                {b.car_type}
                                {b.car_type && b.car_plate_number && " • "}
                                {b.car_plate_number}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(b.booking_date), "dd MMM yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {b.booking_time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={statusColors.cancelled}>
                            {t.upcomingBookings.cancelled}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/booking?service=${b.service_type}`)}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {t.upcomingBookings.reschedule}
                          </Button>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobile: full-history shortcut */}
            <Button
              variant="outline"
              className="w-full sm:hidden gap-2"
              onClick={() => navigate("/profile/history-perawatan")}
            >
              <History className="h-4 w-4" />
              {t.reminderService.viewHistory}
            </Button>
          </div>
        )}
      </main>

      <Footer />

      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.upcomingBookings.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.upcomingBookings.cancelDescription}{" "}
              <strong>{bookingToCancel?.service_name}</strong> on{" "}
              <strong>
                {bookingToCancel && format(parseISO(bookingToCancel.booking_date), "dd MMM yyyy")}
              </strong>{" "}
              at <strong>{bookingToCancel?.booking_time}</strong>?
              <br />
              <br />
              {t.upcomingBookings.cancelWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.upcomingBookings.keepAppointment}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.upcomingBookings.cancelAppointment}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReminderService;