"use client";

import { useLanguage } from "./LanguageProvider";

export function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`flex rounded-pill border p-1 text-xs font-black ${dark ? "border-villa-peach/30 bg-white/5 text-villa-peach" : "border-villa-line bg-white/70 text-villa-text"}`}>
      <button
        type="button"
        className={`rounded-pill px-3 py-2 ${lang === "en" ? "bg-villa-coral text-villa-text" : ""}`}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={`rounded-pill px-3 py-2 ${lang === "zh" ? "bg-villa-coral text-villa-text" : ""}`}
        onClick={() => setLang("zh")}
      >
        中文
      </button>
    </div>
  );
}
