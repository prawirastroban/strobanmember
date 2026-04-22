import { MapPin, Navigation, ChevronRight } from "lucide-react";
import branchBandung from "@/assets/branch-bandung.jpg";
import branchTasikmalaya from "@/assets/branch-tasikmalaya.jpg";
import branchCirebon from "@/assets/branch-cirebon.jpg";
import branchYogyakarta from "@/assets/branch-yogyakarta.jpg";

const BRANCHES = [
  { name: "Bandung", address: "Jl. Riau No. 123", image: branchBandung, url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Riau+No.+123,+Bandung" },
  { name: "Tasikmalaya", address: "Jl. HZ Mustofa No. 45", image: branchTasikmalaya, url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+HZ+Mustofa+No.+45,+Tasikmalaya" },
  { name: "Cirebon", address: "Jl. Siliwangi No. 78", image: branchCirebon, url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Siliwangi+No.+78,+Cirebon" },
  { name: "Yogyakarta", address: "Jl. Malioboro No. 56", image: branchYogyakarta, url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Malioboro+No.+56,+Yogyakarta" },
];

const MobileBranchPicker = () => {
  return (
    <section id="cabang" className="lg:hidden mt-6 px-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Cabang Terdekat</h2>
          <p className="text-xs text-muted-foreground">4 lokasi siap melayani</p>
        </div>
        <a href="#cabang-full" className="text-xs font-semibold text-primary flex items-center gap-0.5">
          Semua cabang <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2 snap-x snap-mandatory">
        {BRANCHES.map((b) => (
          <a
            key={b.name}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-[240px] snap-start bg-card border border-border rounded-2xl overflow-hidden active:scale-[0.98] transition"
          >
            <div className="h-28 w-full bg-muted overflow-hidden">
              <img src={b.image} alt={b.name} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {b.name}
              </h3>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{b.address}</p>
              <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-2">
                <Navigation className="h-3 w-3" /> Petunjuk arah
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default MobileBranchPicker;