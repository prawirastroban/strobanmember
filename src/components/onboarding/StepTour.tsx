import { Bell, CalendarCheck, Gift, History, ShoppingBag } from "lucide-react";

const features = [
  { icon: CalendarCheck, title: "Booking Servis", desc: "Pilih cabang, tanggal, dan jam. Bisa antar-jemput." },
  { icon: ShoppingBag, title: "Katalog & Ban", desc: "Lihat paket servis, oli, dan harga ban lengkap." },
  { icon: History, title: "Riwayat Perawatan", desc: "Semua servis tercatat rapi beserta garansi." },
  { icon: Gift, title: "Poin & Referral", desc: "Kumpulkan poin, tukar reward, ajak teman dapat cashback." },
  { icon: Bell, title: "Notifikasi", desc: "Progres servis dan reminder servis berkala." },
];

export default function StepTour() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight">Kenalan dengan fiturnya</h3>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">
          Semua ada di menu bawah aplikasi.
        </p>
      </div>
      <ul className="space-y-2">
        {features.map(({ icon: Icon, title, desc }) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2.5"
          >
            <span className="h-8 w-8 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight">{title}</p>
              <p className="text-[11.5px] text-muted-foreground leading-snug">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}