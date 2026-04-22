import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, History, Loader2, RefreshCw, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

interface CompletedBooking {
  id: string;
  service_name: string;
  booking_date: string;
  service_price: number;
  car_type: string | null;
  car_plate_number: string | null;
  next_service_date: string | null;
}

const ServiceHistory = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CompletedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id,service_name,booking_date,service_price,car_type,car_plate_number,next_service_date")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("booking_date", { ascending: false })
        .limit(3);
      setItems((data as CompletedBooking[]) || []);
      setLoading(false);
    };
    load();

    // Realtime: any new completed booking auto-appears here
    const channel = supabase
      .channel(`history-widget-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Smart next action: find soonest upcoming reminder from completed history
  const nextReminder = items
    .filter((b) => b.next_service_date)
    .map((b) => ({
      bookingId: b.id,
      service: b.service_name,
      date: b.next_service_date as string,
      daysLeft: differenceInDays(parseISO(b.next_service_date as string), new Date()),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {t.serviceHistory.title}
            </CardTitle>
            <CardDescription>{t.serviceHistory.subtitle}</CardDescription>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => navigate("/profile/history-perawatan")}
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-4">Belum ada riwayat servis</p>
            <Button size="sm" onClick={() => navigate("/booking")} className="gap-2">
              <Calendar className="h-4 w-4" /> Booking Servis Pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Smart next action banner */}
            {nextReminder && nextReminder.daysLeft <= 30 && (
              <button
                type="button"
                onClick={() => navigate("/booking")}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
              >
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {nextReminder.daysLeft <= 0
                      ? `Servis ${nextReminder.service} sudah waktunya`
                      : `${nextReminder.service} dalam ${nextReminder.daysLeft} hari`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Jadwalkan: {format(parseISO(nextReminder.date), "dd MMM yyyy", { locale: localeID })}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
              </button>
            )}

            {items.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => navigate(`/invoice/${service.id}`)}
                className="w-full flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-colors text-left"
              >
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{service.service_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    <span>{format(parseISO(service.booking_date), "dd MMM yyyy", { locale: localeID })}</span>
                    {service.car_plate_number && <span className="font-mono uppercase">{service.car_plate_number}</span>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">Selesai</Badge>
              </button>
            ))}

            {/* Smart next action: book again */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/booking")}
              className="w-full gap-2 mt-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Booking Lagi
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceHistory;
