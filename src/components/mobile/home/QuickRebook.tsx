import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Repeat, ArrowRight, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Button } from "@/components/ui/button";

type LastBooking = {
  id: string;
  service_name: string;
  service_type: string;
  car_type: string | null;
  branch: string | null;
};

const QuickRebook = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [last, setLast] = useState<LastBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id,service_name,service_type,car_type,branch")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setLast(data as LastBooking | null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  if (loading) return null;

  return (
    <section className="lg:hidden mt-8 px-4">
      <h2 className="text-base font-bold text-foreground mb-3">Booking Cepat</h2>

      {last ? (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Servis terakhir Anda
            </span>
          </div>
          <p className="text-base font-semibold text-foreground line-clamp-1">{last.service_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {last.car_type ?? "Kendaraan Anda"}{last.branch ? ` • ${last.branch}` : ""}
          </p>
          <Button
            onClick={() => navigate(`/booking?service=${last.service_type}`)}
            className="w-full mt-3 h-11 font-semibold"
          >
            Booking Lagi <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarPlus className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Belum pernah booking
            </span>
          </div>
          <p className="text-base font-semibold text-foreground">Booking pertama Anda</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mulai rawat mobil Anda dengan teknisi profesional kami.
          </p>
          <Button
            onClick={() => user ? navigate("/booking") : openLoginDialog("/booking")}
            className="w-full mt-3 h-11 font-semibold"
          >
            Mulai Booking <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </section>
  );
};

export default QuickRebook;