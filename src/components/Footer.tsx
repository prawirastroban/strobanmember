import { useLanguage } from "@/i18n/LanguageContext";
import { Car, Instagram, Facebook, Youtube } from "lucide-react";
import strobanLogo from "@/assets/stroban_white.png";

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

const socialLinks = [
  { icon: Instagram, label: "Instagram", href: "https://instagram.com/stroban" },
  { icon: Facebook, label: "Facebook", href: "https://facebook.com/stroban" },
  { icon: Youtube, label: "YouTube", href: "https://youtube.com/stroban" },
  { icon: TikTokIcon, label: "TikTok", href: "https://tiktok.com/@stroban" },
  { icon: ShopeeIcon, label: "Shopee", href: "https://shopee.co.id/stroban" },
];

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        {/* Brand & Social only */}
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <img src={strobanLogo} alt="Stroban" className="h-8 w-auto" />
          </div>
          <p className="text-background/60 text-sm leading-relaxed mb-5">
            {t.footer.brandDesc}
          </p>
          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
              >
                <Icon className="h-4 w-4 text-background" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-background/40">
          <p>© {new Date().getFullYear()} Stroban Service. {t.footer.allRightsReserved}</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-primary" />
              {t.footer.tagline}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
