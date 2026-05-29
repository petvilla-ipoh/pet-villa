"use client";

import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

const items = [
  { href: "/", icon: "🏡", en: "Home", zh: "首页" },
  { href: "/pets", icon: "🐶", en: "My Pets", zh: "宠物" },
  { href: "/booking", icon: "📅", en: "Bookings", zh: "预约" },
  { href: "/payment", icon: "💳", en: "Payment", zh: "付款" },
  { href: "/orders", icon: "📦", en: "Orders", zh: "订单" },
  { href: "/diary", icon: "📸", en: "Diary", zh: "日记" },
  { href: "/auth", icon: "🔐", en: "Account", zh: "账号" }
];

export function OwnerSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-villa-background text-villa-text-primary lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-villa-primary-light bg-white/90 p-4 shadow-sm lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:block">
          <BrandMark />
          <div className="lg:mt-5">
            <LanguageToggle />
          </div>
        </div>
        <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-[16px] px-3 py-3 text-sm font-bold transition duration-200 ${
                  active ? "bg-villa-primary text-villa-text-primary shadow-sm" : "bg-villa-primary-bg text-villa-text-secondary hover:bg-villa-primary-light/40"
                }`}
              >
                <span>{item.icon}</span>
                <span>{t({ en: item.en, zh: item.zh })}</span>
              </a>
            );
          })}
        </nav>
      </aside>
      <main className="paw-bg min-h-screen">{children}</main>
    </div>
  );
}
