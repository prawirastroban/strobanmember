import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Droplets,
  RotateCcw,
  ShieldCheck,
  Wrench,
  Zap,
  Wind,
  ThermometerSun,
  Car,
  ChevronRight,
  Star,
  Clock,
  Tag,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets, RotateCcw, ShieldCheck, Wrench, Zap, Wind,
  ThermometerSun, Car, Sparkles, Settings,
};

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
  rating: number;
  reviews: number;
  badge: string | null;
  icon: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  booking_service_id: string | null;
}

const categories = ["all", "maintenance", "tires", "electrical", "ac", "body"];

const formatPrice = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

const ServiceCatalog = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [activeCategory, setActiveCategory] = useState("all");
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setServices((data as ServiceRow[]) || []);
      setIsLoading(false);
    };
    fetchServices();
  }, []);

  const handleBooking = (serviceId?: string) => {
    const path = serviceId ? `/booking?service=${encodeURIComponent(serviceId)}` : "/booking";
    if (user) navigate(path);
    else openLoginDialog(path);
  };

  const filteredServices =
    activeCategory === "all" ? services : services.filter((s) => s.category === activeCategory);

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      all: t.catalog?.all || "All Services",
      maintenance: t.catalog?.maintenance || "Maintenance",
      tires: t.catalog?.tires || "Tires",
      electrical: t.catalog?.electrical || "Electrical",
      ac: t.catalog?.ac || "AC Service",
      body: t.catalog?.body || "Body Care",
    };
    return labels[cat] || cat;
  };

  const CATEGORY_ICONS: Record<string, LucideIcon> = {
    all: Sparkles,
    maintenance: Wrench,
    tires: RotateCcw,
    electrical: Zap,
    ac: Wind,
    body: ShieldCheck,
  };

  return (
    <section id="services" className="py-4 md:py-8 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">
              {t.catalog?.label || "Service Catalog"}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {t.catalog?.title || "All Services"}{" "}
              <span className="text-primary">{t.catalog?.titleHighlight || "in One Place"}</span>
            </h2>
          </div>
          <Button
            variant="outline"
            className="self-start md:self-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground gap-1"
            onClick={() => handleBooking()}
          >
            {t.catalog?.viewAll || "Book a Service"} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Horizontal Category Tabs - tuhu style */}
        <div className="relative border-b border-border mb-8">
          <div className="flex overflow-x-auto scrollbar-none -mb-px">
            {categories.map((cat) => {
              const CatIcon = CATEGORY_ICONS[cat] || Wrench;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 flex-shrink-0 px-5 py-3.5 text-sm font-semibold border-b-[3px] transition-all duration-200 ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                  }`}
                >
                  <CatIcon className="h-4 w-4" />
                  {getCategoryLabel(cat)}
                  {isActive && (
                    <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      {filteredServices.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Service Cards Grid - e-commerce style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-3 space-y-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-6 w-1/2" />
                  </CardContent>
                </Card>
              ))
            : filteredServices.map((service) => {
                const Icon = ICON_MAP[service.icon] || Wrench;
                return (
                  <Card
                    key={service.id}
                    className="group relative bg-card border-border interactive-card hover:border-primary/40 cursor-pointer rounded-xl"
                    onClick={() => handleBooking(service.booking_service_id || service.id)}
                  >
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                    <CardContent className="p-3 md:p-4">
                      {/* Icon + Badge row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        {service.badge && (
                          <Badge
                            className={`text-[10px] font-semibold px-1.5 py-0.5 ${
                              service.badge === "Best Seller"
                                ? "bg-accent text-accent-foreground"
                                : service.badge === "Free Check"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-primary/15 text-primary border border-primary/25"
                            }`}
                          >
                            {service.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-foreground text-sm leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
                        {service.name}
                      </h3>

                      {/* Rating + Duration */}
                      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          {service.rating}
                        </span>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {service.duration}m
                        </span>
                      </div>

                      {/* Price + Book */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            {t.catalog?.startingFrom || "Mulai dari"}
                          </p>
                          <p className="text-base md:text-lg font-bold text-primary leading-tight">
                            {formatPrice(service.price)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="text-[10px] md:text-xs px-2 md:px-3 h-7 md:h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBooking(service.booking_service_id || service.id);
                          }}
                        >
                          {t.catalog?.bookNow || "Pesan"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10 border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {t.catalog?.ctaTitle || "Can't find what you need?"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t.catalog?.ctaSubtitle || "Talk to our service advisor. We handle all types of car care needs."}
            </p>
          </div>
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-glow)] flex-shrink-0"
            onClick={() => handleBooking()}
          >
            {t.hero.bookService}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServiceCatalog;
