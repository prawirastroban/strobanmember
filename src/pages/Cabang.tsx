import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, MessageCircle, Navigation, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import branchBandung from "@/assets/branch-bandung.jpg";
import branchTasikmalaya from "@/assets/branch-tasikmalaya.jpg";
import branchCirebon from "@/assets/branch-cirebon.jpg";
import branchYogyakarta from "@/assets/branch-yogyakarta.jpg";

const BRANCHES = [
  {
    id: "bandung",
    name: "Stroban Bandung",
    address: "Jl. Riau No. 123, Bandung",
    phone: "+62 22 1234567",
    whatsapp: "628973700800",
    hours: "08:00 – 17:00 WIB",
    image: branchBandung,
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Riau+No.+123,+Bandung",
  },
  {
    id: "tasikmalaya",
    name: "Stroban Tasikmalaya",
    address: "Jl. HZ Mustofa No. 45, Tasikmalaya",
    phone: "+62 265 123456",
    whatsapp: "628973700800",
    hours: "08:00 – 17:00 WIB",
    image: branchTasikmalaya,
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+HZ+Mustofa+No.+45,+Tasikmalaya",
  },
  {
    id: "cirebon",
    name: "Stroban Cirebon",
    address: "Jl. Siliwangi No. 78, Cirebon",
    phone: "+62 231 234567",
    whatsapp: "628973700800",
    hours: "08:00 – 17:00 WIB",
    image: branchCirebon,
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Siliwangi+No.+78,+Cirebon",
  },
  {
    id: "yogyakarta",
    name: "Stroban Yogyakarta",
    address: "Jl. Malioboro No. 56, Yogyakarta",
    phone: "+62 274 123456",
    whatsapp: "628973700800",
    hours: "08:00 – 17:00 WIB",
    image: branchYogyakarta,
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Malioboro+No.+56,+Yogyakarta",
  },
];

const Cabang = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Cabang Kami | Stroban";
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-tight">Cabang Kami</h1>
            <p className="text-[11px] text-muted-foreground">{BRANCHES.length} cabang siap melayani Anda</p>
          </div>
          <MapPin className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4 lg:pt-10 max-w-5xl">
        <div className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold mb-1">Cabang Kami</h1>
          <p className="text-muted-foreground">Pilih cabang terdekat dan kunjungi kami untuk layanan terbaik.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {BRANCHES.map((b) => (
            <article
              key={b.id}
              className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={b.image}
                  alt={b.name}
                  loading="lazy"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-base flex items-center gap-1.5 mb-1">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  {b.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{b.address}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                  <Clock className="h-3 w-3" />
                  <span>{b.hours}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`tel:${b.phone}`}
                    aria-label={`Telepon ${b.name}`}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium transition"
                  >
                    <Phone className="h-4 w-4" />
                    Telepon
                  </a>
                  <a
                    href={`https://wa.me/${b.whatsapp}?text=${encodeURIComponent(`Halo Stroban ${b.name.replace("Stroban ", "")}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp ${b.name}`}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 text-[11px] font-medium transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                  <a
                    href={b.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Petunjuk arah ke ${b.name}`}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 text-[11px] font-medium transition"
                  >
                    <Navigation className="h-4 w-4" />
                    Arah
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cabang;