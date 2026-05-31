"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";

type AuthMode = "login" | "register";
type FieldIconType = "mail" | "lock" | "user" | "phone" | "eye";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="m14.5 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartMark() {
  return (
    <svg viewBox="0 0 42 42" className="inline-block h-8 w-8 align-middle" aria-hidden="true">
      <path d="M21 34S7 25 7 15.5C7 9.8 14.2 8 21 17c6.8-9 14-7.2 14-1.5C35 25 21 34 21 34Z" fill="none" stroke="#e8927c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FieldIcon({ type }: { type: FieldIconType }) {
  const common = { fill: "none", stroke: "#e8927c", strokeWidth: "2.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" {...common} />
        <path d="m4.5 7 7.5 6 7.5-6" {...common} />
      </svg>
    );
  }

  if (type === "phone") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M7 4.5 9.8 4l2 5-2 1.2c1 2.2 2.8 4 5 5l1.2-2 5 2-.5 2.8c-.2 1.1-1.1 1.9-2.3 1.9C10.2 19.9 4.1 13.8 4.1 5.8c0-1.2.8-2.1 1.9-2.3Z" fill="#e8927c" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="#e8927c" />
        <path d="M5 21c.8-4.2 4-6.5 7-6.5s6.2 2.3 7 6.5" fill="#e8927c" />
      </svg>
    );
  }

  if (type === "eye") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-villa-text-muted" aria-hidden="true">
        <path d="M3 12s3.4-5.5 9-5.5S21 12 21 12s-3.4 5.5-9 5.5S3 12 3 12Z" {...common} stroke="#bfaa9f" />
        <circle cx="12" cy="12" r="2.3" fill="#bfaa9f" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="6" y="10" width="12" height="10" rx="2" fill="#e8927c" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" {...common} />
      <circle cx="12" cy="15" r="1.4" fill="#fff8f5" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22 12.2c0-.8-.1-1.5-.2-2.2H12v4.1h5.6a4.8 4.8 0 0 1-2.1 3.2v2.7h3.4c2-1.8 3.1-4.5 3.1-7.8Z" fill="#4285F4" />
      <path d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.7c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.8A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.2 13.5a6 6 0 0 1 0-3.1V7.6H2.7a10 10 0 0 0 0 8.8l3.5-2.9Z" fill="#FBBC05" />
      <path d="M12 6.1c1.5 0 2.9.5 4 1.6l3-3A10 10 0 0 0 2.7 7.6l3.5 2.8C7 7.9 9.3 6.1 12 6.1Z" fill="#EA4335" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M16.2 12.5c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.9-1.1-2.9-3.7ZM14.1 6.2c.6-.8 1.1-1.8 1-2.9-1 .1-2 .7-2.7 1.5-.6.7-1.1 1.8-1 2.8 1 .1 2-.5 2.7-1.4Z" fill="currentColor" />
    </svg>
  );
}

