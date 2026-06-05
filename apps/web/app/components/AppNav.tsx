"use client";

import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageProvider";
import { signOutAuth, syncSupabaseSessionToLocalStorage } from "../lib/authSession";
import { avatarToImageSrc, readProfileAvatar } from "../lib/profileAvatar";

function hasSession() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("pet-villa-session"));
}

function getSessionName() {
  if (typeof window === "undefined") return "";
  try {
    const session = JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}");
    const name = session?.user?.name || "";
    return name;
  } catch {
    return "";
  }
}

function getSessionUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user || null;
  } catch {
    return null;
  }
}

function getSessionAvatar() {
  const user = getSessionUser();
  if (!user?.id) return avatarToImageSrc();
  return avatarToImageSrc(readProfileAvatar(user.id, user.profileAvatar));
}

function getLocationState() {
  if (typeof window === "undefined") return { pathname: "", tab: "login" };
  const params = new URLSearchParams(window.location.search);
  return {
    pathname: window.location.pathname,
    tab: params.get("tab") || params.get("mode") || "login"
  };
}

const privateNav = [
  { href: "/pets", en: "My Pets", zh: "我的宠物" },
  { href: "/booking", en: "Bookings", zh: "预约" },
  { href: "/orders", en: "Orders", zh: "订单" },
  { href: "/payment", en: "Payment", zh: "付款" },
  { href: "/diary", en: "Pet Diary", zh: "宠物日记" },
  { href: "/chat", en: "Chat", zh: "聊天" },
  { href: "/vouchers", en: "My Vouchers", zh: "优惠券" }
];

const privateMenu = [
  { href: "/", icon: "home", en: "Home", zh: "首页", descEn: "Back to Pet Villa", descZh: "返回首页" },
  { href: "/pets", icon: "pets", en: "My Pets", zh: "我的宠物", descEn: "Manage your dogs", descZh: "管理狗狗资料" },
  { href: "/booking", icon: "booking", en: "Bookings", zh: "预约", descEn: "Upcoming stays", descZh: "查看即将入住" },
  { href: "/orders", icon: "orders", en: "Orders", zh: "订单", descEn: "Payment history", descZh: "付款与订单记录" },
  { href: "/payment", icon: "payment", en: "Payment", zh: "付款", descEn: "Continue payment", descZh: "继续付款" },
  { href: "/diary", icon: "diary", en: "Pet Diary", zh: "宠物日记", descEn: "Daily updates & photos", descZh: "照片和每日更新" },
  { href: "/chat", icon: "chat", en: "Chat", zh: "聊天", descEn: "Message Pet Villa", descZh: "联系 Pet Villa" },
  { href: "/vouchers", icon: "vouchers", en: "My Vouchers", zh: "优惠券", descEn: "Available rewards", descZh: "查看可用优惠" },
  { href: "/account", icon: "account", en: "My Account", zh: "我的账号", descEn: "Profile & settings", descZh: "个人资料设置" }
];

const loginButtonClass =
  "min-h-[44px] px-5 py-2 rounded-full border-2 border-villa-primary text-villa-primary text-sm font-black transition hover:bg-villa-primary hover:text-white hover:-translate-y-px";

const registerButtonClass =
  "min-h-[44px] px-5 py-2 rounded-full bg-villa-primary text-white text-sm font-black transition hover:opacity-90 hover:-translate-y-px";

const inactiveAuthButtonClass =
  "min-h-[44px] px-5 py-2 rounded-full border-2 border-villa-primary bg-transparent text-villa-primary text-sm font-black transition hover:bg-villa-primary hover:text-white hover:-translate-y-px";

const activeAuthButtonClass =
  "min-h-[44px] px-5 py-2 rounded-full bg-villa-primary text-white text-sm font-black shadow-md transition hover:-translate-y-px";

function NavLogo() {
  return (
    <a href="/" className="inline-flex min-w-0 items-center">
      <img
        src="/logo.png"
        alt="The Pet Villa"
        className="h-14 w-[84px] rounded-[10px] object-contain sm:w-[112px]"
        onError={(e: any) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <span className="sr-only">The Pet Villa</span>
    </a>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  if (open) {
    return (
      <span className="relative h-6 w-6">
        <span className="absolute left-1 top-1/2 h-0.5 w-5 -translate-y-1/2 rotate-45 rounded-full bg-villa-text-primary" />
        <span className="absolute left-1 top-1/2 h-0.5 w-5 -translate-y-1/2 -rotate-45 rounded-full bg-villa-text-primary" />
      </span>
    );
  }

  return <span className="h-0.5 w-6 rounded-full bg-villa-text-primary shadow-[0_7px_0_#3d1f0d,0_-7px_0_#3d1f0d]" />;
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 28 28" className="h-6 w-6" aria-hidden="true">
      <path d="M12 5H6v18h6M12 14h10M18 10l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuItemIcon({ name }: { name: string }) {
  const stroke = "#3d1f0d";
  const coral = "#e8927c";
  if (name === "home") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path d="M8 24 24 10l16 14v16H13V24Z" fill="#fff8f5" stroke={coral} strokeWidth="3" strokeLinejoin="round" />
        <path d="M20 40V28h8v12" fill="#f5c4b3" stroke={stroke} strokeWidth="2.5" />
      </svg>
    );
  }
  if (name === "pets") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <ellipse cx="24" cy="31" rx="9" ry="7" fill={coral} />
        <ellipse cx="13" cy="21" rx="4" ry="5.5" fill={coral} />
        <ellipse cx="20" cy="14" rx="4" ry="5.5" fill={coral} />
        <ellipse cx="28" cy="14" rx="4" ry="5.5" fill={coral} />
        <ellipse cx="35" cy="21" rx="4" ry="5.5" fill={coral} />
      </svg>
    );
  }
  if (name === "booking") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <rect x="10" y="12" width="28" height="28" rx="6" fill="#fff8f5" stroke={coral} strokeWidth="3" />
        <path d="M10 21h28M17 8v9M31 8v9" stroke={coral} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M18 28h4M27 28h4M18 34h4M27 34h4" stroke="#7a9e7e" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "orders") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path d="m24 6 16 9v18l-16 9-16-9V15L24 6Z" fill="#f2a46d" />
        <path d="m16 19 8 5 8-5M24 24v12" fill="none" stroke="#fff8f5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "payment") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <rect x="7" y="13" width="34" height="24" rx="6" fill="#fff8f5" stroke={coral} strokeWidth="3" />
        <path d="M7 21h34" stroke={stroke} strokeWidth="3" />
        <path d="M14 30h10" stroke="#7a9e7e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "diary") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path d="M11 18h7l3-5h7l3 5h6a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5Z" fill="#fff8f5" stroke={stroke} strokeWidth="3" />
        <circle cx="24" cy="30" r="8" fill="#f5c4b3" stroke={coral} strokeWidth="3" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path d="M9 12h30a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H22l-9 6v-6H9a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z" fill="#fff8f5" stroke={coral} strokeWidth="3" strokeLinejoin="round" />
        <path d="M14 22h20M14 29h13" stroke="#3d1f0d" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "account") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <circle cx="24" cy="16" r="8" fill={coral} />
        <path d="M9 41c3-12 27-12 30 0" fill={coral} />
      </svg>
    );
  }
  if (name === "vouchers") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path d="M9 17a5 5 0 0 1 5-5h20a5 5 0 0 1 5 5v3a5 5 0 0 0 0 8v3a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5v-3a5 5 0 0 0 0-8v-3Z" fill="#f5c4b3" stroke={coral} strokeWidth="3" />
        <path d="M20 17v18M27 20h6M27 28h6" stroke="#3d1f0d" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <circle cx="24" cy="24" r="16" fill="#fff8f5" stroke={stroke} strokeWidth="3" />
    </svg>
  );
}

