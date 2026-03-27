import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
    const path = serviceId ? `/booking?service=${serviceId}` : "/booking";
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

  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">
              {t.catalog?.label || "Service Catalog"}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {t.catalog?.title || "All Services"}{" "}
              <span className="text-primary">{t.catalog?.titleHighlight || "in One Place"}</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              {t.catalog?.subtitle || "Browse our complete range of professional car care services. Quality guaranteed."}
            </p>
          </div>
          <Button
            variant="outline"
            className="self-start md:self-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground gap-1"
            onClick={() => handleBooking()}
          >
            {t.catalog?.viewAll || "Book a Service"} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)]"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-5 space-y-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-8 w-1/2" />
                  </CardContent>
                </Card>
              ))
            : filteredServices.map((service) => {
                const Icon = ICON_MAP[service.icon] || Wrench;
                return (
                  <Card
                    key={service.id}
                    className="group relative bg-card border-border hover:border-primary/40 hover:shadow-[var(--shadow-medium)] transition-all duration-300 overflow-hidden cursor-pointer"
                    onClick={() => handleBooking(service.booking_service_id || undefined)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        {service.badge && (
                          <Badge
                            className={`text-xs font-semibold ${
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

                      <h3 className="font-semibold text-foreground text-base leading-snug mb-1">
                        {service.name}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                        {service.description}
                      </p>

                      <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          <span className="text-foreground font-medium">{service.rating}</span>
                          <span>({service.reviews})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration} min
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {t.catalog?.startingFrom || "Starting from"}
                          </p>
                          <p className="text-lg font-bold text-primary leading-tight">
                            {formatPrice(service.price)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-3 h-8 shadow-[var(--shadow-soft)] group-hover:shadow-[var(--shadow-glow-sm)] transition-shadow"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBooking(service.booking_service_id || undefined);
                          }}
                        >
                          {t.catalog?.bookNow || "Book Now"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10 border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
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
