import { BadgeCheck, ShieldCheck, HeartHandshake, LifeBuoy } from "lucide-react";

const ITEMS = [
  {
    icon: BadgeCheck,
    title: "100% Original Product",
    desc: "Sparepart & oli dijamin asli, bergaransi resmi.",
  },
  {
    icon: ShieldCheck,
    title: "Bergaransi",
    desc: "Setiap servis dan penggantian produk bergaransi.",
  },
  {
    icon: HeartHandshake,
    title: "Pelayanan Terbaik",
    desc: "Teknisi tersertifikasi, cepat, tepat, dan transparan.",
  },
  {
    icon: LifeBuoy,
    title: "After Care",
    desc: "Pengingat servis & pendampingan setelah pengerjaan.",
  },
];

const TrustStrip = () => {
  return (
    <section className="lg:hidden mt-8 mb-8 px-4" aria-labelledby="who-we-are-title">
      {/* Who We Are */}
      <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
        Who We Are
      </p>
      <h2 id="who-we-are-title" className="text-xl font-bold text-foreground mt-1 leading-snug">
        Kenapa pilih <span className="text-primary">Stroban</span>?
      </h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
        Bengkel Mobil Stroban adalah bengkel perawatan mobil modern dengan teknisi
        tersertifikasi, harga transparan, dan produk original — melayani ribuan
        pemilik kendaraan di seluruh cabang kami.
      </p>

      {/* Why choose us */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 bg-card border border-border rounded-2xl p-3.5 shadow-sm"
          >
            <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary leading-snug">{title}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustStrip;