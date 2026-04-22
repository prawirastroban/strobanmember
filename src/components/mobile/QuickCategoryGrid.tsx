import { useState } from "react";
import {
  Wrench, Disc, Droplets, Wind, Zap, Sparkles, Car, Tag,
  Clock, ShieldCheck, CheckCircle2, ArrowRight, type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";

type Category = {
  key: string;
  icon: LucideIcon;
  label: string;
  tone: string; // bg + text classes for icon chip
  gradient: string; // gradient classes for hero in dialog
  tagline: string;
  description: string;
  duration: string;
  startFrom?: string;
  benefits: string[];
  ctaPath: string; // navigate target on confirm
  ctaLabel: string;
};

const CATEGORIES: Category[] = [
  {
    key: "servis",
    icon: Wrench,
    label: "Servis",
    tone: "bg-blue-500/10 text-blue-600",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    tagline: "Servis berkala mobil Anda",
    description: "Pemeriksaan menyeluruh oleh teknisi tersertifikasi, mencakup mesin, rem, dan kelistrikan dasar.",
    duration: "60–120 menit",
    startFrom: "Rp 150.000",
    benefits: ["Cek 25 titik komponen", "Garansi pengerjaan", "Laporan digital"],
    ctaPath: "/booking",
    ctaLabel: "Booking Servis",
  },
  {
    key: "ban",
    icon: Disc,
    label: "Ban",
    tone: "bg-orange-500/10 text-orange-600",
    gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
    tagline: "Ban berkualitas, harga terbaik",
    description: "Pilih ban dari brand terpercaya. Termasuk pemasangan, balancing, dan pembuangan ban lama.",
    duration: "45–60 menit",
    startFrom: "Rp 750.000",
    benefits: ["Brand resmi", "Pasang + balancing", "Garansi pabrik"],
    ctaPath: "/#tires",
    ctaLabel: "Lihat Katalog Ban",
  },
  {
    key: "oli",
    icon: Droplets,
    label: "Ganti Oli",
    tone: "bg-emerald-500/10 text-emerald-600",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    tagline: "Mesin halus, performa optimal",
    description: "Ganti oli mesin, filter, dan pemeriksaan level oli transmisi. Oli original sesuai rekomendasi pabrikan.",
    duration: "30–45 menit",
    startFrom: "Rp 350.000",
    benefits: ["Oli original", "Ganti filter", "Reset indikator"],
    ctaPath: "/booking",
    ctaLabel: "Booking Ganti Oli",
  },
  {
    key: "ac",
    icon: Wind,
    label: "AC Mobil",
    tone: "bg-cyan-500/10 text-cyan-600",
    gradient: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    tagline: "AC dingin maksimal kembali",
    description: "Servis AC lengkap: cek freon, bersihkan evaporator, dan periksa kompresor.",
    duration: "60–90 menit",
    startFrom: "Rp 250.000",
    benefits: ["Cek freon", "Bersihkan evaporator", "Anti bau"],
    ctaPath: "/booking",
    ctaLabel: "Booking Servis AC",
  },
  {
    key: "aki",
    icon: Zap,
    label: "Aki & Listrik",
    tone: "bg-yellow-500/10 text-yellow-600",
    gradient: "from-yellow-500/20 via-yellow-500/5 to-transparent",
    tagline: "Sistem kelistrikan prima",
    description: "Pemeriksaan aki, alternator, dinamo starter, dan kelistrikan menyeluruh. Penggantian aki bila perlu.",
    duration: "30–60 menit",
    startFrom: "Rp 100.000",
    benefits: ["Tes load aki", "Cek alternator", "Aki original"],
    ctaPath: "/booking",
    ctaLabel: "Booking Cek Aki",
  },
  {
    key: "detailing",
    icon: Sparkles,
    label: "Detailing",
    tone: "bg-purple-500/10 text-purple-600",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    tagline: "Mobil seperti baru lagi",
    description: "Cuci detail interior dan eksterior, poles body, serta perlindungan coating opsional.",
    duration: "3–5 jam",
    startFrom: "Rp 500.000",
    benefits: ["Cuci detail", "Poles body", "Vakum interior"],
    ctaPath: "/booking",
    ctaLabel: "Booking Detailing",
  },
  {
    key: "body",
    icon: Car,
    label: "Body Care",
    tone: "bg-rose-500/10 text-rose-600",
    gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
    tagline: "Perbaikan body & cat",
    description: "Perbaikan baret, penyok, dan pengecatan ulang dengan finishing rapi dan warna presisi.",
    duration: "1–3 hari",
    startFrom: "Rp 400.000",
    benefits: ["Color matching", "Oven curing", "Garansi cat"],
    ctaPath: "/booking",
    ctaLabel: "Booking Body Care",
  },
  {
    key: "promo",
    icon: Tag,
    label: "Promo",
    tone: "bg-red-500/10 text-red-600",
    gradient: "from-red-500/20 via-red-500/5 to-transparent",
    tagline: "Promo spesial bulan ini",
    description: "Kumpulan penawaran terbatas: diskon servis, paket hemat, dan bonus poin loyalitas.",
    duration: "Berlaku terbatas",
    benefits: ["Diskon servis", "Paket hemat", "Bonus poin"],
    ctaPath: "/#promo",
    ctaLabel: "Lihat Semua Promo",
  },
];

const QuickCategoryGrid = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [selected, setSelected] = useState<Category | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    const path = selected.ctaPath;
    setSelected(null);

    if (path.startsWith("/#")) {
      const id = path.slice(2);
      // Small delay so the dialog can close before scrolling
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
      return;
    }

    if (path === "/booking" && !user) {
      openLoginDialog(path);
      return;
    }
    navigate(path);
  };

  return (
    <>
      <section className="lg:hidden -mt-6 px-3 relative z-10">
        <div className="bg-card border border-border rounded-2xl shadow-md p-3 grid grid-cols-4 gap-y-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setSelected(cat)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition"
                aria-label={`Lihat detail ${cat.label}`}
              >
                <span className={`h-12 w-12 rounded-2xl flex items-center justify-center ${cat.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-foreground leading-tight text-center whitespace-nowrap">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-2xl border-border">
          {selected && (
            <>
              {/* Hero */}
              <div className={`relative bg-gradient-to-br ${selected.gradient} px-5 pt-6 pb-5`}>
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${selected.tone} shadow-sm`}>
                  <selected.icon className="h-7 w-7" />
                </div>
                <DialogHeader className="mt-3 text-left space-y-1">
                  <DialogTitle className="text-lg font-bold">{selected.label}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {selected.tagline}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Body */}
              <div className="px-5 pt-4 pb-2 space-y-4">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {selected.description}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Estimasi
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{selected.duration}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Mulai dari
                    </div>
                    <p className="text-sm font-semibold mt-0.5">
                      {selected.startFrom ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Yang Anda dapat
                  </p>
                  <ul className="space-y-1.5">
                    {selected.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <DialogFooter className="px-5 pb-5 pt-2 flex-col gap-2 sm:flex-col sm:space-x-0">
                <Button onClick={handleConfirm} className="w-full">
                  {selected.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)} className="w-full">
                  Nanti saja
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickCategoryGrid;