import heroBengkel from "@/assets/hero-bengkel.jpg";

const ITEMS = [
  {
    title: "Harga Transparan",
    desc: "Kami memastikan harga yang kami berikan adalah harga asli, tanpa ada biaya tersembunyi.",
  },
  {
    title: "Garansi Servis & Spareparts",
    desc: "Kami memastikan setiap servis mendapatkan garansi dan pergantian produk baru.",
  },
  {
    title: "Booking Bebas Antri",
    desc: "Kami memastikan pengerjaan servis dilakukan dengan cepat, tepat, dan presisi.",
  },
  {
    title: "Selalu Ada Promo",
    desc: "Kami memastikan selalu memberikan harga terbaik untuk konsumen kami.",
  },
];

const TrustStrip = () => {
  return (
    <section className="lg:hidden mt-8 mb-8" aria-labelledby="who-we-are-title">
      {/* Banner */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <img
          src={heroBengkel}
          alt="Teknisi Bengkel Mobil Stroban sedang melayani pelanggan"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/65" />
        <h2
          id="who-we-are-title"
          className="absolute inset-0 flex items-center justify-center px-6 text-center text-2xl font-extrabold text-background leading-tight"
        >
          Kenapa pilih Stroban ?
        </h2>
      </div>

      {/* Why choose us */}
      <div className="bg-muted/40 px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {ITEMS.map(({ title, desc }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-xl p-3.5 shadow-sm"
            >
              <p className="text-sm font-extrabold text-primary leading-snug">{title}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;