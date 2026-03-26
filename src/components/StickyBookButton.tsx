import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { CalendarCheck } from "lucide-react";

// Show sticky button after scrolling past ~500px (approx hero height on mobile)
const SCROLL_THRESHOLD = 400;

const StickyBookButton = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    if (user) navigate("/booking");
    else navigate("/auth?redirect=/booking");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="sticky-book"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          onClick={handleClick}
          className="fixed top-[68px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-[var(--shadow-glow)] text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <CalendarCheck className="h-4 w-4" />
          {t.hero.bookService}
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default StickyBookButton;
