import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Phone } from "lucide-react";

const BRANCHES = [
  {
    id: "bandung",
    name: "Bandung",
    address: "Jl. Riau No. 123, Bandung, Jawa Barat 40115",
    phone: "+62 22 1234567",
    coordinates: { lat: -6.9175, lng: 107.6191 },
    mapQuery: "Jl.+Riau+No.+123,+Bandung,+Jawa+Barat",
    hours: {
      weekday: "08:00 - 17:00",
      saturday: "08:00 - 15:00",
      sunday: "Tutup",
    },
  },
  {
    id: "tasikmalaya",
    name: "Tasikmalaya",
    address: "Jl. HZ Mustofa No. 45, Tasikmalaya, Jawa Barat 46121",
    phone: "+62 265 123456",
    coordinates: { lat: -7.3274, lng: 108.2207 },
    mapQuery: "Jl.+HZ+Mustofa+No.+45,+Tasikmalaya,+Jawa+Barat",
    hours: {
      weekday: "08:00 - 17:00",
      saturday: "08:00 - 15:00",
      sunday: "Tutup",
    },
  },
  {
    id: "cirebon",
    name: "Cirebon",
    address: "Jl. Siliwangi No. 78, Cirebon, Jawa Barat 45131",
    phone: "+62 231 234567",
    coordinates: { lat: -6.7320, lng: 108.5523 },
    mapQuery: "Jl.+Siliwangi+No.+78,+Cirebon,+Jawa+Barat",
    hours: {
      weekday: "08:00 - 17:00",
      saturday: "08:00 - 15:00",
      sunday: "Tutup",
    },
  },
  {
    id: "yogyakarta",
    name: "Yogyakarta",
    address: "Jl. Malioboro No. 56, Yogyakarta, DIY 55271",
    phone: "+62 274 123456",
    coordinates: { lat: -7.7956, lng: 110.3695 },
    mapQuery: "Jl.+Malioboro+No.+56,+Yogyakarta",
    hours: {
      weekday: "08:00 - 17:00",
      saturday: "08:00 - 14:00",
      sunday: "Tutup",
    },
  },
];

const BranchLocations = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lokasi Cabang Kami</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Kunjungi cabang terdekat kami untuk layanan terbaik kendaraan Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BRANCHES.map((branch) => (
            <Card key={branch.id} className="overflow-hidden">
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.google.com/maps?q=${branch.mapQuery}&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map ${branch.name}`}
                />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {branch.name}
                </CardTitle>
                <CardDescription>{branch.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${branch.phone}`} className="hover:text-primary transition-colors">
                    {branch.phone}
                  </a>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Jam Operasional
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pl-6">
                    <span className="text-muted-foreground">Senin - Jumat</span>
                    <span>{branch.hours.weekday}</span>
                    <span className="text-muted-foreground">Sabtu</span>
                    <span>{branch.hours.saturday}</span>
                    <span className="text-muted-foreground">Minggu</span>
                    <span className="text-destructive">{branch.hours.sunday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BranchLocations;
