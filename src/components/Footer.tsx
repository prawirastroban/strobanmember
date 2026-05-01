import { useLanguage } from "@/i18n/LanguageContext";
import { Car, Instagram, Facebook, Youtube, Music2 } from "lucide-react";
import strobanLogo from "@/assets/stroban_white.png";

const socialLinks = [
  { icon: Instagram, label: "Instagram", href: "https://instagram.com/stroban" },
  { icon: Facebook, label: "Facebook", href: "https://facebook.com/stroban" },
  { icon: Youtube, label: "YouTube", href: "https://youtube.com/stroban" },
  { icon: Music2, label: "TikTok", href: "https://tiktok.com/@stroban" },
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
