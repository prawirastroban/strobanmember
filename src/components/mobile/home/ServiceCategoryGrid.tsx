import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Disc3, Layers, GaugeCircle, Droplets, Wrench, CloudRain, CircleDot, MoreHorizontal,
  ChevronRight, Clock, CheckCircle2, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

type SubService = {
  key: string;
  name: string;
  description: string;
  duration: string;
  startingPrice?: string;
};

type Category = {
  key: string;
  label: string;
  icon: LucideIcon;
  bg: string;
  color: string;
  description: string;
  services: SubService[];
};

const CATEGORIES: Category[] = [
  {
    key: "ganti-ban", label: "Ganti Ban", icon: Disc3, bg: "#fff5f5", color: "#E53935",
    description: "Pemasangan ban baru sesuai ukuran & merek pilihan Anda.",
    services: [
      { key: "ban-mobil", name: "Ganti Ban Mobil", description: "Pemasangan ban baru untuk mobil penumpang.", duration: "30–45 menit", startingPrice: "Mulai Rp 50.000/ban" },
      { key: "ban-suv",   name: "Ganti Ban SUV/MPV", description: "Pemasangan ban untuk SUV, MPV, & kendaraan besar.", duration: "45–60 menit", startingPrice: "Mulai Rp 75.000/ban" },
    ],
  },
  {
    key: "spooring", label: "Spooring", icon: Layers, bg: "#fff8f0", color: "#F57C00",
    description: "Penyetelan sudut roda agar kemudi presisi & ban awet.",
    services: [
      { key: "spooring-3d", name: "Spooring 3D", description: "Spooring dengan alat digital 3D presisi tinggi.", duration: "45–60 menit", startingPrice: "Mulai Rp 150.000" },
    ],
  },
  {
    key: "balancing", label: "Balancing", icon: GaugeCircle, bg: "#f0f8ff", color: "#1565C0",
    description: "Penyeimbangan roda agar tidak getar saat berkendara.",
    services: [
      { key: "balancing-4", name: "Balancing 4 Roda", description: "Balancing menyeluruh untuk seluruh roda.", duration: "30 menit", startingPrice: "Mulai Rp 80.000" },
    ],
  },
  {
    key: "ganti-oli", label: "Ganti Oli", icon: Droplets, bg: "#f0fff4", color: "#2E7D32",
    description: "Penggantian oli mesin & filter sesuai rekomendasi pabrikan.",
    services: [
      { key: "oli-mesin",   name: "Ganti Oli Mesin",     description: "Penggantian oli mesin standar atau premium.", duration: "20–30 menit", startingPrice: "Mulai Rp 250.000" },
      { key: "oli-transmisi", name: "Ganti Oli Transmisi", description: "Penggantian oli transmisi matic/manual.", duration: "30–45 menit", startingPrice: "Mulai Rp 350.000" },
    ],
  },
  {
    key: "tune-up", label: "Tune Up", icon: Wrench, bg: "#fdf0ff", color: "#7B1FA2",
    description: "Servis berkala untuk menjaga performa mesin tetap prima.",
    services: [
      { key: "tune-up-ringan", name: "Tune Up Ringan",  description: "Pembersihan throttle, busi, & filter udara.", duration: "60 menit", startingPrice: "Mulai Rp 350.000" },
      { key: "tune-up-besar",  name: "Tune Up Besar",   description: "Servis menyeluruh termasuk injektor & ruang bakar.", duration: "120 menit", startingPrice: "Mulai Rp 750.000" },
    ],
  },
  {
    key: "cuci-mobil", label: "Cuci Mobil", icon: CloudRain, bg: "#e8f5fe", color: "#0288D1",
    description: "Cuci eksterior & interior dengan produk berkualitas.",
    services: [
      { key: "cuci-eksterior", name: "Cuci Eksterior",        description: "Cuci body, ban, & velg.", duration: "30 menit", startingPrice: "Mulai Rp 50.000" },
      { key: "cuci-detailing", name: "Cuci + Detailing",      description: "Cuci lengkap dengan poles & wax.", duration: "120 menit", startingPrice: "Mulai Rp 250.000" },
    ],
  },
  {
    key: "rem-kampas", label: "Rem & Kampas", icon: CircleDot, bg: "#fff3e0", color: "#E65100",
    description: "Pemeriksaan & penggantian sistem pengereman.",
    services: [
      { key: "kampas-depan",  name: "Ganti Kampas Rem Depan", description: "Penggantian kampas rem roda depan.", duration: "45 menit", startingPrice: "Mulai Rp 200.000" },
      { key: "kampas-belakang", name: "Ganti Kampas Rem Belakang", description: "Penggantian kampas rem roda belakang.", duration: "45 menit", startingPrice: "Mulai Rp 200.000" },
    ],
  },
  {
    key: "lainnya", label: "Lainnya", icon: MoreHorizontal, bg: "#f5f5f5", color: "#8e8e93",
    description: "Lihat seluruh layanan yang tersedia di katalog kami.",
    services: [],
  },
];

