"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";
import { clearObsoleteCustomerPasswordStorage } from "../lib/authSession";
import { getSupabaseBrowserClient } from "../lib/supabase";

type LocalizedCopy = { en: string; zh: string };

const INVALID_RECOVERY_LINK: LocalizedCopy = {
  en: "This password recovery link is invalid or has expired. Please request a new one.",
  zh: "此密码重设链接无效或已过期，请重新申请。"
};

const MISSING_RECOVERY_SESSION: LocalizedCopy = {
  en: "Your password recovery session is missing or has expired. Please request a new link.",
  zh: "密码重设会话不存在或已过期，请重新申请链接。"
};

const NETWORK_ERROR: LocalizedCopy = {
  en: "Unable to connect. Please check your connection and try again.",
  zh: "无法连接，请检查网络后重试。"
};

function getRecoveryErrorCopy(error: unknown, stage: "prepare" | "update"): LocalizedCopy {
  const authError = error && typeof error === "object" ? error as { code?: string; message?: string } : null;
  const code = authError?.code || "";
  const message = authError?.message || String(error || "");

  if (stage === "update" && code === "same_password") {
    return {
      en: "Your new password must be different from your current password.",
      zh: "新密码不能与当前密码相同，请设置一个不同的密码。"
    };
  }
  if (/fetch|network|offline|failed to connect/i.test(message)) return NETWORK_ERROR;
  if (code === "session_not_found" || /session (?:is )?missing|recovery session missing/i.test(message)) {
    return MISSING_RECOVERY_SESSION;
  }
  if (stage === "prepare" || code === "otp_expired" || code === "bad_code_verifier" || /invalid|expired|one-time token/i.test(message)) {
    return INVALID_RECOVERY_LINK;
  }
  return {
    en: "Your password could not be updated. Please try again.",
    zh: "无法更新密码，请重试。"
  };
}

function getStoredLanguageCopy(copy: LocalizedCopy) {
  return window.localStorage.getItem("pet-villa-lang") === "zh" ? copy.zh : copy.en;
}

function PasswordEyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-villa-text-muted" aria-hidden="true">
      <path d="M3 12s3.4-5.5 9-5.5S21 12 21 12s-3.4 5.5-9 5.5S3 12 3 12Z" fill="none" stroke="#bfaa9f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.3" fill="#bfaa9f" />
    </svg>
  );
}

function PasswordLockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="6" y="10" width="12" height="10" rx="2" fill="#e8927c" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="#e8927c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="15" r="1.4" fill="#fff8f5" />
    </svg>
  );
}

export default function CustomerResetPasswordPage() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    let active = true;
    async function prepareRecovery() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Customer authentication is not configured.");
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) throw error || new Error("Recovery session missing.");
      if (active) setReady(true);
    }
    void prepareRecovery().catch((error) => {
      if (active) setErrorMessage(getStoredLanguageCopy(getRecoveryErrorCopy(error, "prepare")));
    });
    return () => { active = false; };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    setMessage("");
    setErrorMessage("");
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage("Password recovery is temporarily unavailable.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(t(getRecoveryErrorCopy(error, "update")));
        return;
      }
      clearObsoleteCustomerPasswordStorage();
      setMessage(t({ en: "Password updated. Returning to login...", zh: "密码已更新，正在返回登录页面……" }));
      await supabase.auth.signOut();
      window.setTimeout(() => window.location.replace("/auth?reset=success"), 700);
    } catch (error) {
      setErrorMessage(t(getRecoveryErrorCopy(error, "update")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pet-dream-bg grid min-h-screen place-items-center px-5 py-8 text-villa-text-primary">
      <section className="pet-clay-panel w-full max-w-[520px] rounded-[34px] p-7">
        <img src="/petvilla-app-badge.webp" alt="The Pet Villa" className="mx-auto h-24 w-24 object-contain" />
        <h1 className="mt-5 text-center font-title text-3xl font-black text-[#6c4aba]">Set New Password</h1>
        <p className="mt-3 text-center text-sm font-bold text-villa-text-secondary">Create a new password for your customer account.</p>
        {errorMessage ? <p className="mt-5 rounded-[16px] bg-red-50 p-4 text-sm font-bold text-red-600">{errorMessage}</p> : null}
        {message ? <p className="mt-5 rounded-[16px] bg-[#eef5eb] p-4 text-sm font-bold text-villa-accent-green">{message}</p> : null}
        {ready ? (
          <form className="mt-6 grid gap-4" onSubmit={updatePassword}>
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "New Password", zh: "新密码" })}</span>
              <span className="flex h-14 items-center gap-3 rounded-[24px] border border-white/90 bg-white/90 px-3 shadow-[inset_0_-5px_10px_rgba(183,142,255,0.08),0_10px_22px_rgba(61,31,13,0.08)] transition focus-within:border-[#c6a7ff] focus-within:shadow-[0_0_0_4px_rgba(198,167,255,0.20),0_12px_24px_rgba(61,31,13,0.08)]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] border border-white bg-[linear-gradient(145deg,#fffaf4_0%,#f1e5ff_100%)] shadow-[inset_0_-4px_8px_rgba(183,142,255,0.12),0_6px_0_rgba(232,146,124,0.10),0_10px_16px_rgba(61,31,13,0.09)]"><PasswordLockIcon /></span>
                <input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-villa-text-primary outline-none" />
                <button type="button" className="grid h-11 w-11 shrink-0 place-items-center" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t({ en: "Hide password", zh: "隐藏密码" }) : t({ en: "Show password", zh: "显示密码" })}><PasswordEyeIcon /></button>
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "Confirm New Password", zh: "确认新密码" })}</span>
              <span className="flex h-14 items-center gap-3 rounded-[24px] border border-white/90 bg-white/90 px-3 shadow-[inset_0_-5px_10px_rgba(183,142,255,0.08),0_10px_22px_rgba(61,31,13,0.08)] transition focus-within:border-[#c6a7ff] focus-within:shadow-[0_0_0_4px_rgba(198,167,255,0.20),0_12px_24px_rgba(61,31,13,0.08)]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] border border-white bg-[linear-gradient(145deg,#fffaf4_0%,#f1e5ff_100%)] shadow-[inset_0_-4px_8px_rgba(183,142,255,0.12),0_6px_0_rgba(232,146,124,0.10),0_10px_16px_rgba(61,31,13,0.09)]"><PasswordLockIcon /></span>
                <input name="confirmation" type={showConfirmation ? "text" : "password"} autoComplete="new-password" className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-villa-text-primary outline-none" />
                <button type="button" className="grid h-11 w-11 shrink-0 place-items-center" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? t({ en: "Hide confirmation password", zh: "隐藏确认密码" }) : t({ en: "Show confirmation password", zh: "显示确认密码" })}><PasswordEyeIcon /></button>
              </span>
            </label>
            <button disabled={submitting} className="pet-gradient-button h-14 rounded-pill font-black text-white disabled:opacity-60">{submitting ? "Saving..." : "Save Password"}</button>
          </form>
        ) : null}
        {!ready && errorMessage ? <a href="/auth" className="pet-lavender-button mt-5 flex h-12 items-center justify-center rounded-pill font-black text-white">Back to Login</a> : null}
      </section>
    </main>
  );
}
