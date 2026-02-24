import { MapPin, Clock, Phone, MessageCircle, Navigation } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import branchBandung from "@/assets/branch-bandung.jpg";
import branchTasikmalaya from "@/assets/branch-tasikmalaya.jpg";
import branchCirebon from "@/assets/branch-cirebon.jpg";
import branchYogyakarta from "@/assets/branch-yogyakarta.jpg";

const BRANCHES = [
  {
    id: "bandung",
    name: "Bandung",
    address: "Jl. Riau No. 123",
    phone: "+62 22 1234567",
    whatsapp: "62221234567",
    hours: "08:00 - 17:00",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Riau+No.+123,+Bandung",
    image: branchBandung,
  },
  {
    id: "tasikmalaya",
    name: "Tasikmalaya",
    address: "Jl. HZ Mustofa No. 45",
    phone: "+62 265 123456",
    whatsapp: "62265123456",
    hours: "08:00 - 17:00",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+HZ+Mustofa+No.+45,+Tasikmalaya",
    image: branchTasikmalaya,
  },
  {
    id: "cirebon",
    name: "Cirebon",
    address: "Jl. Siliwangi No. 78",
    phone: "+62 231 234567",
    whatsapp: "62231234567",
    hours: "08:00 - 17:00",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Siliwangi+No.+78,+Cirebon",
    image: branchCirebon,
  },
  {
    id: "yogyakarta",
    name: "Yogyakarta",
    address: "Jl. Malioboro No. 56",
    phone: "+62 274 123456",
    whatsapp: "62274123456",
    hours: "08:00 - 17:00",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Jl.+Malioboro+No.+56,+Yogyakarta",
    image: branchYogyakarta,
  },
];

const BranchLocations = () => {
  const { t } = useLanguage();

  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">{t.branches.title}</h2>
          <p className="text-muted-foreground text-sm">
            {t.branches.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BRANCHES.map((branch) => (
            <div
              key={branch.id}
              className="group bg-card rounded-lg overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={branch.image}
                  alt={`${branch.name} branch`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="font-semibold text-sm">{branch.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {branch.address}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Clock className="h-3 w-3" />
                  <span>{branch.hours}</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <a
                    href={`tel:${branch.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="text-primary font-medium hidden sm:inline">{t.branches.call}</span>
                  </a>
                  <a
                    href={`https://wa.me/${branch.whatsapp}?text=Halo, saya ingin bertanya tentang layanan di cabang ${branch.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-green-500/10 hover:bg-green-500/20 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium hidden sm:inline">WhatsApp</span>
                  </a>
                </div>
                <a
                  href={branch.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-colors w-full"
                >
                  <Navigation className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">{t.branches.getDirections}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BranchLocations;
