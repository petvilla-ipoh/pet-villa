"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

function hasSession() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("pet-villa-session"));
}

const publicNav = [
  { href: "/services", en: "Services", zh: "服务" },
  { href: "/#how-it-works", en: "How It Works", zh: "流程" },
  { href: "/#reviews", en: "Reviews", zh: "评价" }
];

const privateNav = [
  { href: "/pets", en: "My Pets", zh: "宠物" },
  { href: "/booking", en: "Bookings", zh: "预约" },
  { href: "/orders", en: "Orders", zh: "订单" },
  { href: "/diary", en: "Diary", zh: "日记" }
];

export function AppNav({ host = false }: { host?: boolean }) {
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLoggedIn(hasSession());
    function sync() {
      setLoggedIn(hasSession());
    }
    window.addEventListener("storage", sync);
    window.addEventListener("pet-villa-auth", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pet-villa-auth", sync);
    };
  }, []);

  if (host) {
    return (
      <header className="sticky top-0 z-40 border-b border-villa-primary-light/10 bg-villa-host-dark px-4 py-3 text-villa-primary-light">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark dark host />
            <span className="hidden rounded-pill bg-villa-primary-light/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-villa-primary-light sm:inline-flex">Host Panel</span>
          </div>
          <LanguageToggle dark />
        </div>
      </header>
    );
  }

  const navItems = loggedIn ? privateNav : publicNav;

  return (
    <header className="sticky top-0 z-40 border-b border-villa-primary-light bg-villa-background/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <BrandMark />
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-villa-primary-light bg-white text-xl font-black shadow-sm lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Menu"
        >
          ☰
        </button>
        <nav className="hidden items-center gap-3 lg:flex">
          {navItems.map((item) => (
            <a key={item.href} className="px-1 py-2 text-sm font-bold text-villa-text-secondary transition hover:text-villa-text-primary" href={item.href}>
              {t({ en: item.en, zh: item.zh })}
            </a>
          ))}
          {loggedIn ? (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-villa-primary text-sm font-black text-villa-text-primary">PV</span>
          ) : (
            <>
              <a className="villa-button-outline min-h-[42px] px-4" href="/auth?mode=login">{t({ en: "Login", zh: "登录" })}</a>
              <a className="villa-button min-h-[42px] px-4" href="/auth?mode=register">{t({ en: "Register", zh: "注册" })}</a>
            </>
          )}
          <a className="villa-button-dark min-h-[42px] px-4" href="/booking">{t({ en: "Book Now", zh: "立即预约" })}</a>
          <LanguageToggle />
        </nav>
      </div>
      {open ? (
        <nav className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-[20px] border border-villa-primary-light bg-white p-3 shadow-md lg:hidden">
          {navItems.map((item) => (
            <a key={item.href} className="rounded-[14px] px-3 py-3 text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" href={item.href}>
              {t({ en: item.en, zh: item.zh })}
            </a>
          ))}
          {loggedIn ? (
            <div className="flex items-center gap-3 rounded-[14px] bg-villa-primary-bg px-3 py-3 text-sm font-bold">PV {t({ en: "Account", zh: "账号" })}</div>
          ) : (
            <div className="grid gap-2">
              <a className="villa-button-outline" href="/auth?mode=login">{t({ en: "Login", zh: "登录" })}</a>
              <a className="villa-button" href="/auth?mode=register">{t({ en: "Register", zh: "注册" })}</a>
            </div>
          )}
          <a className="villa-button-dark" href="/booking">{t({ en: "Book Now", zh: "立即预约" })}</a>
          <LanguageToggle />
        </nav>
      ) : null}
    </header>
  );
}
