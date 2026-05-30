"use client";

import { useEffect, useRef, useState } from "react";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";

function hasSession() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("pet-villa-session"));
}

const privateNav = [
  { href: "/pets", en: "My Pets", zh: "我的宠物" },
  { href: "/booking", en: "Bookings", zh: "预约" },
  { href: "/orders", en: "Orders", zh: "订单" },
  { href: "/diary", en: "Pet Diary", zh: "宠物日记" }
];

const loginButtonClass =
  "min-h-[44px] px-5 py-2 rounded-full border-2 border-villa-primary text-villa-primary text-sm font-black transition hover:bg-villa-primary hover:text-white hover:-translate-y-px";

const registerButtonClass =
  "min-h-[44px] px-5 py-2 rounded-full bg-villa-primary text-white text-sm font-black transition hover:opacity-90 hover:-translate-y-px";

function NavLogo() {
  return (
    <a href="/" className="inline-flex items-center gap-3">
      <img
        src="/logo.png"
        alt="The Pet Villa"
        style={{ height: "48px", width: "auto" }}
        onError={(e: any) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <span className="sr-only">The Pet Villa</span>
    </a>
  );
}

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
            <NavLogo />
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
        <NavLogo />
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-villa-primary-light bg-white text-sm font-black shadow-md lg:hidden"
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
            : null}

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
              <a className={loginButtonClass} href="/auth">
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={registerButtonClass} href="/auth?tab=register">
                {t({ en: "Register", zh: "注册" })}
              </a>
              <a className="villa-button-dark min-h-[44px] px-5" href="/booking">
                {t({ en: "Book Now", zh: "立即预约" })}
              </a>
            </>
          )}
          <LanguageToggle />
        </nav>
      </div>

      {open ? (
        <nav className="mx-auto mt-3 grid max-w-7xl gap-3 rounded-[22px] border border-villa-primary-light bg-white/95 p-4 shadow-lg backdrop-blur lg:hidden">
          {loggedIn
            ? privateNav.map((item) => (
                <a key={item.href} className="rounded-[14px] px-3 py-3 text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" href={item.href}>
                  {t({ en: item.en, zh: item.zh })}
                </a>
              ))
            : null}
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
              <a className={`${loginButtonClass} flex items-center justify-center`} href="/auth">
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={`${registerButtonClass} flex items-center justify-center`} href="/auth?tab=register">
                {t({ en: "Register", zh: "注册" })}
              </a>
              <a className="villa-button-dark min-h-[44px] px-5" href="/booking">
                {t({ en: "Book Now", zh: "立即预约" })}
              </a>
            </div>
          )}
          <div className="rounded-[14px] bg-villa-primary-bg p-2">
            <LanguageToggle />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
