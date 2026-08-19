"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";
import { getSupabaseBrowserClient, getSupabaseGoogleOAuthClient } from "../lib/supabase";
import { clearObsoleteCustomerPasswordStorage, syncSupabaseSessionToLocalStorage } from "../lib/authSession";
import { getAuthRedirectUrl } from "../lib/siteUrl";
import { savePendingReferralCode } from "../lib/vouchers";

type AuthMode = "login" | "register";
type FieldIconType = "mail" | "lock" | "user" | "phone" | "eye";
type AuthStage = "form" | "signup-sent" | "forgot";

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email before logging in.";
  if (/already registered|user already exists/i.test(message)) return "An account already exists for this email. Please login or reset your password.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait before trying again.";
  if (/network|fetch|failed to connect/i.test(message)) return "Unable to connect. Please check your connection and try again.";
  return "Authentication could not be completed. Please try again.";
}

function safeCustomerRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/host")) return "/";
  return value;
}

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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.3c1.9-1.8 2.9-4.4 2.9-7.7Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.7c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.8A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.4H3a10 10 0 0 0 0 9.2l3.4-2.8Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3 7.4l3.4 2.8C7.2 7.8 9.4 6.1 12 6.1Z" />
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
  name,
  label,
  placeholder,
  type = "text",
  trailingIcon,
  autoComplete
}: {
  icon: FieldIconType;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  trailingIcon?: FieldIconType;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const inputType = trailingIcon === "eye" && type === "password" ? (visible ? "text" : "password") : type;

  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-villa-text-primary">{label}</span>
      <span className="flex h-14 items-center gap-3 rounded-[24px] border border-white/90 bg-white/90 px-3 shadow-[inset_0_-5px_10px_rgba(183,142,255,0.08),0_10px_22px_rgba(61,31,13,0.08)] transition focus-within:border-[#c6a7ff] focus-within:shadow-[0_0_0_4px_rgba(198,167,255,0.20),0_12px_24px_rgba(61,31,13,0.08)]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] border border-white bg-[linear-gradient(145deg,#fffaf4_0%,#f1e5ff_100%)] text-[#d97867] shadow-[inset_0_-4px_8px_rgba(183,142,255,0.12),0_6px_0_rgba(232,146,124,0.10),0_10px_16px_rgba(61,31,13,0.09)]">
          <FieldIcon type={icon} />
        </span>
        <input name={name} autoComplete={autoComplete} className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-villa-text-primary outline-none placeholder:text-villa-text-muted" type={inputType} placeholder={placeholder} />
        {trailingIcon ? (
          <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>
            <FieldIcon type={trailingIcon} />
          </button>
        ) : null}
      </span>
    </label>
  );
}

export default function AuthPage() {
  const { t, lang, toggleLang } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [stage, setStage] = useState<AuthStage>("form");
  const [redirect, setRedirect] = useState("/");
  const [forgotEmail, setForgotEmail] = useState("");
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const requestedMode = params.get("mode") || params.get("tab");
      const nextRedirect = params.get("redirect");
      setMode(requestedMode === "register" ? "register" : "login");
      setStage("form");
      setRedirect(safeCustomerRedirect(nextRedirect));
      if (params.get("reset") === "success") {
        setStatusMessage(t({ en: "Password updated. You can login with your new password.", zh: "密码已更新，现在可以使用新密码登录。" }));
      }
    }

    syncFromUrl();
    clearObsoleteCustomerPasswordStorage();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("pet-villa-route", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("pet-villa-route", syncFromUrl);
    };
  }, []);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStage("form");
    setErrorMessage("");
    setStatusMessage("");
    const params = new URLSearchParams(window.location.search);
    params.delete("mode");
    params.set("tab", nextMode);
    if (redirect && redirect !== "/") params.set("redirect", redirect);
    window.history.replaceState(null, "", `/auth?${params.toString()}`);
    window.dispatchEvent(new Event("pet-villa-route"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "").trim();
    const loginEmail = String(form.get("loginEmail") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();
    const confirmPassword = String(form.get("confirmPassword") || "").trim();
    const referralCode = String(form.get("referralCode") || "").trim();
    setErrorMessage("");
    setStatusMessage("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage(t({ en: "Customer authentication is temporarily unavailable.", zh: "顾客登录服务暂时无法使用。" }));
      return;
    }

    if (mode === "register") {
      if (!fullName || !phone || !email || !password || !confirmPassword) {
        setErrorMessage(t({ en: "Please complete all required fields.", zh: "请填写所有必填资料。" }));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t({ en: "Passwords do not match.", zh: "两次输入的密码不一致。" }));
        return;
      }
      if (password.length < 6) {
        setErrorMessage(t({ en: "Password must be at least 6 characters.", zh: "密码至少需要 6 个字符。" }));
        return;
      }
      setSubmitting(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl("/auth/callback?flow=signup"),
          data: {
            full_name: fullName,
            phone,
            referral_code: referralCode || null
          }
        }
      });
      setSubmitting(false);
      if (error || !data.user) {
        setErrorMessage(t({ en: authErrorMessage(error), zh: "无法建立账号，请检查资料后重试。" }));
        return;
      }
      if (referralCode) savePendingReferralCode(referralCode, data.user.id);
      clearObsoleteCustomerPasswordStorage();
      if (data.session) {
        await syncSupabaseSessionToLocalStorage();
        window.location.href = redirect || "/";
        return;
      }
      setStage("signup-sent");
      setStatusMessage(t({ en: "Account created. Check your email and follow the confirmation link before logging in.", zh: "账号已建立。请检查邮箱并点击确认链接，然后再登录。" }));
      return;
    }

    if (!loginEmail || !password) {
      setErrorMessage(t({ en: "Please enter your email and password.", zh: "请输入邮箱和密码。" }));
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setSubmitting(false);
    if (error || !data.user) {
      setErrorMessage(t({ en: authErrorMessage(error), zh: "邮箱或密码不正确。" }));
      return;
    }
    await syncSupabaseSessionToLocalStorage();
    window.location.href = redirect || "/";
  }

  async function continueWithGoogle() {
    setErrorMessage("");
    setStatusMessage("");
    const supabase = getSupabaseGoogleOAuthClient();
    if (!supabase) {
      setErrorMessage(t({ en: "Customer authentication is temporarily unavailable.", zh: "顾客登录服务暂时无法使用。" }));
      return;
    }

    window.sessionStorage.setItem("pet-villa-google-redirect", safeCustomerRedirect(redirect));
    setGoogleSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl("/auth/callback?flow=google")
      }
    });
    if (error) {
      setGoogleSubmitting(false);
      setErrorMessage(t({ en: authErrorMessage(error), zh: "无法使用 Google 继续，请稍后重试。" }));
    }
  }

  function startForgotPassword() {
    setStage("forgot");
    setMode("login");
    setErrorMessage("");
    setStatusMessage("");
  }

  async function sendRecoveryEmail() {
    if (!forgotEmail.trim()) {
      setErrorMessage(t({ en: "Please enter your email address.", zh: "请输入邮箱。" }));
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage(t({ en: "Password recovery is temporarily unavailable.", zh: "密码重设服务暂时无法使用。" }));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: getAuthRedirectUrl("/reset-password")
    });
    setSubmitting(false);
    if (error) {
      setErrorMessage(t({ en: authErrorMessage(error), zh: "无法发送重设密码邮件，请稍后重试。" }));
      return;
    }
    setStatusMessage(t({ en: "Recovery email sent. Check your inbox and follow the secure link.", zh: "重设密码邮件已发送，请检查邮箱并点击安全链接。" }));
    setErrorMessage("");
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/";
  }

  const isLogin = mode === "login";

  if (stage === "signup-sent") {
    return (
      <div className="pet-dream-bg min-h-screen px-4 py-4 text-villa-text-primary sm:py-8">
        <main className="pet-clay-panel mx-auto min-h-[calc(100vh-32px)] max-w-[540px] rounded-[38px] px-7 py-7">
          <header className="flex items-start justify-between">
            <a href="/" className="pet-auth-logo" aria-label="The Pet Villa home"><img src="/petvilla-app-badge.webp" alt="The Pet Villa" /></a>
            <button type="button" onClick={() => switchMode("login")} className="pet-pressable grid h-12 w-12 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(61,31,13,0.12)]" aria-label="Back to login"><BackIcon /></button>
          </header>
          <section className="mt-12 rounded-[30px] border border-white/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(61,31,13,0.10)]">
            <h1 className="font-title text-[30px] font-black leading-tight text-[#6c4aba]">{t({ en: "Check Your Email", zh: "请检查邮箱" })} <HeartMark /></h1>
            <p className="mt-4 text-sm font-bold leading-relaxed text-villa-text-secondary">{statusMessage}</p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-villa-text-secondary">{t({ en: "Your account becomes active only after the secure confirmation link is completed.", zh: "完成安全邮箱确认后，账号才会正式启用。" })}</p>
            <button type="button" onClick={() => switchMode("login")} className="pet-gradient-button mt-6 h-14 w-full rounded-pill font-black text-white">{t({ en: "Back to Login", zh: "返回登录" })}</button>
          </section>
        </main>
      </div>
    );
  }

  if (stage === "forgot") {
    return (
      <div className="pet-dream-bg min-h-screen px-4 py-4 text-villa-text-primary sm:py-8">
        <main className="pet-clay-panel mx-auto min-h-[calc(100vh-32px)] max-w-[540px] rounded-[38px] px-7 py-7">
          <header className="flex items-start justify-between">
            <a href="/" className="pet-auth-logo" aria-label="The Pet Villa home"><img src="/petvilla-app-badge.webp" alt="The Pet Villa" /></a>
            <button type="button" onClick={() => setStage("form")} className="pet-pressable grid h-12 w-12 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(61,31,13,0.12)]" aria-label="Go back"><BackIcon /></button>
          </header>
          <section className="mt-12 rounded-[30px] border border-white/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(61,31,13,0.10)]">
            <h1 className="font-title text-[30px] font-black leading-tight text-[#6c4aba]">{t({ en: "Reset Password", zh: "重设密码" })} <HeartMark /></h1>
            <p className="mt-3 text-sm font-bold leading-relaxed text-villa-text-secondary">{t({ en: "Enter your login email and we will send a secure recovery link.", zh: "输入登录邮箱，我们会发送安全的密码重设链接。" })}</p>
            <label className="mt-8 grid gap-2">
              <span className="text-sm font-black">{t({ en: "Email Address", zh: "邮箱" })}</span>
              <input className="villa-input" value={forgotEmail} onChange={(event) => { setForgotEmail(event.target.value); setErrorMessage(""); }} placeholder="you@example.com" type="email" autoComplete="email" />
            </label>
            <button type="button" disabled={submitting} onClick={sendRecoveryEmail} className="pet-gradient-button mt-5 h-14 w-full rounded-pill font-black text-white disabled:opacity-60">{submitting ? t({ en: "Sending...", zh: "发送中..." }) : t({ en: "Send Recovery Email", zh: "发送重设密码邮件" })}</button>
            {statusMessage ? <p className="mt-4 rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{statusMessage}</p> : null}
            {errorMessage ? <p className="mt-4 rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-600">{errorMessage}</p> : null}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="pet-dream-bg min-h-screen px-4 py-4 text-villa-text-primary sm:py-8">
      <main className="pet-clay-panel mx-auto min-h-[calc(100vh-32px)] max-w-[540px] overflow-hidden rounded-[38px] xl:max-w-[1120px]">
        <div className="relative mx-auto min-h-[calc(100vh-32px)] max-w-[520px] px-6 py-6 sm:px-10 xl:max-w-none xl:px-14">
          <div className="pointer-events-none absolute left-[-18px] top-28 h-24 w-24 rounded-[36px] bg-[#c6a7ff]/28 blur-sm" />
          <div className="pointer-events-none absolute right-[-28px] top-56 h-28 w-28 rounded-full bg-[#ffe1bd]/70 blur-sm" />

          <header className="relative z-10 flex items-start justify-between">
            <a href="/" className="pet-auth-logo" aria-label="The Pet Villa home">
              <img src="/petvilla-app-badge.webp" alt="The Pet Villa" />
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="pet-pressable grid h-11 min-w-11 place-items-center rounded-full border border-white/80 bg-white/90 px-3 text-xs font-black text-[#8d65da] shadow-md"
                aria-label="Switch language"
              >
                {lang === "en" ? "中文" : "EN"}
              </button>
              <button
                type="button"
                onClick={goBack}
                className="pet-pressable grid h-12 w-12 place-items-center rounded-full bg-white text-villa-text-primary shadow-[0_8px_24px_rgba(61,31,13,0.12)]"
                aria-label="Go back"
              >
                <BackIcon />
              </button>
            </div>
          </header>

          <section className="relative z-10 mt-5 xl:grid xl:grid-cols-[1fr_0.92fr] xl:gap-12">
            <div>
              <div className="pet-auth-hero-art xl:hidden">
                <img src="/petvilla-auth-sunroom-banner.webp" alt="Pet Villa sunlit playroom with happy small dogs" />
              </div>
              <h1 className="text-center font-title text-[34px] font-black leading-tight text-[#6c4aba] sm:text-[38px] xl:text-left">
                {isLogin ? t({ en: "Welcome Back", zh: "欢迎回来" }) : t({ en: "Create Account", zh: "创建账号" })}{" "}
                <HeartMark />
              </h1>
              <p className="mx-auto mt-2 max-w-[390px] text-center text-[15px] font-semibold leading-relaxed text-villa-text-secondary xl:mx-0 xl:text-left">
                {isLogin
                  ? t({ en: "Login to manage your bookings and your furry friend's stay", zh: "登录管理你的预约和狗狗入住记录" })
                  : t({ en: "Join Pet Villa and give your dog a home away from home", zh: "加入 Pet Villa，给狗狗一个家一样的寄宿体验" })}
              </p>

              <form className="mt-7 grid gap-4" onSubmit={(event) => { event.preventDefault(); submit(event); }}>
                {isLogin ? (
                  <>
                    <AuthInput
                      icon="mail"
                      name="loginEmail"
                      autoComplete="username"
                      label={t({ en: "Email Address", zh: "邮箱" })}
                      placeholder={t({ en: "Enter your email", zh: "输入邮箱" })}
                      type="email"
                    />
                    <AuthInput
                      icon="lock"
                      name="password"
                      autoComplete="current-password"
                      label={t({ en: "Password", zh: "密码" })}
                      placeholder={t({ en: "Password", zh: "密码" })}
                      type="password"
                      trailingIcon="eye"
                    />
                    <button type="button" className="justify-self-end text-sm font-bold text-[#8d65da]" onClick={startForgotPassword}>
                      {t({ en: "Forgot password?", zh: "忘记密码？" })}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <AuthInput icon="user" name="fullName" autoComplete="name" label={t({ en: "Full Name", zh: "姓名" })} placeholder={t({ en: "Enter your name", zh: "输入姓名" })} />
                      <AuthInput icon="phone" name="phone" autoComplete="tel" label={t({ en: "Phone Number", zh: "电话号码" })} placeholder={t({ en: "Enter your phone", zh: "输入电话" })} type="tel" />
                    </div>
                    <AuthInput icon="mail" name="email" autoComplete="email" label={t({ en: "Email Address", zh: "邮箱" })} placeholder={t({ en: "Enter your email", zh: "输入邮箱" })} type="email" />
                    <AuthInput icon="user" name="referralCode" label={t({ en: "Referral Code (Optional)", zh: "推荐码（可选）" })} placeholder="PETVILLA-PVI0000" />
                    <AuthInput icon="lock" name="password" autoComplete="new-password" label={t({ en: "Password", zh: "密码" })} placeholder={t({ en: "Create a password", zh: "创建密码" })} type="password" trailingIcon="eye" />
                    <AuthInput icon="lock" name="confirmPassword" autoComplete="new-password" label={t({ en: "Confirm Password", zh: "确认密码" })} placeholder={t({ en: "Confirm your password", zh: "确认密码" })} type="password" trailingIcon="eye" />
                    <label className="flex items-center gap-3 text-sm font-semibold text-villa-text-secondary">
                      <input type="checkbox" defaultChecked className="h-5 w-5 accent-villa-primary" />
                      <span>
                        {t({ en: "I agree to the", zh: "我同意" })}{" "}
                        <button type="button" onClick={() => setLegalModal("terms")} className="font-bold text-villa-primary">{t({ en: "Terms of Service", zh: "服务条款" })}</button>{" "}
                        {t({ en: "and", zh: "和" })}{" "}
                        <button type="button" onClick={() => setLegalModal("privacy")} className="font-bold text-villa-primary">{t({ en: "Privacy Policy", zh: "隐私政策" })}</button>
                      </span>
                    </label>
                  </>
                )}

                {statusMessage ? <p className="rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{statusMessage}</p> : null}
                {errorMessage ? <p className="rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-600">{errorMessage}</p> : null}

                <button type="submit" disabled={submitting} className="customer-button-primary mt-2 h-16 rounded-pill text-lg font-black disabled:opacity-60">
                  {submitting ? t({ en: "Please wait...", zh: "请稍候..." }) : isLogin ? t({ en: "Login", zh: "登录" }) : t({ en: "Create Account", zh: "创建账号" })}
                </button>

                <div className="pet-auth-divider" aria-hidden="true">
                  <span>{t({ en: "or", zh: "或" })}</span>
                </div>
                <button
                  type="button"
                  disabled={submitting || googleSubmitting}
                  onClick={continueWithGoogle}
                  className="pet-google-auth-button"
                >
                  <span className="pet-google-auth-mark"><GoogleMark /></span>
                  <span>{googleSubmitting ? t({ en: "Connecting...", zh: "连接中..." }) : t({ en: "Continue with Google", zh: "使用 Google 继续" })}</span>
                </button>
              </form>

               {isLogin ? <p className="mt-7 text-center text-xs font-bold text-villa-text-muted">{t({ en: "Secure customer access uses your confirmed email and password.", zh: "顾客账号使用已确认的邮箱和密码安全登录。" })}</p> : null}
            </div>

            <aside className="relative z-10 mt-9 overflow-hidden rounded-[32px] border border-white/90 bg-white/90 p-5 shadow-[0_16px_0_rgba(183,142,255,0.12),0_28px_46px_rgba(61,31,13,0.13)] xl:mt-0 xl:self-end">
              <div className="grid grid-cols-[116px_1fr] items-center gap-4 xl:block">
                <div className="pet-auth-aside-art">
                  <img src="/petvilla-auth-sunroom-banner.webp" alt="Pet Villa sunlit playroom with happy small dogs" />
                </div>
                <div>
                  <h2 className="font-title text-[20px] font-black leading-tight text-[#6c4aba]">
                    {isLogin ? t({ en: "New to Pet Villa?", zh: "第一次来 Pet Villa？" }) : t({ en: "Already have an account?", zh: "已经有账号？" })}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-villa-text-secondary">
                    {isLogin ? t({ en: "Create an account to get started", zh: "创建账号开始预约" }) : t({ en: "Login to continue", zh: "登录继续预约" })}
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode(isLogin ? "register" : "login")}
                    className="customer-button-primary mt-4 min-h-[48px] rounded-pill px-6 py-3 text-sm font-black"
                  >
                    {isLogin ? t({ en: "Register Now", zh: "立即注册" }) : t({ en: "Login Now", zh: "立即登录" })}
                  </button>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
      {legalModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-villa-text-primary/45 p-4">
          <div className="max-h-[82vh] w-full max-w-[520px] overflow-auto rounded-[24px] bg-white p-6 shadow-[0_24px_70px_rgba(61,31,13,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-title text-2xl font-black text-villa-text-primary">
                {legalModal === "terms" ? t({ en: "Terms of Service", zh: "服务条款" }) : t({ en: "Privacy Policy", zh: "隐私政策" })}
              </h2>
              <button type="button" onClick={() => setLegalModal(null)} className="grid h-10 w-10 place-items-center rounded-full border border-villa-primary-light font-black">×</button>
            </div>
            <div className="mt-4 grid gap-3 text-sm font-semibold leading-relaxed text-villa-text-secondary">
              {legalModal === "terms" ? (
                <>
                  <p>{t({ en: "Pet Villa accepts small dogs from 1-12kg only. Aggressive dogs, dogs with fleas, or dogs without basic health information may be refused for safety.", zh: "Pet Villa 仅接待 1-12kg 小型犬。为了安全，我们可能拒绝攻击性犬只、有跳蚤或缺少基本健康资料的狗狗。" })}</p>
                  <p>{t({ en: "A booking is confirmed only after the required deposit or payment has been received and verified by Pet Villa. Submitting a payment or payment proof does not by itself mean that the payment has been verified or that the booking is confirmed. Check-in is from 9:00am to 8:00pm and check-out is before 12:00pm.", zh: "只有在 Pet Villa 已收到并核实所需订金或付款后，预约才会被确认。提交付款或付款凭证本身并不代表付款已核实或预约已确认。入住时间为上午 9:00 至晚上 8:00，退房时间为中午 12:00 前。" })}</p>
                  <p>{t({ en: "Owners must provide food, care instructions, emergency contacts, and disclose allergies, medication, or special needs before boarding.", zh: "宠主需自备狗粮，并在寄宿前提供照顾说明、紧急联系人、过敏、药物或特殊需求资料。" })}</p>
                  <a href="/terms" className="font-black text-villa-primary hover:text-[#3d1f0d]">{t({ en: "Read the full Terms of Service", zh: "阅读完整服务条款" })}</a>
                </>
              ) : (
                <>
                  <p>{t({ en: "We collect your name, phone number, email, pet profile, booking details, and messages so we can manage your stay and contact you when needed.", zh: "我们会收集姓名、电话、邮箱、宠物资料、预约资料和聊天记录，用于安排寄宿服务和必要联系。" })}</p>
                  <p>{t({ en: "Your information is used for Pet Villa service only. We do not sell your personal information.", zh: "你的资料仅用于 Pet Villa 服务，我们不会出售你的个人资料。" })}</p>
                  <p>{t({ en: "You may contact Pet Villa regarding profile updates or other privacy requests. Some information may need to be retained for legitimate booking, business, accounting, operational, or legal requirements.", zh: "你可联系 Pet Villa 提出资料更新或其他隐私请求。部分资料可能因正当预约、营业、会计、营运或法律要求而需要继续保留。" })}</p>
                  <a href="/privacy" className="font-black text-villa-primary hover:text-[#3d1f0d]">{t({ en: "Read the full Privacy Policy", zh: "阅读完整隐私政策" })}</a>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
