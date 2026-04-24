import { ShieldCheck, Clock, Wrench, Award } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, title: "Garansi", desc: "Pengerjaan bergaransi" },
  { icon: Clock, title: "Cepat", desc: "Tanpa antri panjang" },
  { icon: Wrench, title: "Teknisi Ahli", desc: "Tersertifikasi" },
  { icon: Award, title: "Terpercaya", desc: "10.000+ pelanggan" },
];

const TrustStrip = () => {
  return (
    <section className="lg:hidden mt-8 px-4">
      <div className="grid grid-cols-2 gap-2.5">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-center gap-3 bg-muted/40 border border-border rounded-2xl p-3">
            <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustStrip;