"use client";

import { useState } from "react";
import { AppNav } from "../components/AppNav";
import { DogIllustration } from "../components/DogIllustration";
import { useLanguage } from "../components/LanguageProvider";

export default function AuthPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="villa-shell">
      <AppNav />
      <main className="villa-section">
        <div className="villa-container grid overflow-hidden rounded-[34px] border border-villa-line bg-white/60 shadow-villa lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-[#f5e6dc] p-7 sm:p-10">
            <DogIllustration label={t({ en: "Safe home care", zh: "安心家庭照护" })} />
            <div className="mt-6 grid gap-3">
              {[
                { icon: "🐾", en: "No cages, ever", zh: "绝不关笼" },
                { icon: "📸", en: "Daily photo updates", zh: "每日照片更新" },
                { icon: "❄️", en: "24h air-conditioned", zh: "24小时冷气" }
              ].map((item) => (
                <div key={item.en} className="flex items-center gap-3 rounded-[20px] bg-white/65 p-4 font-black">
                  <span className="text-2xl">{item.icon}</span>
                  <span>{t(item)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-villa-cream p-7 sm:p-10">
            <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">
              {t({ en: "Pet Owner Access", zh: "宠主登录" })}
            </span>
            <h1 className="mt-5 font-title text-5xl font-black">
              {mode === "login" ? t({ en: "Welcome back", zh: "欢迎回来" }) : t({ en: "Create your account", zh: "创建账号" })}
            </h1>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "villa-button" : "villa-button-outline"}>
                {t({ en: "Login", zh: "登录" })}
              </button>
              <button type="button" onClick={() => setMode("register")} className={mode === "register" ? "villa-button" : "villa-button-outline"}>
                {t({ en: "Register", zh: "注册" })}
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Google", "Facebook", "Apple"].map((provider) => (
                <button key={provider} type="button" className="min-h-[50px] rounded-pill border border-villa-line bg-white px-4 text-sm font-black">
                  {provider}
                </button>
              ))}
            </div>

            <div className="my-7 flex items-center gap-4 text-sm font-black text-villa-text/50">
              <span className="h-px flex-1 bg-villa-line" />
              <span>{t({ en: "or sign in with email", zh: "或使用邮箱登录" })}</span>
              <span className="h-px flex-1 bg-villa-line" />
            </div>

            <form className="grid gap-4">
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
              <button type="button" className="villa-button mt-2">
                {mode === "login" ? t({ en: "Login", zh: "登录" }) : t({ en: "Create Pet Owner Account", zh: "创建宠主账号" })}
              </button>
            </form>

            <p className="mt-6 text-sm font-bold text-villa-text/55">
              {t({ en: "By continuing, you agree to our", zh: "继续即代表你同意我们的" })}{" "}
              <a className="font-black text-villa-text underline" href="#">Terms</a>{" "}
              &{" "}
              <a className="font-black text-villa-text underline" href="#">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
