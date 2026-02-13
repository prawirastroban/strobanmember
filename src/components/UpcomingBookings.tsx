import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Calendar, Clock, Car, Loader2, X, RotateCcw } from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Booking {
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "in-progress": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export const UpcomingBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleReschedule = (booking: Booking) => {
    navigate(`/booking?service=${booking.service_type}`);
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    
    setCancellingId(bookingToCancel.id);
    
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingToCancel.id)
      .eq("user_id", user?.id);

    if (error) {
      console.error("Error cancelling booking:", error);
      toast.error(t.upcomingBookings.failedToCancel, { description: error.message });
    } else {
      toast.success(t.upcomingBookings.bookingCancelled, {
        description: `${bookingToCancel.service_name} ${t.upcomingBookings.bookingCancelledDesc}`,
      });
    }
    
    setCancellingId(null);
    setBookingToCancel(null);
  };

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      const today = startOfDay(new Date());
      
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("bookings")
        .select("id, service_name, service_type, booking_date, booking_time, status, service_price, car_type, car_plate_number")
        .eq("user_id", user.id)
        .gte("booking_date", format(today, "yyyy-MM-dd"))
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .order("booking_time", { ascending: true })
        .limit(5);

      const { data: cancelledData, error: cancelledError } = await supabase
        .from("bookings")
        .select("id, service_name, service_type, booking_date, booking_time, status, service_price, car_type, car_plate_number")
        .eq("user_id", user.id)
        .eq("status", "cancelled")
        .order("updated_at", { ascending: false })
        .limit(3);

      if (!upcomingError) setBookings(upcomingData || []);
      if (!cancelledError) setCancelledBookings(cancelledData || []);
      setLoading(false);
    };

    fetchBookings();

    const channel = supabase
      .channel("upcoming-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, () => { fetchBookings(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t.upcomingBookings.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t.upcomingBookings.title}
            </CardTitle>
            <CardDescription>{t.upcomingBookings.subtitle}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/booking")}>
            {t.upcomingBookings.bookNew}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 && cancelledBookings.length === 0 ? (
          <div className="text-center py-8">
            <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">{t.upcomingBookings.noAppointments}</p>
            <Button onClick={() => navigate("/booking")}>
              {t.upcomingBookings.scheduleService}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{booking.service_name}</h4>
                    {(booking.car_type || booking.car_plate_number) && (
                      <p className="text-sm text-muted-foreground">
                        {booking.car_type}{booking.car_type && booking.car_plate_number && " • "}{booking.car_plate_number}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(booking.booking_date), "MMM dd, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.booking_time}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-11 sm:ml-0">
                  <span className="font-semibold text-primary">
                    ${booking.service_price.toFixed(2)}
                  </span>
                  <Badge variant="outline" className={statusColors[booking.status] || statusColors.pending}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                  {booking.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setBookingToCancel(booking)}
                      disabled={cancellingId === booking.id}
                    >
                      {cancellingId === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {cancelledBookings.length > 0 && (
              <>
                {bookings.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-muted-foreground mb-3">{t.upcomingBookings.recentlyCancelled}</p>
                  </div>
                )}
                {cancelledBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-dashed bg-muted/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        <Car className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-muted-foreground">{booking.service_name}</h4>
                        {(booking.car_type || booking.car_plate_number) && (
                          <p className="text-sm text-muted-foreground/70">
                            {booking.car_type}{booking.car_type && booking.car_plate_number && " • "}{booking.car_plate_number}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(booking.booking_date), "MMM dd, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.booking_time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-11 sm:ml-0">
                      <Badge variant="outline" className={statusColors.cancelled}>
                        {t.upcomingBookings.cancelled}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => handleReschedule(booking)} className="gap-1">
                        <RotateCcw className="h-3 w-3" />
                        {t.upcomingBookings.reschedule}
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.upcomingBookings.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.upcomingBookings.cancelDescription} <strong>{bookingToCancel?.service_name}</strong>{" "}
              on <strong>{bookingToCancel && format(parseISO(bookingToCancel.booking_date), "MMM dd, yyyy")}</strong> at <strong>{bookingToCancel?.booking_time}</strong>?
              <br /><br />
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
    </Card>
  );
};

export default UpcomingBookings;
