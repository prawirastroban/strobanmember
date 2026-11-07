import { BadgeDollarSign, ShieldCheck, CalendarCheck, Sparkles } from "lucide-react";

const ITEMS = [
  { icon: BadgeDollarSign, title: "Harga Transparan", desc: "Harga asli, tanpa biaya tersembunyi." },
  { icon: ShieldCheck, title: "Garansi Servis", desc: "Spareparts & servis bergaransi resmi." },
  { icon: CalendarCheck, title: "Booking Bebas Antri", desc: "Jadwalkan servis kapan saja." },
  { icon: Sparkles, title: "Selalu Ada Promo", desc: "Penawaran terbaik setiap saat." },
];

/** Keunggulan Stroban — kartu kaca ringkas. */
const HowToBook = () => (
  <section className="lg:hidden mb-6 px-4" aria-labelledby="why-stroban-title">
    <h2 id="why-stroban-title" className="text-[14px] font-semibold tracking-tight text-foreground">
      Kenapa Stroban?
    </h2>
    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
      {ITEMS.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="relative overflow-hidden rounded-[22px] border border-border/40 bg-card/60 p-3.5 backdrop-blur-2xl shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.25),inset_0_1px_2px_hsl(var(--background)/0.6)]"
        >
          
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_1px_2px_hsl(var(--background)/0.7)]">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <p className="relative mt-2.5 text-[13px] font-semibold leading-snug text-foreground">{title}</p>
          <p className="relative mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowToBook;
