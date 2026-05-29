"use client";

import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

const items = [
  { href: "/", icon: "🏡", en: "Home", zh: "首页" },
  { href: "/pets", icon: "🐶", en: "Pet Profile", zh: "宠物档案" },
  { href: "/booking", icon: "📅", en: "Booking", zh: "预约" },
  { href: "/payment", icon: "💳", en: "Payment", zh: "付款" },
  { href: "/orders", icon: "📦", en: "Orders", zh: "我的订单" },
  { href: "/diary", icon: "📸", en: "Pet Diary", zh: "宠物日记" },
  { href: "/auth", icon: "🔐", en: "Login", zh: "登录" }
];

export function OwnerSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-villa-bg text-villa-text lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-villa-line bg-villa-cream/90 p-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center justify-between gap-4 lg:block">
          <BrandMark />
          <div className="lg:mt-6">
            <LanguageToggle />
          </div>
        </div>
        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-black transition ${active ? "bg-villa-coral text-villa-text shadow-soft" : "bg-white/60 text-villa-text/70 hover:bg-villa-peach/40"}`}
              >
                <span>{item.icon}</span>
                <span>{t({ en: item.en, zh: item.zh })}</span>
              </a>
            );
          })}
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
