import { MapPin, Clock, Phone, ExternalLink, Building2, Landmark, Store, Warehouse } from "lucide-react";

const BRANCHES = [
  {
    id: "bandung",
    name: "Bandung",
    address: "Jl. Riau No. 123",
    phone: "+62 22 1234567",
    hours: "08:00 - 17:00",
    mapsUrl: "https://www.google.com/maps/search/Jl.+Riau+No.+123,+Bandung",
    icon: Building2,
    color: "bg-blue-500",
  },
  {
    id: "tasikmalaya",
    name: "Tasikmalaya",
    address: "Jl. HZ Mustofa No. 45",
    phone: "+62 265 123456",
    hours: "08:00 - 17:00",
    mapsUrl: "https://www.google.com/maps/search/Jl.+HZ+Mustofa+No.+45,+Tasikmalaya",
    icon: Store,
    color: "bg-emerald-500",
  },
  {
    id: "cirebon",
    name: "Cirebon",
    address: "Jl. Siliwangi No. 78",
    phone: "+62 231 234567",
    hours: "08:00 - 17:00",
    mapsUrl: "https://www.google.com/maps/search/Jl.+Siliwangi+No.+78,+Cirebon",
    icon: Warehouse,
    color: "bg-orange-500",
  },
  {
    id: "yogyakarta",
    name: "Yogyakarta",
    address: "Jl. Malioboro No. 56",
    phone: "+62 274 123456",
    hours: "08:00 - 17:00",
    mapsUrl: "https://www.google.com/maps/search/Jl.+Malioboro+No.+56,+Yogyakarta",
    icon: Landmark,
    color: "bg-purple-500",
  },
];

const BranchLocations = () => {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Lokasi Cabang</h2>
          <p className="text-muted-foreground text-sm">
            Kunjungi cabang terdekat kami
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BRANCHES.map((branch) => {
            const Icon = branch.icon;
            return (
              <div
                key={branch.id}
                className="bg-card rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 ${branch.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="font-semibold text-sm">{branch.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {branch.address}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  <span>{branch.hours}</span>
                </div>
                <div className="flex items-center gap-1 text-xs mb-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <a
                    href={`tel:${branch.phone}`}
                    className="text-primary hover:underline"
                  >
                    {branch.phone}
                  </a>
                </div>
                <a
                  href={branch.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on Maps
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BranchLocations;
