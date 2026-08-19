"use client";

import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

const items = [
  { href: "/", icon: "🏠", en: "Home", zh: "首页" },
  { href: "/pets", icon: "🐶", en: "Pets", zh: "宠物" },
  { href: "/booking", icon: "📅", en: "Book", zh: "预约" },
  { href: "/orders", icon: "📦", en: "Orders", zh: "订单" },
  { href: "/diary", icon: "📸", en: "Diary", zh: "日记" },
  { href: "/account", icon: "🔐", en: "Me", zh: "账号" }
];

export function OwnerSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="owner-app-shell">
      <aside className="owner-sidebar">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:block">
          <BrandMark />
          <div className="lg:mt-5">
            <LanguageToggle />
          </div>
        </div>
        <nav className="owner-nav-grid">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className="owner-nav-item"
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                <span className="owner-nav-icon">{item.icon}</span>
                <span className="min-w-0 truncate">{t({ en: item.en, zh: item.zh })}</span>
              </a>
            );
          })}
        </nav>
      </aside>
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
