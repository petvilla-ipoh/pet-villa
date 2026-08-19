"use client";

import { useLanguage } from "./LanguageProvider";

export function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`customer-language-toggle ${dark ? "is-dark" : ""}`}>
      <button
        type="button"
        data-active={lang === "en"}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <button
        type="button"
        data-active={lang === "zh"}
        onClick={() => setLang("zh")}
      >
        中文
      </button>
    </div>
  );
}
