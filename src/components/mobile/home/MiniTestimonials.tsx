import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Review = {
  id: string;
  rating: number;
  review: string | null;
  display_name: string | null;
  initials: string | null;
  service_name: string | null;
};

const FALLBACK: Review[] = [
  { id: "f1", rating: 5, review: "Cepat dan rapi, mobil terasa baru lagi. Pasti balik lagi!", display_name: "Budi S.", initials: "BS", service_name: "Ganti Oli" },
  { id: "f2", rating: 5, review: "Teknisinya ramah, hasil servisnya memuaskan. Recommended.", display_name: "Dewi R.", initials: "DR", service_name: "Full Service" },
  { id: "f3", rating: 5, review: "Booking online gampang, tanpa antri. Hemat waktu banget.", display_name: "Rizky P.", initials: "RP", service_name: "Servis AC" },
];

const MiniTestimonials = () => {
  const [items, setItems] = useState<Review[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("public_reviews" as any)
        .select("id,rating,review,display_name,initials,service_name")
        .order("created_at", { ascending: false })
        .limit(3);
      if (active) {
        const arr = (data as unknown as Review[]) || [];
        setItems(arr.length ? arr : FALLBACK);
      }
    })();
    return () => { active = false; };
  }, []);

  const list = items.length ? items : FALLBACK;

  return (
    <section className="lg:hidden mt-8 px-4">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Kata Pelanggan</h2>
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="text-xs font-semibold text-foreground">4.9</span>
          <span className="text-[11px] text-muted-foreground">/5</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {list.slice(0, 3).map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                {(r.initials || (r.display_name?.slice(0, 2) ?? "S")).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-none">{r.display_name || "Pelanggan"}</p>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
              <Quote className="h-4 w-4 text-primary/30 shrink-0" />
            </div>
            <p className="text-[13px] text-foreground/85 leading-snug line-clamp-3">
              {r.review || "Pelayanan memuaskan."}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MiniTestimonials;