export function AppNav({ host = false }: { host?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState(avatarToImageSrc());
  const [locationState, setLocationState] = useState(() => getLocationState());
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoggedIn(hasSession());
    setUserName(getSessionName());
    setUserAvatar(getSessionAvatar());
    setLocationState(getLocationState());

    function sync() {
      setLoggedIn(hasSession());
      setUserName(getSessionName());
      setUserAvatar(getSessionAvatar());
      setLocationState(getLocationState());
    }
    function closeAccount(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    window.addEventListener("storage", sync);
    window.addEventListener("popstate", sync);
    window.addEventListener("pet-villa-auth", sync);
    window.addEventListener("pet-villa-route", sync);
    document.addEventListener("click", closeAccount);
    void syncSupabaseSessionToLocalStorage().then(sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("pet-villa-auth", sync);
      window.removeEventListener("pet-villa-route", sync);
      document.removeEventListener("click", closeAccount);
    };
  }, []);

  async function logout() {
    await signOutAuth();
    setLoggedIn(false);
    setAccountOpen(false);
    window.location.href = "/";
  }

  const isAuthPage = locationState.pathname === "/auth" || locationState.pathname.startsWith("/auth/");
  const isLoginActive = isAuthPage && locationState.tab !== "register";
  const isRegisterActive = isAuthPage && locationState.tab === "register";
  const desktopLoginClass = isLoginActive ? activeAuthButtonClass : loginButtonClass;
  const desktopRegisterClass = isAuthPage
    ? isRegisterActive ? activeAuthButtonClass : inactiveAuthButtonClass
    : registerButtonClass;
  const mobileLoginClass = isLoginActive
    ? "inline-flex min-h-[38px] items-center justify-center rounded-full bg-villa-primary px-3 text-xs font-black text-white shadow-md"
    : "inline-flex min-h-[38px] items-center justify-center rounded-full border-2 border-villa-primary px-3 text-xs font-black text-villa-primary shadow-sm";
  const mobileRegisterClass = isRegisterActive
    ? "inline-flex min-h-[38px] items-center justify-center rounded-full bg-villa-primary px-3 text-xs font-black text-white shadow-md"
    : isAuthPage
      ? "inline-flex min-h-[38px] items-center justify-center rounded-full border-2 border-villa-primary px-3 text-xs font-black text-villa-primary shadow-sm"
      : "inline-flex min-h-[38px] items-center justify-center rounded-full bg-villa-primary px-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(232,146,124,0.18)]";

  function selectAuthTab(event: ReactMouseEvent<HTMLAnchorElement>, tab: "login" | "register") {
    if (!isAuthPage) return;
    event.preventDefault();
    window.history.replaceState(null, "", `/auth?tab=${tab}`);
    setLocationState(getLocationState());
    setOpen(false);
    window.dispatchEvent(new Event("pet-villa-route"));
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
    <header className="sticky top-0 z-40 rounded-b-[22px] border-b border-villa-primary-light bg-villa-background/96 px-4 py-3 shadow-[0_8px_26px_rgba(61,31,13,0.06)] backdrop-blur-xl lg:rounded-none lg:px-4 lg:py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <NavLogo />
        <div className="flex items-center gap-2 lg:hidden">
          {loggedIn ? (
            <div className="mr-1 flex min-w-0 items-center justify-end gap-1 text-right">
              <span className="whitespace-nowrap text-[15px] font-black leading-none text-villa-text-primary">
                Welcome{userName ? `, ${userName}` : ""}
              </span>
              <span className="text-lg leading-none text-villa-primary" aria-hidden="true">🐾</span>
            </div>
          ) : (
            <>
              <a className={`${mobileLoginClass} min-w-[68px]`} href="/auth?tab=login" onClick={(event) => selectAuthTab(event, "login")}>
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={`${mobileRegisterClass} min-w-[82px]`} href="/auth?tab=register" onClick={(event) => selectAuthTab(event, "register")}>
                {t({ en: "Register", zh: "注册" })}
              </a>
            </>
          )}
          {false ? (
            <>
              <a className={mobileLoginClass} href="/auth?tab=login" onClick={(event) => selectAuthTab(event, "login")}>
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={mobileRegisterClass} href="/auth?tab=register" onClick={(event) => selectAuthTab(event, "register")}>
                {t({ en: "Register", zh: "注册" })}
              </a>
            </>
          ) : null}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-villa-primary-light bg-white text-sm font-black shadow-[0_8px_22px_rgba(61,31,13,0.10)] transition hover:-translate-y-px"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <MenuGlyph open={open} />
          </button>
        </div>

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
                  <a className="block rounded-[12px] px-3 py-2 text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" href="/account">
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
              <a className={desktopLoginClass} href="/auth?tab=login" onClick={(event) => selectAuthTab(event, "login")}>
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={desktopRegisterClass} href="/auth?tab=register" onClick={(event) => selectAuthTab(event, "register")}>
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
        loggedIn ? (
          <nav className="mx-auto mt-3 max-h-[calc(100svh-112px)] max-w-[390px] overflow-y-auto overscroll-contain rounded-[22px] border border-villa-primary-light bg-white/96 p-3 pb-24 shadow-[0_14px_34px_rgba(61,31,13,0.12)] backdrop-blur [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            <div className="mb-2 flex items-center gap-3 px-1">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-villa-primary-bg shadow-[0_8px_22px_rgba(61,31,13,0.10)]">
                <img src={userAvatar} alt="" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="m-0 text-xs font-bold text-villa-text-muted">{t({ en: "Welcome back", zh: "欢迎回来" })}</p>
                <h2 className="m-0 font-title text-lg font-black leading-tight text-villa-text-primary">{userName || "Pet Villa"}</h2>
              </div>
            </div>

            <div className="grid gap-1.5">
              {privateMenu.map((item) => (
                <a key={item.href} className="flex items-center gap-2.5 rounded-[15px] border border-villa-primary-light/70 bg-villa-primary-bg/45 px-2.5 py-2 shadow-[0_6px_18px_rgba(61,31,13,0.04)]" href={item.href}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] bg-white">
                    <MenuItemIcon name={item.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[13px] font-black leading-tight text-villa-text-primary">{t({ en: item.en, zh: item.zh })}</strong>
                    <span className="block text-[10px] font-bold leading-tight text-villa-text-muted">{t({ en: item.descEn, zh: item.descZh })}</span>
                  </span>
                  <span className="text-villa-text-muted"><ChevronIcon /></span>
                </a>
              ))}
            </div>

            <div className="mt-1.5 rounded-[15px] border border-villa-primary-light/70 bg-villa-primary-bg/45 p-2">
              <div className="mb-2 flex items-center gap-3 px-1">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-villa-text-primary">
                  <svg viewBox="0 0 32 32" className="h-4 w-4" aria-hidden="true">
                    <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M4 16h24M16 4c4 4 6 8 6 12s-2 8-6 12M16 4c-4 4-6 8-6 12s2 8 6 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </span>
                <strong className="text-[13px] font-black text-villa-text-primary">{t({ en: "Language", zh: "语言" })}</strong>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-full bg-white/80 p-1">
                <button type="button" className={`min-h-[28px] rounded-full text-[11px] font-black ${lang === "en" ? "bg-villa-primary text-white shadow-md" : "text-villa-text-secondary"}`} onClick={() => setLang("en")}>EN</button>
                <button type="button" className={`min-h-[28px] rounded-full text-[11px] font-black ${lang === "zh" ? "bg-villa-primary text-white shadow-md" : "text-villa-text-secondary"}`} onClick={() => setLang("zh")}>中文</button>
              </div>
            </div>

            <button type="button" className="mt-1.5 flex min-h-[38px] w-full items-center gap-2.5 rounded-[15px] border border-villa-primary-light bg-white px-3 text-left text-[13px] font-black text-villa-primary shadow-[0_6px_18px_rgba(61,31,13,0.05)]" onClick={logout}>
              <LogoutIcon />
              {t({ en: "Logout", zh: "退出登录" })}
            </button>
          </nav>
        ) : (
          <nav className="mx-auto mt-3 max-w-[390px] rounded-[22px] border border-villa-primary-light bg-white/96 p-4 shadow-[0_14px_34px_rgba(61,31,13,0.12)] backdrop-blur lg:hidden">
            <a className="villa-button min-h-[52px] w-full justify-between px-5 text-base" href="/booking">
              <span className="inline-flex items-center gap-3">
                <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
                  <rect x="10" y="12" width="28" height="28" rx="6" fill="#fff8f5" stroke="currentColor" strokeWidth="3" />
                  <path d="M10 21h28M17 8v9M31 8v9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                </svg>
                {t({ en: "Book Now", zh: "立即预约" })}
              </span>
              <ChevronIcon />
            </a>
            <div className="my-3 h-px bg-villa-primary-light" />
            <div className="grid gap-2">
              <button type="button" className="flex min-h-[46px] items-center gap-3 rounded-[16px] px-3 text-left" onClick={() => setLang("en")}>
                <span className={`grid h-10 w-10 place-items-center rounded-full text-xs font-black ${lang === "en" ? "bg-villa-primary text-white shadow-md" : "bg-villa-primary-bg text-villa-text-secondary"}`}>EN</span>
                <strong className="flex-1 text-sm font-black text-villa-text-primary">English</strong>
                {lang === "en" ? <span className="text-villa-primary"><svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span> : null}
              </button>
              <button type="button" className="flex min-h-[46px] items-center gap-3 rounded-[16px] px-3 text-left" onClick={() => setLang("zh")}>
                <span className={`grid h-10 w-10 place-items-center rounded-full text-base font-black ${lang === "zh" ? "bg-villa-primary text-white shadow-md" : "bg-villa-primary-bg text-villa-text-secondary"}`}>中</span>
                <strong className="flex-1 text-sm font-black text-villa-text-primary">中文</strong>
                {lang === "zh" ? <span className="text-villa-primary"><svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span> : null}
              </button>
            </div>
          </nav>
        )
      ) : null}

      {false ? (
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
              <a className="rounded-[14px] px-3 py-3 text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" href="/account">
                {t({ en: "My Account", zh: "我的账号" })}
              </a>
              <button type="button" className="rounded-[14px] px-3 py-3 text-left text-sm font-bold text-villa-text-secondary hover:bg-villa-primary-bg" onClick={logout}>
                {t({ en: "Logout", zh: "退出登录" })}
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <a className={`${isLoginActive ? activeAuthButtonClass : loginButtonClass} flex items-center justify-center`} href="/auth?tab=login" onClick={(event) => selectAuthTab(event, "login")}>
                {t({ en: "Login", zh: "登录" })}
              </a>
              <a className={`${isRegisterActive ? activeAuthButtonClass : registerButtonClass} flex items-center justify-center`} href="/auth?tab=register" onClick={(event) => selectAuthTab(event, "register")}>
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

