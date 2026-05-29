"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "en" | "zh";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (copy: { en: string; zh: string }) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("pet-villa-lang");
    if (saved === "en" || saved === "zh") setLangState(saved);
  }, []);

  function setLang(nextLang: Lang) {
    setLangState(nextLang);
    window.localStorage.setItem("pet-villa-lang", nextLang);
  }

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    toggleLang: () => setLang(lang === "en" ? "zh" : "en"),
    t: (copy) => copy[lang]
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
