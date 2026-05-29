"use client";

import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

const navItems = [
  { href: "/services", en: "Services", zh: "服务" },
  { href: "/#how-it-works", en: "How It Works", zh: "预约流程" },
  { href: "/#reviews", en: "Reviews", zh: "评价" }
];

export function AppNav({ host = false }: { host?: boolean }) {
  const { t } = useLanguage();

  if (host) {
    return (
      <header className="sticky top-0 z-40 border-b border-villa-peach/10 bg-villa-brown px-5 py-4 text-villa-peach sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandMark dark host />
            <span className="rounded-pill bg-villa-peach/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-villa-peach">Host Panel</span>
          </div>
          <LanguageToggle dark />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-villa-line/80 bg-villa-bg/90 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <BrandMark />
        <nav className="flex flex-wrap items-center gap-2 sm:gap-5">
          {navItems.map((item) => (
            <a key={item.href} className="px-1 py-2 text-sm font-black text-villa-text/70 transition hover:text-villa-text" href={item.href}>
              {t({ en: item.en, zh: item.zh })}
            </a>
          ))}
          <a className="villa-button min-h-[44px] px-5" href="/booking">{t({ en: "Book Now", zh: "立即预约" })}</a>
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}
