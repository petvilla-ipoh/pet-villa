"use client";

import { useEffect, useState } from "react";
import { AppNav } from "../components/AppNav";
import { DogIllustration } from "../components/DogIllustration";
import { useLanguage } from "../components/LanguageProvider";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [redirect, setRedirect] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode") || params.get("tab");
    const nextRedirect = params.get("redirect");
    if (requestedMode === "register") setMode("register");
    if (nextRedirect) setRedirect(nextRedirect);
  }, []);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextMode);
    if (redirect && redirect !== "/") params.set("redirect", redirect);
    window.history.replaceState(null, "", `/auth?${params.toString()}`);
    window.dispatchEvent(new Event("pet-villa-route"));
  }

  function tabClass(active: boolean) {
    return active
      ? "inline-flex min-h-[48px] items-center justify-center rounded-pill bg-villa-text-primary px-6 py-2.5 text-sm font-black text-white shadow-md transition hover:-translate-y-px"
      : "inline-flex min-h-[48px] items-center justify-center rounded-pill border-2 border-villa-primary bg-white px-6 py-2.5 text-sm font-black text-villa-primary transition hover:-translate-y-px hover:bg-villa-primary-bg";
  }

  function submit() {
    window.localStorage.setItem("pet-villa-session", JSON.stringify({
      user: { id: "demo-owner", role: "owner", name: "Pet Owner", email: "owner@example.com" }
    }));
    window.dispatchEvent(new Event("pet-villa-auth"));
    window.location.href = redirect || "/";
  }

  return (
    <div className="villa-shell paw-bg">
      <AppNav />
      <main className="px-4 py-8 sm:py-10">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[24px] border border-villa-primary-light bg-white shadow-md lg:grid-cols-[0.95fr_1.05fr]">
          <section className="relative bg-[#f5e6dc] p-4 lg:p-8">
            <span className="paw-mark right-3 top-3" />
            <DogIllustration label={t({ en: "Safe home care", zh: "安心家庭照顾" })} />
            <div className="mt-4 grid gap-3">
              {[
                { icon: "🐾", en: "No cages, ever", zh: "绝不关笼" },
                { icon: "📸", en: "Daily photo updates", zh: "每日照片更新" },
                { icon: "❄️", en: "24h air-conditioned", zh: "24小时冷气" }
              ].map((item) => (
                <div key={item.en} className="flex items-center gap-3 rounded-[16px] bg-white/80 p-3 text-sm font-bold shadow-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-villa-primary-bg">{item.icon}</span>
                  <span>{t({ en: item.en, zh: item.zh })}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 lg:p-8">
            <h1 className="page-title">{mode === "login" ? t({ en: "Welcome back", zh: "欢迎回来" }) : t({ en: "Create Pet Owner Account", zh: "创建宠主账号" })}</h1>
            <p className="body-copy mt-2">
              {mode === "login"
                ? t({ en: "Login to manage bookings, pets, messages, and diary updates.", zh: "登录后管理预约、宠物、消息和日记更新。" })
                : t({ en: "Register as a pet owner to book small-dog boarding in Ipoh.", zh: "注册宠主账号，预约怡保小型犬寄宿服务。" })}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => switchMode("login")} className={tabClass(mode === "login")} aria-pressed={mode === "login"}>
                {t({ en: "Login", zh: "登录" })}
              </button>
              <button type="button" onClick={() => switchMode("register")} className={tabClass(mode === "register")} aria-pressed={mode === "register"}>
                {t({ en: "Register", zh: "注册" })}
              </button>
            </div>

            {mode === "login" ? (
              <>
                <div className="mt-5 grid gap-3">
                  <button type="button" className="flex h-12 items-center justify-center gap-3 rounded-pill border border-villa-primary-light bg-white px-4 text-sm font-black text-villa-text-primary shadow-sm transition hover:-translate-y-px">
                    <span className="font-black text-[#4285F4]">G</span>
                    Login with Google
                  </button>
                  <button type="button" className="flex h-12 items-center justify-center gap-3 rounded-pill bg-[#1877F2] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-px">
                    <span className="font-title text-xl font-black">f</span>
                    Login with Facebook
                  </button>
                  <button type="button" className="flex h-12 items-center justify-center gap-3 rounded-pill bg-black px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-px">
                    <span className="text-lg">●</span>
                    Login with Apple
                  </button>
                </div>

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-villa-primary-light" />
                  <span className="text-xs font-bold text-villa-text-muted">{t({ en: "or sign in with email", zh: "或使用邮箱登录" })}</span>
                  <span className="h-px flex-1 bg-villa-primary-light" />
                </div>
              </>
            ) : null}

            <form className="mt-5 grid gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
              {mode === "register" ? (
                <>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Full name", zh: "姓名" })}</span>
                    <input className="villa-input" placeholder="Mei Ling" />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Phone", zh: "电话" })}</span>
                    <input className="villa-input" placeholder="+60 12-345 6789" />
                  </label>
                </>
              ) : null}
              <label className="grid gap-2">
                <span className="villa-label">{mode === "login" ? t({ en: "Email / Phone", zh: "邮箱 / 电话" }) : t({ en: "Email", zh: "邮箱" })}</span>
                <input className="villa-input" type="email" placeholder="owner@example.com" />
              </label>
              <label className="grid gap-2">
                <span className="villa-label">{t({ en: "Password", zh: "密码" })}</span>
                <input className="villa-input" type="password" placeholder="********" />
              </label>
              <button type="submit" className="villa-button mt-2 w-full">
                {mode === "login" ? t({ en: "Login", zh: "登录" }) : t({ en: "Create Account", zh: "创建账号" })}
              </button>
            </form>

            {mode === "register" ? (
              <p className="mt-5 text-center text-sm font-bold text-villa-text-secondary">
                {t({ en: "Already have an account?", zh: "已经有账号？" })}{" "}
                <button type="button" className="font-black text-villa-primary underline" onClick={() => switchMode("login")}>
                  {t({ en: "Login", zh: "登录" })}
                </button>
              </p>
            ) : null}

            <p className="mt-5 text-xs font-semibold leading-relaxed text-villa-text-secondary">
              {t({ en: "By continuing, you agree to our", zh: "继续即代表你同意我们的" })}{" "}
              <a className="font-bold underline" href="#">Terms</a> & <a className="font-bold underline" href="#">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
