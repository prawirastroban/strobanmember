import { useLanguage } from "@/i18n/LanguageContext";
import { CarFront, Instagram, Facebook, Youtube } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { Link } from "react-router-dom";
import { buildWhatsAppUrl, handleWhatsAppNavigation } from "@/lib/whatsapp";

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.9a4.85 4.85 0 0 1-1.84-.21z" />
  </svg>
);

const ShopeeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 1.5c-2.5 0-4.5 2.13-4.5 4.75v.5H3.3a.6.6 0 0 0-.6.55l-1 14.2A2 2 0 0 0 3.7 23.5h16.6a2 2 0 0 0 2-2.1l-1-14.1a.6.6 0 0 0-.6-.55h-4.2v-.5C16.5 3.63 14.5 1.5 12 1.5zm0 1.6c1.7 0 3 1.4 3 3.15v.5H9v-.5c0-1.75 1.3-3.15 3-3.15zm-.2 7.4c2.5 0 4 1.2 4 1.2l-.8 1.5s-1.2-.95-3.1-.95c-1.1 0-1.8.45-1.8 1.15 0 .8.9 1.05 2.2 1.5 1.7.55 3.7 1.3 3.7 3.5 0 2.05-1.7 3.3-4.2 3.3-2.9 0-4.5-1.65-4.5-1.65l1-1.4s1.4 1.4 3.5 1.4c1.3 0 2.3-.55 2.3-1.5 0-1-1-1.3-2.4-1.75-1.65-.55-3.5-1.2-3.5-3.25 0-1.85 1.6-3.05 3.6-3.05z" />
  </svg>
);

const TokopediaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.5 2 2 5.4 2 9.6v6c0 3.5 3 6.4 7 6.4h6c4 0 7-2.9 7-6.4v-6C22 5.4 17.5 2 12 2zm0 1.6c4.6 0 8.4 2.7 8.4 6v6c0 2.6-2.3 4.8-5.4 4.8H9c-3.1 0-5.4-2.2-5.4-4.8v-6c0-3.3 3.8-6 8.4-6zm0 3.4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 1.7a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6z" />
  </svg>
);

const supportWhatsAppUrl = buildWhatsAppUrl({ phone: "628973700800" });

const socialLinks = [
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/stroban.id/" },
  { icon: Facebook, label: "Facebook", href: "https://www.facebook.com/stroban.id/" },
  { icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@StrobanID" },
  { icon: TikTokIcon, label: "TikTok", href: "https://www.tiktok.com/@strobanid" },
  { icon: ShopeeIcon, label: "Shopee", href: "https://s.shopee.co.id/6AaFgNT6G5" },
  { icon: TokopediaIcon, label: "Tokopedia", href: "https://tokopedia.link/1cdEaum00Ub" },
];

const Footer = ({ embedded = false }: { embedded?: boolean }) => {
  const { t } = useLanguage();
  const { logoDark, brandName } = useBranding();

  return (
    <footer className={embedded ? "footer-embedded relative mt-4" : "relative overflow-hidden bg-foreground text-background max-lg:shadow-[0_100vh_0_100vh_hsl(var(--foreground))]"}>
      <div className="relative container mx-auto max-w-3xl px-5 pt-8 pb-6 max-lg:pb-6">
        <div
          role="img"
          aria-label={brandName}
          className="h-7 w-28 mb-3"
          style={{
            backgroundColor: "hsl(var(--primary))",
            WebkitMaskImage: `url(${logoDark})`, maskImage: `url(${logoDark})`,
            WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
            WebkitMaskPosition: "left center", maskPosition: "left center",
            WebkitMaskSize: "contain", maskSize: "contain",
          }}
        />
        <p className="text-[13px] leading-relaxed text-background/75 mb-4">{t.footer.brandDesc}</p>
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {socialLinks.map(({ icon: Icon, label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
              className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-background/15 bg-gradient-to-br from-background/15 to-background/[0.03] shadow-[inset_0_1px_2px_hsl(var(--background)/0.35)] backdrop-blur-xl transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Icon className="h-4 w-4 text-background" />
            </a>
          ))}
        </div>
        <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {[["/legal/terms","Syarat & Ketentuan"],["/legal/privacy","Kebijakan Privasi"],["/legal/faq","FAQ"],["/legal/contact","Kontak"],["/cabang","Lokasi Cabang"]].map(([to, label]) => (
            <Link key={to} to={to} className="py-1.5 text-background/75 hover:text-background transition-colors">{label}</Link>
          ))}
          <Link to="/feedback" className="py-1.5 text-background/75 hover:text-background transition-colors">Lapor Bug</Link>
          <a href={supportWhatsAppUrl} onClick={(event) => handleWhatsAppNavigation(event, supportWhatsAppUrl)} target="_blank" rel="noopener noreferrer" className="py-1.5 text-background/75 hover:text-background transition-colors">WhatsApp Support</a>
        </nav>
        <div className="mt-5 flex items-center gap-2 border-t border-background/10 pt-4 text-[12px] text-background/65">
          <CarFront className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p>© {new Date().getFullYear()} Stroban Service. {t.footer.tagline}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
