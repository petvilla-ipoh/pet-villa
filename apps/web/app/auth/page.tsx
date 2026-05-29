"use client";

import { useEffect, useState } from "react";
import { AppNav } from "../components/AppNav";
import { DogIllustration } from "../components/DogIllustration";
import { useLanguage } from "../components/LanguageProvider";

export default function AuthPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [redirect, setRedirect] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const nextRedirect = params.get("redirect");
    if (requestedMode === "register") setMode("register");
    if (nextRedirect) setRedirect(nextRedirect);
  }, []);

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
      <main className="px-4 py-10">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[24px] border border-villa-primary-light bg-white shadow-md lg:grid-cols-[0.95fr_1.05fr]">
          <section className="relative bg-[#f5e6dc] p-4 lg:p-8">
            <span className="paw-mark right-3 top-3" />
            <DogIllustration label={t({ en: "Safe home care", zh: "安心家庭照护" })} />
            <div className="mt-4 grid gap-3">
              {[
                { dot: "bg-[#4285F4]", en: "No cages, ever", zh: "绝不关笼" },
                { dot: "bg-[#1877F2]", en: "Daily photo updates", zh: "每日照片更新" },
                { dot: "bg-black", en: "24h air-conditioned", zh: "24小时冷气" }
              ].map((item) => (
                <div key={item.en} className="flex items-center gap-3 rounded-[16px] bg-white/75 p-3 text-sm font-bold">
                  <span className={`h-3 w-3 rounded-full ${item.dot}`} />
                  <span>{t({ en: item.en, zh: item.zh })}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 lg:p-8">
            <h1 className="page-title">{mode === "login" ? t({ en: "Welcome back", zh: "欢迎回来" }) : t({ en: "Create account", zh: "创建账号" })}</h1>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "villa-button" : "villa-button-outline"}>
                {t({ en: "Login", zh: "登录" })}
              </button>
              <button type="button" onClick={() => setMode("register")} className={mode === "register" ? "villa-button" : "villa-button-outline"}>
                {t({ en: "Register", zh: "注册" })}
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Google", "bg-[#4285F4]"],
                ["Facebook", "bg-[#1877F2]"],
                ["Apple", "bg-black"]
              ].map(([provider, color]) => (
                <button key={provider} type="button" className="flex h-12 items-center justify-center gap-2 rounded-pill border border-villa-primary-light bg-white text-sm font-bold">
                  <span className={`h-3 w-3 rounded-full ${color}`} />
                  {provider}
                </button>
              ))}
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-villa-primary-light" />
              <span className="text-xs font-bold text-villa-text-muted">{t({ en: "or sign in with email", zh: "或使用邮箱登录" })}</span>
              <span className="h-px flex-1 bg-villa-primary-light" />
            </div>

            <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
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
                {mode === "login" ? t({ en: "Login", zh: "登录" }) : t({ en: "Create Pet Owner Account", zh: "创建宠主账号" })}
              </button>
            </form>

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
