import { CalendarCheck, Car, Gift, ShieldCheck } from "lucide-react";

const points = [
  { icon: CalendarCheck, text: "Booking servis tanpa antre" },
  { icon: Car, text: "Simpan data kendaraan pribadi" },
  { icon: ShieldCheck, text: "Pantau progres servis real-time" },
  { icon: Gift, text: "Kumpulkan poin & cashback" },
];

export default function StepWelcome({ name }: { name?: string | null }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[19px] font-semibold tracking-tight">
          Halo{name ? `, ${name.split(" ")[0]}` : ""} 👋
        </h3>
        <p className="text-[13px] text-muted-foreground mt-1">
          Yuk lengkapi akun Anda sebentar. Hanya butuh kurang dari 1 menit, lalu kami
          tunjukkan fitur-fitur utama aplikasi.
        </p>
      </div>
      <ul className="space-y-2">
        {points.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2.5"
          >
            <span className="h-8 w-8 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <span className="text-[13px]">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}