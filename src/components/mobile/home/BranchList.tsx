import { MapPin, Phone, Navigation } from "lucide-react";

const BRANCHES = [
  { name: "Bandung", address: "Jl. Riau No. 123", phone: "+628973700800", url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Riau+No.+123,+Bandung" },
  { name: "Tasikmalaya", address: "Jl. HZ Mustofa No. 45", phone: "+628973700800", url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+HZ+Mustofa+No.+45,+Tasikmalaya" },
  { name: "Cirebon", address: "Jl. Siliwangi No. 78", phone: "+628973700800", url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Siliwangi+No.+78,+Cirebon" },
  { name: "Yogyakarta", address: "Jl. Malioboro No. 56", phone: "+628973700800", url: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Malioboro+No.+56,+Yogyakarta" },
];

const BranchList = () => {
  return (
    <section id="cabang" className="lg:hidden mt-8 px-4 scroll-mt-20">
      <h2 className="text-base font-bold text-foreground mb-3">Cabang Kami</h2>
      <div className="space-y-2">
        {BRANCHES.map((b) => (
          <div key={b.name} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{b.name}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{b.address}</p>
            </div>
            <a
              href={`tel:${b.phone}`}
              aria-label={`Telepon ${b.name}`}
              className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Petunjuk arah ke ${b.name}`}
              className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition"
            >
              <Navigation className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BranchList;