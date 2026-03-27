import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Car, MapPin, Phone, Mail, Instagram, Facebook, Youtube, ArrowRight } from "lucide-react";
import strobanLogo from "@/assets/stroban_white.png";

const branches = [
  {
    city: "Bandung",
    address: "Jl. Soekarno Hatta No. 123, Bandung",
    phone: "+62 22 1234 5678",
  },
  {
    city: "Tasikmalaya",
    address: "Jl. HZ Mustofa No. 45, Tasikmalaya",
    phone: "+62 265 1234 567",
  },
  {
    city: "Cirebon",
    address: "Jl. Siliwangi No. 88, Cirebon",
    phone: "+62 231 1234 567",
  },
  {
    city: "Yogyakarta",
    address: "Jl. Magelang Km. 5, Yogyakarta",
    phone: "+62 274 1234 567",
  },
];

const socialLinks = [
  { icon: Instagram, label: "Instagram", href: "https://instagram.com/stroban" },
  { icon: Facebook, label: "Facebook", href: "https://facebook.com/stroban" },
  { icon: Youtube, label: "YouTube", href: "https://youtube.com/stroban" },
];

const Footer = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBooking = () => {
    if (user) {
      navigate("/booking");
    } else {
      openLoginDialog("/booking");
    }
  };

  return (
    <footer className="bg-foreground text-background">
      {/* CTA Strip */}
      <div className="bg-primary">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-primary-foreground text-lg">{t.footer.ctaTitle}</p>
            <p className="text-primary-foreground/80 text-sm">{t.footer.ctaSubtitle}</p>
          </div>
          <button
            onClick={handleBooking}
            className="flex items-center gap-2 bg-primary-foreground text-primary font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex-shrink-0"
          >
            {t.hero.bookService}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-1">
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

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">
              {t.footer.quickLinks}
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: t.footer.home, path: "/" },
                { label: t.footer.services, path: "/#catalog" },
                { label: t.footer.bookNow, path: "/booking", protected: true },
                { label: t.footer.memberLogin, path: "/auth" },
              ].map(({ label, path, protected: isProtected }) => (
                <li key={label}>
                  <button
                    onClick={() => {
                      if (isProtected) {
                        handleBooking();
                      } else {
                        navigate(path);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="text-background/60 hover:text-primary text-sm transition-colors flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Branches */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">
              {t.branches.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {branches.map((branch) => (
                <div key={branch.city} className="flex flex-col gap-1">
                  <p className="font-semibold text-background text-sm">{branch.city}</p>
                  <p className="text-background/55 text-xs flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                    {branch.address}
                  </p>
                  <a
                    href={`tel:${branch.phone.replace(/\s/g, "")}`}
                    className="text-background/55 text-xs flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    {branch.phone}
                  </a>
                </div>
              ))}
            </div>

            {/* Contact Email */}
            <div className="mt-6 pt-5 border-t border-background/10">
              <a
                href="mailto:hello@stroban.id"
                className="text-background/60 text-sm flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-primary" />
                hello@stroban.id
              </a>
            </div>
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
