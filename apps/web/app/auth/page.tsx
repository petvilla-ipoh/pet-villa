"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";

type AuthMode = "login" | "register";
type FieldIconType = "mail" | "lock" | "user" | "phone" | "eye";
type AuthStage = "form" | "otp" | "forgot-phone" | "forgot-otp";
type PendingUser = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  otp: string;
  expiresAt: number;
};

const DEMO_OTP = "123456";

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
  name,
  label,
  placeholder,
  type = "text",
  trailingIcon
}: {
  icon: FieldIconType;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  trailingIcon?: FieldIconType;
}) {
  const [visible, setVisible] = useState(false);
  const inputType = trailingIcon === "eye" && type === "password" ? (visible ? "text" : "password") : type;

  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-villa-text-primary">{label}</span>
      <span className="flex h-14 items-center gap-3 rounded-[14px] border border-villa-primary-light bg-white/80 px-4 shadow-[0_8px_24px_rgba(61,31,13,0.04)] transition focus-within:border-villa-primary focus-within:shadow-[0_0_0_3px_rgba(232,146,124,0.15)]">
        <FieldIcon type={icon} />
        <input name={name} className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-villa-text-primary outline-none placeholder:text-villa-text-muted" type={inputType} placeholder={placeholder} />
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
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const requestedMode = params.get("mode") || params.get("tab");
      const nextRedirect = params.get("redirect");
      setMode(requestedMode === "register" ? "register" : "login");
      setStage("form");
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStage("form");
    setErrorMessage("");
    setStatusMessage("");
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextMode);
    if (redirect && redirect !== "/") params.set("redirect", redirect);
    window.history.replaceState(null, "", `/auth?${params.toString()}`);
    window.dispatchEvent(new Event("pet-villa-route"));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "").trim();
    const emailOrPhone = String(form.get("emailOrPhone") || form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();
    const confirmPassword = String(form.get("confirmPassword") || "").trim();
    setErrorMessage("");
    setStatusMessage("");

    if (mode === "register") {
      if (!fullName || !phone || !email || !password || !confirmPassword) {
        setErrorMessage(t({ en: "Please complete all required fields.", zh: "请填写所有必填资料。" }));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t({ en: "Passwords do not match.", zh: "两次输入的密码不一致。" }));
        return;
      }
      const nextUser: PendingUser = {
        fullName,
        phone,
        email,
        password,
        otp: DEMO_OTP,
        expiresAt: Date.now() + 5 * 60 * 1000
      };
      setPendingUser(nextUser);
      setOtpValue("");
      setCooldown(60);
      setStage("otp");
      setStatusMessage(t({ en: "Demo OTP sent. Use 123456 to verify.", zh: "测试 OTP 已发送，请输入 123456 验证。" }));
      return;
    }

    if (!emailOrPhone || !password) {
      setErrorMessage(t({ en: "Please enter email or phone number and password.", zh: "请输入邮箱或电话号码和密码。" }));
      return;
    }
    const registered = readRegisteredUser();
    const matched = registered && (registered.email === emailOrPhone || registered.phone === emailOrPhone);
    if (!registered || !matched) {
      setErrorMessage(t({ en: "No account found. Please register first.", zh: "找不到账号，请先注册。" }));
      return;
    }
    if (registered.password !== password) {
      setErrorMessage(t({ en: "Incorrect password. Please try again.", zh: "密码不正确，请重试。" }));
      return;
    }
    window.localStorage.setItem("pet-villa-session", JSON.stringify({
      user: {
        id: "demo-owner",
        role: "owner",
        name: registered.fullName,
        email: registered.email,
        phone: registered.phone,
        phoneVerified: Boolean(registered.phoneVerified),
        emailVerified: Boolean(registered.emailVerified)
      }
    }));
    window.dispatchEvent(new Event("pet-villa-auth"));
    window.location.href = redirect || "/";
  }

  function readRegisteredUser(): { fullName: string; phone: string; email: string; password: string; phoneVerified: boolean; emailVerified?: boolean } | null {
    try {
      return JSON.parse(window.localStorage.getItem("pet-villa-registered-user") || "null");
    } catch {
      return null;
    }
  }

  function completeOtpVerification() {
    if (!pendingUser) return;
    setErrorMessage("");
    if (Date.now() > pendingUser.expiresAt) {
      setErrorMessage(t({ en: "OTP expired. Please resend a new code.", zh: "OTP 已过期，请重新发送验证码。" }));
      return;
    }
    if (otpValue !== pendingUser.otp) {
      setErrorMessage(t({ en: "Wrong OTP. Please try again.", zh: "OTP 不正确，请重试。" }));
      return;
    }
    const registeredUser = {
      fullName: pendingUser.fullName,
      phone: pendingUser.phone,
      email: pendingUser.email,
      password: pendingUser.password,
      phoneVerified: true,
      emailVerified: false
    };
    window.localStorage.setItem("pet-villa-last-full-name", pendingUser.fullName);
    window.localStorage.setItem("pet-villa-registered-user", JSON.stringify(registeredUser));
    window.localStorage.setItem("pet-villa-session", JSON.stringify({
      user: {
        id: "demo-owner",
        role: "owner",
        name: pendingUser.fullName,
        email: pendingUser.email,
        phone: pendingUser.phone,
        phoneVerified: true,
        emailVerified: false
      }
    }));
    window.dispatchEvent(new Event("pet-villa-auth"));
    setStatusMessage(t({ en: "Phone verified. Welcome to Pet Villa!", zh: "电话号码已验证，欢迎来到 Pet Villa！" }));
    window.setTimeout(() => {
      window.location.href = redirect || "/";
    }, 600);
  }

  function resendOtp() {
    if (!pendingUser || cooldown > 0) return;
    setPendingUser({ ...pendingUser, otp: DEMO_OTP, expiresAt: Date.now() + 5 * 60 * 1000 });
    setCooldown(60);
    setStatusMessage(t({ en: "A new demo OTP was sent. Use 123456.", zh: "新的测试 OTP 已发送，请输入 123456。" }));
    setErrorMessage("");
  }

  function startForgotPassword() {
    setStage("forgot-phone");
    setMode("login");
    setOtpValue("");
    setNewPassword("");
    setErrorMessage("");
    setStatusMessage("");
  }

  function sendForgotOtp() {
    if (!forgotPhone.trim()) {
      setErrorMessage(t({ en: "Please enter your phone number.", zh: "请输入电话号码。" }));
      return;
    }
    setStage("forgot-otp");
    setCooldown(60);
    setStatusMessage(t({ en: "Demo reset OTP sent. Use 123456.", zh: "测试重设 OTP 已发送，请输入 123456。" }));
    setErrorMessage("");
  }

  function resetPassword() {
    if (otpValue !== DEMO_OTP) {
      setErrorMessage(t({ en: "Wrong OTP. Please try again.", zh: "OTP 不正确，请重试。" }));
      return;
    }
    if (!newPassword.trim()) {
      setErrorMessage(t({ en: "Please enter a new password.", zh: "请输入新密码。" }));
      return;
    }
    if (newPassword.trim().length < 6) {
      setErrorMessage(t({ en: "Password must be at least 6 characters.", zh: "密码至少需要 6 个字符。" }));
      return;
    }
    const registered = readRegisteredUser();
    if (registered && registered.phone === forgotPhone.trim()) {
      window.localStorage.setItem("pet-villa-registered-user", JSON.stringify({ ...registered, password: newPassword.trim() }));
    }
    setStage("form");
    setOtpValue("");
    setNewPassword("");
    setStatusMessage(t({ en: "Password reset saved for this demo. Please login again.", zh: "测试版密码已重设，请重新登录。" }));
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

  if (stage === "otp" && pendingUser) {
    return (
      <div className="min-h-screen bg-villa-background bg-[image:var(--paw-pattern)] bg-[length:120px_120px] bg-repeat px-5 py-4 text-villa-text-primary">
        <main className="mx-auto min-h-[calc(100vh-32px)] max-w-[540px] rounded-[30px] bg-white/70 px-7 py-7 shadow-[0_24px_70px_rgba(61,31,13,0.12)]">
          <header className="flex items-start justify-between">
            <a href="/" aria-label="The Pet Villa home"><img src="/logo.png" alt="The Pet Villa" className="h-[118px] w-[150px] object-contain" /></a>
            <button type="button" onClick={goBack} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(61,31,13,0.12)]" aria-label="Go back"><BackIcon /></button>
          </header>
          <section className="mt-10">
            <h1 className="font-title text-[30px] font-black leading-tight">{t({ en: "Verify Your Phone", zh: "验证电话号码" })} <HeartMark /></h1>
            <p className="mt-3 text-sm font-bold leading-relaxed text-villa-text-secondary">
              {t({ en: `We sent a 6-digit code to ${pendingUser.phone}.`, zh: `我们已发送 6 位数验证码到 ${pendingUser.phone}。` })}
            </p>
            <label className="mt-8 grid gap-2">
              <span className="text-sm font-black">{t({ en: "OTP Code", zh: "验证码" })}</span>
              <input
                className="villa-input text-center text-2xl tracking-[0.45em]"
                inputMode="numeric"
                maxLength={6}
                value={otpValue}
                onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="_ _ _ _ _ _"
              />
            </label>
            {statusMessage ? <p className="mt-4 rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{statusMessage}</p> : null}
            {errorMessage ? <p className="mt-4 rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-600">{errorMessage}</p> : null}
            <button type="button" onClick={completeOtpVerification} className="villa-button mt-5 w-full">{t({ en: "Verify OTP", zh: "验证 OTP" })}</button>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={resendOtp} disabled={cooldown > 0} className="villa-button-outline w-full disabled:opacity-50">
                {cooldown > 0 ? t({ en: `Resend in ${cooldown}s`, zh: `${cooldown} 秒后重发` }) : t({ en: "Resend OTP", zh: "重新发送 OTP" })}
              </button>
              <button type="button" onClick={() => setStage("form")} className="villa-button-outline w-full">{t({ en: "Change Phone Number", zh: "更改电话号码" })}</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (stage === "forgot-phone" || stage === "forgot-otp") {
    return (
      <div className="min-h-screen bg-villa-background bg-[image:var(--paw-pattern)] bg-[length:120px_120px] bg-repeat px-5 py-4 text-villa-text-primary">
        <main className="mx-auto min-h-[calc(100vh-32px)] max-w-[540px] rounded-[30px] bg-white/70 px-7 py-7 shadow-[0_24px_70px_rgba(61,31,13,0.12)]">
          <header className="flex items-start justify-between">
            <a href="/" aria-label="The Pet Villa home"><img src="/logo.png" alt="The Pet Villa" className="h-[118px] w-[150px] object-contain" /></a>
            <button type="button" onClick={() => setStage("form")} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(61,31,13,0.12)]" aria-label="Go back"><BackIcon /></button>
          </header>
          <section className="mt-10">
            <h1 className="font-title text-[30px] font-black leading-tight">{t({ en: "Reset Password", zh: "重设密码" })} <HeartMark /></h1>
            <p className="mt-3 text-sm font-bold leading-relaxed text-villa-text-secondary">{t({ en: "Use phone OTP to reset your password.", zh: "使用手机 OTP 重设你的密码。" })}</p>
            {stage === "forgot-phone" ? (
              <div className="mt-8 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black">{t({ en: "Phone Number", zh: "电话号码" })}</span>
                  <input className="villa-input" value={forgotPhone} onChange={(event) => setForgotPhone(event.target.value)} placeholder="+60..." />
                </label>
                <button type="button" onClick={sendForgotOtp} className="villa-button w-full">{t({ en: "Send OTP", zh: "发送 OTP" })}</button>
              </div>
            ) : (
              <div className="mt-8 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black">{t({ en: "OTP Code", zh: "验证码" })}</span>
                  <input className="villa-input text-center text-2xl tracking-[0.45em]" inputMode="numeric" maxLength={6} value={otpValue} onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="_ _ _ _ _ _" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black">{t({ en: "New Password", zh: "新密码" })}</span>
                  <input className="villa-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t({ en: "Enter new password", zh: "输入新密码" })} />
                </label>
                <button type="button" onClick={resetPassword} className="villa-button w-full">{t({ en: "Save New Password", zh: "保存新密码" })}</button>
              </div>
            )}
            {statusMessage ? <p className="mt-4 rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{statusMessage}</p> : null}
            {errorMessage ? <p className="mt-4 rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-600">{errorMessage}</p> : null}
          </section>
        </main>
      </div>
    );
  }

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

              <form className="mt-10 grid gap-5" onSubmit={(event) => { event.preventDefault(); submit(event); }}>
                {isLogin ? (
                  <>
                    <AuthInput
                      icon="mail"
                      name="emailOrPhone"
                      label={t({ en: "Email or Phone Number", zh: "邮箱或电话号码" })}
                      placeholder={t({ en: "Enter your email address or phone number", zh: "输入邮箱或电话号码" })}
                    />
                    <AuthInput
                      icon="lock"
                      name="password"
                      label={t({ en: "Password", zh: "密码" })}
                      placeholder={t({ en: "Enter your password", zh: "输入密码" })}
                      type="password"
                      trailingIcon="eye"
                    />
                    <button type="button" className="justify-self-end text-sm font-bold text-villa-primary" onClick={startForgotPassword}>
                      {t({ en: "Forgot password?", zh: "忘记密码？" })}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <AuthInput icon="user" name="fullName" label={t({ en: "Full Name", zh: "姓名" })} placeholder={t({ en: "Enter your name", zh: "输入姓名" })} />
                      <AuthInput icon="phone" name="phone" label={t({ en: "Phone Number", zh: "电话号码" })} placeholder={t({ en: "Enter your phone", zh: "输入电话" })} type="tel" />
                    </div>
                    <AuthInput icon="mail" name="email" label={t({ en: "Email Address", zh: "邮箱" })} placeholder={t({ en: "Enter your email", zh: "输入邮箱" })} type="email" />
                    <AuthInput icon="lock" name="password" label={t({ en: "Password", zh: "密码" })} placeholder={t({ en: "Create a password", zh: "创建密码" })} type="password" trailingIcon="eye" />
                    <AuthInput icon="lock" name="confirmPassword" label={t({ en: "Confirm Password", zh: "确认密码" })} placeholder={t({ en: "Confirm your password", zh: "确认密码" })} type="password" trailingIcon="eye" />
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

                {statusMessage ? <p className="rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{statusMessage}</p> : null}
                {errorMessage ? <p className="rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-600">{errorMessage}</p> : null}

                <button type="submit" className="mt-2 h-16 rounded-pill bg-villa-primary text-lg font-black text-white shadow-[0_12px_28px_rgba(232,146,124,0.28)] transition hover:-translate-y-px">
                  {isLogin ? t({ en: "Login", zh: "登录" }) : t({ en: "Create Account", zh: "创建账号" })}
                </button>
              </form>

              {isLogin ? (
                <>
                  <div className="my-9 flex items-center gap-5">
                    <span className="h-px flex-1 bg-villa-primary-light/70" />
                    <span className="text-sm font-semibold text-villa-text-secondary">{t({ en: "or continue with", zh: "或继续使用" })}</span>
                    <span className="h-px flex-1 bg-villa-primary-light/70" />
                  </div>

                  <div className="grid gap-3">
                    <button type="button" onClick={() => alert(t({ en: "Google login is coming soon.", zh: "Google 登录即将开放。" }))} className="flex h-14 items-center justify-center gap-4 rounded-pill border border-villa-primary-light bg-white text-sm font-black text-villa-text-primary shadow-[0_8px_24px_rgba(61,31,13,0.08)] transition hover:-translate-y-px">
                      <GoogleMark />
                      {t({ en: "Continue with Google", zh: "使用 Google 继续" })} <span className="text-[10px] text-villa-text-muted">Soon</span>
                    </button>
                    <button type="button" onClick={() => alert(t({ en: "Apple login is coming soon.", zh: "Apple 登录即将开放。" }))} className="flex h-14 items-center justify-center gap-4 rounded-pill border border-villa-primary-light bg-white text-sm font-black text-villa-text-primary shadow-[0_8px_24px_rgba(61,31,13,0.08)] transition hover:-translate-y-px">
                      <AppleMark />
                      {t({ en: "Continue with Apple", zh: "使用 Apple 继续" })} <span className="text-[10px] text-villa-text-muted">Soon</span>
                    </button>
                  </div>
                </>
              ) : null}
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