function DogCardArt({ duo = false }: { duo?: boolean }) {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden="true">
      <path d="M22 86c8-18 30-25 50-17 7 3 12 8 16 14 7-12 20-19 36-15 14 4 22 15 24 28H18c1-4 2-7 4-10Z" fill="#fff8f5" />
      <path d="M38 91c-9-23 3-44 25-47 22 3 34 24 25 47H38Z" fill="#f2b27f" stroke="#7a4a24" strokeWidth="2" />
      <circle cx="63" cy="66" r="25" fill="#f4c18d" />
      <path d="M39 61c-6 2-10 9-9 17 1 8 8 13 14 11M87 61c6 2 10 9 9 17-1 8-8 13-14 11" fill="#d99864" />
      <circle cx="53" cy="66" r="3" fill="#3d1f0d" />
      <circle cx="73" cy="66" r="3" fill="#3d1f0d" />
      <path d="M58 76c4 4 9 4 13 0" fill="none" stroke="#3d1f0d" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="63" cy="72" rx="5" ry="4" fill="#3d1f0d" />
      {duo ? (
        <>
          <path d="M96 92c-8-20 2-38 20-41 18 3 28 21 20 41H96Z" fill="#fff" stroke="#7a4a24" strokeWidth="2" />
          <path d="M101 55c2-14 10-20 17-10M133 55c-2-14-10-20-17-10" fill="#f6d5cb" stroke="#7a4a24" strokeWidth="2" strokeLinecap="round" />
          <circle cx="110" cy="69" r="3" fill="#3d1f0d" />
          <circle cx="125" cy="69" r="3" fill="#3d1f0d" />
          <ellipse cx="118" cy="78" rx="6" ry="4" fill="#3d1f0d" />
          <path d="M112 84c4 4 8 4 12 0" fill="none" stroke="#3d1f0d" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      <path d="M13 83c8-1 14-6 18-14M141 85c-7-2-12-7-14-15" fill="none" stroke="#7a9e7e" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 48c3-5 9-2 7 3-1 3-7 7-7 7s-6-4-7-7c-2-5 4-8 7-3ZM112 27c3-5 9-2 7 3-1 3-7 7-7 7s-6-4-7-7c-2-5 4-8 7-3Z" fill="#e8927c" opacity="0.9" />
    </svg>
  );
}

function AuthInput({
  icon,
  label,
  placeholder,
  type = "text",
  trailingIcon
}: {
  icon: FieldIconType;
  label: string;
  placeholder: string;
  type?: string;
  trailingIcon?: FieldIconType;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-villa-text-primary">{label}</span>
      <span className="flex h-14 items-center gap-3 rounded-[14px] border border-villa-primary-light bg-white/80 px-4 shadow-[0_8px_24px_rgba(61,31,13,0.04)] transition focus-within:border-villa-primary focus-within:shadow-[0_0_0_3px_rgba(232,146,124,0.15)]">
        <FieldIcon type={icon} />
        <input className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-villa-text-primary outline-none placeholder:text-villa-text-muted" type={type} placeholder={placeholder} />
        {trailingIcon ? <FieldIcon type={trailingIcon} /> : null}
      </span>
    </label>
  );
}

export default function AuthPage() {
  const { t, lang, toggleLang } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [redirect, setRedirect] = useState("/");

  useEffect(() => {
    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const requestedMode = params.get("mode") || params.get("tab");
      const nextRedirect = params.get("redirect");
      setMode(requestedMode === "register" ? "register" : "login");
      if (nextRedirect) setRedirect(nextRedirect);
    }

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("pet-villa-route", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("pet-villa-route", syncFromUrl);
    };
  }, []);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextMode);
    if (redirect && redirect !== "/") params.set("redirect", redirect);
    window.history.replaceState(null, "", `/auth?${params.toString()}`);
    window.dispatchEvent(new Event("pet-villa-route"));
  }

  function submit() {
    window.localStorage.setItem("pet-villa-session", JSON.stringify({
      user: { id: "demo-owner", role: "owner", name: "Pet Owner", email: "owner@example.com" }
    }));
    window.dispatchEvent(new Event("pet-villa-auth"));
    window.location.href = redirect || "/";
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/";
  }

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen bg-villa-background bg-[image:var(--paw-pattern)] bg-[length:120px_120px] bg-repeat px-5 py-4 text-villa-text-primary sm:py-8">
      <main className="mx-auto min-h-[calc(100vh-32px)] max-w-[540px] overflow-hidden rounded-[30px] bg-white/55 shadow-[0_24px_70px_rgba(61,31,13,0.12)] backdrop-blur xl:max-w-[1120px]">
        <div className="relative mx-auto min-h-[calc(100vh-32px)] max-w-[520px] px-7 py-7 sm:px-10 xl:max-w-none xl:px-14">
          <div className="pointer-events-none absolute left-[10%] top-28 h-16 w-16 rounded-full bg-villa-primary-light/10" />
          <div className="pointer-events-none absolute right-[10%] top-36 h-20 w-20 rounded-full bg-villa-primary-light/10" />
          <div className="pointer-events-none absolute right-[-22px] top-64 h-24 w-24 rounded-full bg-villa-primary-light/10" />

          <header className="relative z-10 flex items-start justify-between">
            <a href="/" aria-label="The Pet Villa home">
              <img src="/logo.png" alt="The Pet Villa" className="h-[118px] w-[150px] object-contain" />
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="grid h-11 min-w-11 place-items-center rounded-full border border-villa-primary-light bg-white/85 px-3 text-xs font-black text-villa-primary shadow-md"
                aria-label="Switch language"
              >
                {lang === "en" ? "中文" : "EN"}
              </button>
              <button
                type="button"
                onClick={goBack}
                className="grid h-12 w-12 place-items-center rounded-full bg-white text-villa-text-primary shadow-[0_8px_24px_rgba(61,31,13,0.12)]"
                aria-label="Go back"
              >
                <BackIcon />
              </button>
            </div>
          </header>

          <section className="relative z-10 mt-12 xl:grid xl:grid-cols-[1fr_0.92fr] xl:gap-12">
            <div>
              <h1 className="font-title text-[30px] font-black leading-tight text-villa-text-primary sm:text-[34px]">
                {isLogin ? t({ en: "Welcome Back", zh: "欢迎回来" }) : t({ en: "Create Account", zh: "创建账号" })}{" "}
                <HeartMark />
              </h1>
              <p className="mt-3 max-w-[390px] text-[17px] font-semibold leading-relaxed text-villa-text-secondary">
                {isLogin
                  ? t({ en: "Login to manage your bookings and your furry friend's stay", zh: "登录管理你的预约和狗狗入住记录" })
                  : t({ en: "Join Pet Villa and give your dog a home away from home", zh: "加入 Pet Villa，给狗狗一个家一样的寄宿体验" })}
              </p>

              <form className="mt-10 grid gap-5" onSubmit={(event) => { event.preventDefault(); submit(); }}>
                {isLogin ? (
                  <>
                    <AuthInput
                      icon="mail"
                      label={t({ en: "Email or Phone Number", zh: "邮箱或电话号码" })}
                      placeholder={t({ en: "Enter your email address or phone number", zh: "输入邮箱或电话号码" })}
                    />
                    <AuthInput
                      icon="lock"
                      label={t({ en: "Password", zh: "密码" })}
                      placeholder={t({ en: "Enter your password", zh: "输入密码" })}
                      type="password"
                      trailingIcon="eye"
                    />
                    <button type="button" className="justify-self-end text-sm font-bold text-villa-primary">
                      {t({ en: "Forgot password?", zh: "忘记密码？" })}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <AuthInput icon="user" label={t({ en: "Full Name", zh: "姓名" })} placeholder={t({ en: "Enter your name", zh: "输入姓名" })} />
                      <AuthInput icon="phone" label={t({ en: "Phone Number", zh: "电话号码" })} placeholder={t({ en: "Enter your phone", zh: "输入电话" })} type="tel" />
                    </div>
                    <AuthInput icon="mail" label={t({ en: "Email Address", zh: "邮箱" })} placeholder={t({ en: "Enter your email", zh: "输入邮箱" })} type="email" />
                    <AuthInput icon="lock" label={t({ en: "Password", zh: "密码" })} placeholder={t({ en: "Create a password", zh: "创建密码" })} type="password" trailingIcon="eye" />
                    <AuthInput icon="lock" label={t({ en: "Confirm Password", zh: "确认密码" })} placeholder={t({ en: "Confirm your password", zh: "确认密码" })} type="password" trailingIcon="eye" />
                    <label className="flex items-center gap-3 text-sm font-semibold text-villa-text-secondary">
                      <input type="checkbox" defaultChecked className="h-5 w-5 accent-villa-primary" />
                      <span>
                        {t({ en: "I agree to the", zh: "我同意" })}{" "}
                        <a href="#" className="font-bold text-villa-primary">{t({ en: "Terms of Service", zh: "服务条款" })}</a>{" "}
                        {t({ en: "and", zh: "和" })}{" "}
                        <a href="#" className="font-bold text-villa-primary">{t({ en: "Privacy Policy", zh: "隐私政策" })}</a>
                      </span>
                    </label>
                  </>
                )}

                <button type="submit" className="mt-2 h-16 rounded-pill bg-villa-primary text-lg font-black text-white shadow-[0_12px_28px_rgba(232,146,124,0.28)] transition hover:-translate-y-px">
                  {isLogin ? t({ en: "Login", zh: "登录" }) : t({ en: "Create Account", zh: "创建账号" })}
                </button>
              </form>

              <div className="my-9 flex items-center gap-5">
                <span className="h-px flex-1 bg-villa-primary-light/70" />
                <span className="text-sm font-semibold text-villa-text-secondary">{t({ en: "or continue with", zh: "或继续使用" })}</span>
                <span className="h-px flex-1 bg-villa-primary-light/70" />
              </div>

              <div className="grid gap-3">
                <button type="button" className="flex h-14 items-center justify-center gap-4 rounded-pill border border-villa-primary-light bg-white text-sm font-black text-villa-text-primary shadow-[0_8px_24px_rgba(61,31,13,0.08)] transition hover:-translate-y-px">
                  <GoogleMark />
                  {t({ en: "Continue with Google", zh: "使用 Google 继续" })}
                </button>
                <button type="button" className="flex h-14 items-center justify-center gap-4 rounded-pill border border-villa-primary-light bg-white text-sm font-black text-villa-text-primary shadow-[0_8px_24px_rgba(61,31,13,0.08)] transition hover:-translate-y-px">
                  <AppleMark />
                  {t({ en: "Continue with Apple", zh: "使用 Apple 继续" })}
                </button>
              </div>
            </div>

            <aside className="relative z-10 mt-9 rounded-[22px] border border-villa-primary-light bg-white/82 p-5 shadow-[0_12px_34px_rgba(61,31,13,0.09)] xl:mt-0 xl:self-end">
              <div className="grid grid-cols-[116px_1fr] items-center gap-4">
                <DogCardArt duo={!isLogin} />
                <div>
                  <h2 className="font-title text-[20px] font-black leading-tight text-villa-text-primary">
                    {isLogin ? t({ en: "New to Pet Villa?", zh: "第一次来 Pet Villa？" }) : t({ en: "Already have an account?", zh: "已经有账号？" })}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-villa-text-secondary">
                    {isLogin ? t({ en: "Create an account to get started", zh: "创建账号开始预约" }) : t({ en: "Login to continue", zh: "登录继续预约" })}
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode(isLogin ? "register" : "login")}
                    className="mt-4 rounded-pill border-2 border-villa-primary px-6 py-3 text-sm font-black text-villa-primary transition hover:-translate-y-px hover:bg-villa-primary-bg"
                  >
                    {isLogin ? t({ en: "Register Now", zh: "立即注册" }) : t({ en: "Login Now", zh: "立即登录" })}
                  </button>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