const ServiceCategoryGrid = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<SubService | null>(null);

  const openCategory = (cat: Category) => {
    if (cat.key === "lainnya") {
      navigate("/katalog");
      return;
    }
    setActiveCategory(cat);
    // Auto-select if only 1 sub-service
    setSelectedService(cat.services.length === 1 ? cat.services[0] : null);
  };

  const closeSheet = () => {
    setActiveCategory(null);
    setSelectedService(null);
  };

  const handleBooking = () => {
    if (!activeCategory || !selectedService) return;
    closeSheet();
    navigate(`/booking?service=${activeCategory.key}&sub=${selectedService.key}`);
  };

  return (
    <section
      className="lg:hidden"
      style={{ maxWidth: "100%", boxSizing: "border-box" }}
    >
      <div className="flex items-center justify-between" style={{ padding: "16px 16px 8px" }}>
        <h2
          className="text-foreground"
          style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Layanan
        </h2>
        <button
          onClick={() => navigate("/katalog")}
          style={{ fontSize: 12, color: "#E53935", fontWeight: 600, minHeight: 32, padding: "0 4px" }}
          aria-label="Lihat semua layanan"
        >
          Lihat semua
        </button>
      </div>

      <div
        className="grid grid-cols-4"
        style={{ gap: 8, padding: "0 16px", maxWidth: "100%", boxSizing: "border-box" }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => openCategory(cat)}
              className="flex flex-col items-center justify-start active:scale-[0.96] transition-transform"
              style={{ gap: 5, minHeight: 76 }}
              aria-label={cat.label}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: cat.bg,
                }}
              >
                <Icon style={{ width: 22, height: 22, color: cat.color }} strokeWidth={2} />
              </span>
              <span
                className="text-center"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.2,
                }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      <Sheet open={!!activeCategory} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 max-h-[85vh] overflow-hidden flex flex-col"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {activeCategory && (
            <>
              <SheetHeader className="px-5 pt-5 pb-3 text-left">
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 44, height: 44, borderRadius: 12, background: activeCategory.bg }}
                  >
                    <activeCategory.icon style={{ width: 22, height: 22, color: activeCategory.color }} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <SheetTitle style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                      {activeCategory.label}
                    </SheetTitle>
                    <SheetDescription style={{ fontSize: 12, marginTop: 2 }}>
                      {activeCategory.description}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 pb-3">
                {activeCategory.services.length > 1 && (
                  <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                    Pilih Layanan
                  </p>
                )}

                <div className="flex flex-col" style={{ gap: 8 }}>
                  {activeCategory.services.map((svc) => {
                    const isActive = selectedService?.key === svc.key;
                    return (
                      <button
                        key={svc.key}
                        onClick={() => setSelectedService(svc)}
                        className="text-left transition-all active:scale-[0.99]"
                        style={{
                          border: `1.5px solid ${isActive ? activeCategory.color : "hsl(var(--border))"}`,
                          background: isActive ? activeCategory.bg : "hsl(var(--card))",
                          borderRadius: 12,
                          padding: "12px 14px",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                                {svc.name}
                              </span>
                              {isActive && (
                                <CheckCircle2 style={{ width: 14, height: 14, color: activeCategory.color }} />
                              )}
                            </div>
                            <p style={{ fontSize: 11.5, color: "hsl(var(--muted-foreground))", marginTop: 3, lineHeight: 1.4 }}>
                              {svc.description}
                            </p>
                            <div className="flex items-center flex-wrap" style={{ gap: 10, marginTop: 6 }}>
                              <span className="flex items-center" style={{ gap: 3, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                                <Clock style={{ width: 11, height: 11 }} />
                                {svc.duration}
                              </span>
                              {svc.startingPrice && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: activeCategory.color }}>
                                  {svc.startingPrice}
                                </span>
                              )}
                            </div>
                          </div>
                          {!isActive && activeCategory.services.length > 1 && (
                            <ChevronRight style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))", marginTop: 2 }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="px-5 pt-3 pb-4"
                style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
              >
                <button
                  onClick={handleBooking}
                  disabled={!selectedService}
                  className="w-full flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    gap: 6,
                    height: 44,
                    borderRadius: 12,
                    background: selectedService ? activeCategory.color : "hsl(var(--muted))",
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: 600,
                    boxShadow: selectedService ? `0 4px 12px ${activeCategory.color}40` : "none",
                  }}
                >
                  Booking Sekarang
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default ServiceCategoryGrid;
