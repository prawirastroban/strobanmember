import { Globe, Wrench, CalendarClock, UserRound, ClipboardCheck, MailCheck } from "lucide-react";

const STEPS = [
  {
    icon: Globe,
    title: "BUKA APLIKASI STROBAN",
    desc: "Kunjungi aplikasi atau situs resmi kami",
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
    <section className="lg:hidden px-4 mb-8" aria-labelledby="how-to-book-title">
      <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
        Panduan Aplikasi
      </p>
      <h2 id="how-to-book-title" className="text-xl font-bold text-foreground mt-1">
        Bagaimana cara booking
      </h2>

      <ol className="mt-4 relative">
        <span
          aria-hidden
          className="absolute left-[15px] top-3 bottom-3 w-px bg-border"
        />
        {STEPS.map(({ icon: Icon, title, desc, hint }, i) => (
          <li key={title} className="relative flex gap-3 pb-4 last:pb-0">
            <span className="relative z-10 h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-sm">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0 flex items-start gap-3 bg-card border border-border rounded-2xl p-3 shadow-sm">
              <span className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-primary leading-snug">{title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                {hint && (
                  <span className="inline-flex items-center gap-1.5 mt-2 rounded-full border border-primary/40 text-primary text-[11px] font-semibold px-2.5 py-1">
                    <Globe className="h-3 w-3" />
                    {hint}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HowToBook;