import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { en } from "./en";
import { id } from "./id";

type Language = "en" | "id";
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = { en, id };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("app-language");
      return (saved === "en" || saved === "id") ? saved : "id";
    } catch {
      return "id";
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem("app-language", lang); } catch { /* ignore */ }
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (context) return context;

  return {
    language: "id" as Language,
    setLanguage: (lang: Language) => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("app-language", lang);
        }
      } catch { /* ignore */ }
    },
    t: translations.id,
  };
}
