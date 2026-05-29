"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

function hasSession() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("pet-villa-session"));
}

const publicNav = [{ href: "/#about", en: "About", zh: "关于" }];

const privateNav = [
  { href: "/pets", en: "My Pets", zh: "我的宠物" },
  { href: "/booking", en: "Bookings", zh: "预约" },
  { href: "/orders", en: "Orders", zh: "订单" },
  { href: "/diary", en: "Pet Diary", zh: "宠物日记" }
];

const loginButtonClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-pill border-2 border-[#e8927c] bg-transparent px-6 py-2.5 text-sm font-bold text-[#e8927c] transition duration-200 ease-out hover:-translate-y-px hover:bg-villa-primary-bg";

const registerButtonClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-pill border-0 bg-[#e8927c] px-6 py-2.5 text-sm font-bold text-white transition duration-200 ease-out hover:-translate-y-px hover:shadow-md";

export function AppNav({ host = false }: { host?: boolean }) {
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoggedIn(hasSession());
    function sync() {
      setLoggedIn(hasSession());
    }
    function closeAccount(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    window.addEventListener("storage", sync);
    window.addEventListener("pet-villa-auth", sync);
    document.addEventListener("click", closeAccount);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pet-villa-auth", sync);
      document.removeEventListener("click", closeAccount);
    };
  }, []);

  function logout() {
    window.localStorage.removeItem("pet-villa-session");
    window.dispatchEvent(new Event("pet-villa-auth"));
    setLoggedIn(false);
    setAccountOpen(false);
    window.location.href = "/";
  }

  if (host) {
    return (
      <header className="sticky top-0 z-40 border-b border-villa-primary-light/10 bg-villa-host-dark px-4 py-3 text-villa-primary-light">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark dark host />
            <span className="hidden rounded-pill bg-villa-primary-light/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-villa-primary-light sm:inline-flex">
              Host Panel
            </span>
          </div>
          <LanguageToggle dark />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-villa-primary-light bg-villa-background/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <BrandMark />
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-villa-primary-light bg-white text-sm font-black shadow-sm lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Menu"
          aria-expanded={open}
        >
          <span className="h-0.5 w-5 rounded-full bg-villa-text-primary shadow-[0_6px_0_#3d1f0d,0_-6px_0_#3d1f0d]" />
        </button>
        <nav className="hidden items-center gap-3 lg:flex">
          {loggedIn
            ? privateNav.map((item) => (
                <a key={item.href} className="px-1 py-2 text-sm font-bold text-villa-text-secondary transition hover:text-villa-text-primary" href={item.href}>
                  {t({ en: item.en, zh: item.zh })}
                </a>
              ))
            : publicNav.map((item) => (
                <a key={item.href} className="px-1 py-2 text-sm font-bold text-villa-text-secondary transition hover:text-villa-text-primary" href={item.href}>
                  {t({ en: item.en, zh: item.zh })}
                </a>
              ))}

          {loggedIn ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full bg-villa-primary text-sm font-black text-white shadow-sm transition hover:-translate-y-px"
                onClick={(event) => {
                  event.stopPropagation();
                  setAccountOpen((value) => !value);
                }}
                aria-label="Account menu"
                aria-expanded={accountOpen}
              >
                PV
              </button>
              {accountOpen ? (
                <div className="absolute right-0 top-12 w-44 rounded-[16px] border border-villa-primary-light bg-white p-2 shadow-lg">
                  <a className="block rounded-[12px] px-3 py-2 text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" href="/auth">
                    {t({ en: "My Account", zh: "我的账号" })}
                  </a>
                  <button type="button" className="block w-full rounded-[12px] px-3 py-2 text-left text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" onClick={logout}>
                    {t({ en: "Logout", zh: "退出登录" })}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <a className={loginButtonClass} href="/auth?mode=login">
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={registerButtonClass} href="/auth?mode=register">
                {t({ en: "Register", zh: "注册" })}
              </a>
              <a className="villa-button-dark min-h-[44px] px-6 py-2.5" href="/booking">
                {t({ en: "Book Now", zh: "立即预约" })}
              </a>
            </>
          )}
          <LanguageToggle />
        </nav>
      </div>

      {open ? (
        <nav className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-[20px] border border-villa-primary-light bg-white p-3 shadow-md lg:hidden">
          {(loggedIn ? privateNav : publicNav).map((item) => (
            <a key={item.href} className="rounded-[14px] px-3 py-3 text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" href={item.href}>
              {t({ en: item.en, zh: item.zh })}
            </a>
          ))}
          {loggedIn ? (
            <div className="grid gap-2">
              <a className="rounded-[14px] px-3 py-3 text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" href="/auth">
                {t({ en: "My Account", zh: "我的账号" })}
              </a>
              <button type="button" className="rounded-[14px] px-3 py-3 text-left text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" onClick={logout}>
                {t({ en: "Logout", zh: "退出登录" })}
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <a className={loginButtonClass} href="/auth?mode=login">
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={registerButtonClass} href="/auth?mode=register">
                {t({ en: "Register", zh: "注册" })}
              </a>
              <a className="villa-button-dark min-h-[44px]" href="/booking">
                {t({ en: "Book Now", zh: "立即预约" })}
              </a>
            </div>
          )}
          <LanguageToggle />
        </nav>
      ) : null}
    </header>
  );
}
