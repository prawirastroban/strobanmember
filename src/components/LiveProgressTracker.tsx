import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Car, Clock, CheckCircle2, Wrench, Sparkles, Bell } from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: string;
  service_name: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  status: string;
  customer_name: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "Pending", icon: Clock, color: "bg-muted" },
  { key: "confirmed", label: "Confirmed", icon: Bell, color: "bg-blue-500" },
  { key: "checked_in", label: "Checked In", icon: Car, color: "bg-yellow-500" },
  { key: "in_progress", label: "In Progress", icon: Wrench, color: "bg-orange-500" },
  { key: "finishing", label: "Finishing Up", icon: Sparkles, color: "bg-purple-500" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "bg-green-500" },
];

const getStatusIndex = (status: string) => {
  const index = STATUS_STEPS.findIndex((step) => step.key === status);
  return index === -1 ? 0 : index;
};

const getProgressPercentage = (status: string) => {
  const index = getStatusIndex(status);
  return ((index + 1) / STATUS_STEPS.length) * 100;
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
    case "finishing":
      return "secondary";
    case "checked_in":
    case "confirmed":
      return "outline";
    default:
      return "outline";
  }
};

export function LiveProgressTracker() {
  const { user } = useAuth();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch active bookings (today's bookings that aren't completed or cancelled)
    const fetchActiveBookings = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("bookings")
        .select("id, service_name, service_type, booking_date, booking_time, status, customer_name")
        .eq("user_id", user.id)
        .gte("booking_date", today)
        .not("status", "in", '("cancelled")')
        .order("booking_date", { ascending: true })
        .order("booking_time", { ascending: true })
        .limit(5);

      if (!error && data) {
        setActiveBookings(data);
      }
      setIsLoading(false);
    };

    fetchActiveBookings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("booking-progress")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedBooking = payload.new as Booking;
          setActiveBookings((prev) =>
            prev.map((booking) =>
              booking.id === updatedBooking.id
                ? { ...booking, status: updatedBooking.status }
                : booking
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Service Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to show only "active" bookings (checked_in or in_progress)
  const inProgressBookings = activeBookings.filter(
    (b) => ["checked_in", "in_progress", "finishing", "confirmed"].includes(b.status)
  );

  if (inProgressBookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Service Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No active services at the moment. Your progress will appear here when you check in at the shop.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Live Service Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {inProgressBookings.map((booking) => (
          <div key={booking.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{booking.service_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(booking.booking_date), "MMM d, yyyy")} at {booking.booking_time}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(booking.status)}>
                {STATUS_STEPS.find((s) => s.key === booking.status)?.label || booking.status}
              </Badge>
            </div>

            <Progress value={getProgressPercentage(booking.status)} className="h-2" />

            <div className="flex justify-between">
              {STATUS_STEPS.map((step, index) => {
                const currentIndex = getStatusIndex(booking.status);
                const isCompleted = index <= currentIndex;
                const isCurrent = index === currentIndex;
                const IconComponent = step.icon;

                return (
                  <div
                    key={step.key}
                    className={`flex flex-col items-center gap-1 ${
                      index === 0 ? "" : index === STATUS_STEPS.length - 1 ? "" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? isCurrent
                            ? `${step.color} text-white ring-2 ring-offset-2 ring-primary`
                            : `${step.color} text-white`
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-xs text-center hidden sm:block ${
                        isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
