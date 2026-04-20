import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
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

const getStatusIndex = (status: string) => {
  const keys = ["pending", "confirmed", "checked_in", "in_progress", "finishing", "completed"];
  const index = keys.indexOf(status);
  return index === -1 ? 0 : index;
};

const getProgressPercentage = (status: string) => {
  const index = getStatusIndex(status);
  return ((index + 1) / 6) * 100;
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed": return "default";
    case "in_progress":
    case "finishing": return "secondary";
    default: return "outline";
  }
};

export function LiveProgressTracker() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const STATUS_STEPS = [
    { key: "pending", label: t.progress.pending, icon: Clock, color: "bg-muted" },
    { key: "confirmed", label: t.progress.confirmed, icon: Bell, color: "bg-blue-500" },
    { key: "checked_in", label: t.progress.checkedIn, icon: Car, color: "bg-primary" },
    { key: "in_progress", label: t.progress.inProgress, icon: Wrench, color: "bg-orange-500" },
    { key: "finishing", label: t.progress.finishing, icon: Sparkles, color: "bg-purple-500" },
    { key: "completed", label: t.progress.completed, icon: CheckCircle2, color: "bg-green-500" },
  ];

  useEffect(() => {
    if (!user) return;

    const fetchActiveBookings = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("bookings")
        .select("id, service_name, service_type, booking_date, booking_time, status, customer_name")
        .eq("user_id", user.id)
        .gte("booking_date", today)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .order("booking_time", { ascending: true })
        .limit(5);

      if (!error && data) setActiveBookings(data);
      setIsLoading(false);
    };

    fetchActiveBookings();

    const channel = supabase
      .channel("booking-progress")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, () => { fetchActiveBookings(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {t.progress.title}
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

  const inProgressBookings = activeBookings.filter(
    (b) => ["pending", "waiting_confirmation", "checked_in", "in_progress", "finishing", "confirmed"].includes(b.status)
  );

  if (inProgressBookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {t.progress.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t.progress.noActive}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          {t.progress.liveTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {inProgressBookings.map((booking) => (
          <div key={booking.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{booking.service_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(booking.booking_date), "dd MMM yyyy")} • {booking.booking_time}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(booking.status)} className="self-start sm:self-center shrink-0">
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
                  <div key={step.key} className="flex flex-col items-center gap-1">
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
