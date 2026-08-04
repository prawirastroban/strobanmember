import { Globe, Wrench, CalendarClock, UserRound, ClipboardCheck, MailCheck } from "lucide-react";
import heroBengkel from "@/assets/hero-bengkel.jpg";

const STEPS = [
  {
    icon: Globe,
    title: "BUKA WEBSITE STROBAN",
    desc: "Kunjungi situs resmi kami",
    hint: "www.bengkelstroban.com",
  },
  {
    icon: Wrench,
    title: "PILIH LAYANAN SERVIS",
    desc: "Pilih jenis servis yang sesuai dengan kebutuhan mobil Anda",
  },
  {
    icon: CalendarClock,
    title: "PILIH TANGGAL & WAKTU",
    desc: "Tentukan tanggal dan waktu kunjungan yang Anda inginkan",
  },
  {
    icon: UserRound,
    title: "ISI DATA DIRI & KENDARAAN",
    desc: "Lengkapi data diri dan informasi kendaraan Anda dengan benar",
  },
  {
    icon: ClipboardCheck,
    title: "KONFIRMASI BOOKING",
    desc: "Periksa kembali detail booking lalu klik tombol konfirmasi",
  },
  {
    icon: MailCheck,
    title: "TERIMA KONFIRMASI",
    desc: "Anda akan menerima email/WhatsApp berisi detail booking servis Anda",
  },
];

/** Tutorial navigasi penggunaan aplikasi — "Bagaimana cara booking". */
const HowToBook = () => {
  return (
    <section className="lg:hidden mb-8" aria-labelledby="how-to-book-title">
      {/* Banner */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <img
          src={heroBengkel}
          alt="Bengkel Mobil Stroban tampak depan"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/65" />
        <h2
          id="how-to-book-title"
          className="absolute inset-0 flex items-center justify-center px-6 text-center text-2xl font-extrabold text-background leading-tight"
        >
          Bagaimana cara booking
        </h2>
      </div>

      <div className="bg-muted/40 px-4 py-5">
        <ol className="relative">
          <span
            aria-hidden
            className="absolute left-[15px] top-4 bottom-2 w-px border-l border-dashed border-border"
          />
          {STEPS.map(({ icon: Icon, title, desc, hint }, i) => (
            <li
              key={title}
              className="relative flex items-start gap-3 py-4 first:pt-0 border-b border-dashed border-border last:border-b-0 last:pb-0"
            >
              <span className="relative z-10 h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-sm">
                {i + 1}
              </span>
              <span className="h-14 w-14 shrink-0 rounded-2xl bg-card border border-border shadow-sm text-primary flex items-center justify-center">
                <Icon className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-extrabold text-primary leading-snug uppercase">
                  {title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                {hint && (
                  <span className="inline-flex items-center gap-1.5 mt-2 rounded-full border border-primary/40 text-primary text-[11px] font-semibold px-2.5 py-1">
                    <Globe className="h-3 w-3" />
                    {hint}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowToBook;