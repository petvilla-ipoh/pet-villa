"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/LanguageProvider";
import { syncSupabaseSessionToLocalStorage } from "../../lib/authSession";
import { normalizeMalaysiaPhone } from "../../lib/phoneNormalization";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type GoogleProfileResponse = {
  profile?: { phone?: string };
  error?: string;
};

function safeCustomerRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/host")) return "/";
  return value;
}

export default function GoogleProfileCompletionPage() {
  const { t, lang, toggleLang } = useLanguage();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Customer authentication is not configured.");
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        window.location.replace("/auth");
        return;
      }

      const response = await fetch("/api/customer/google-profile", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store"
      });
      const body = await response.json().catch(() => null) as GoogleProfileResponse | null;
      if (!response.ok || !body) throw new Error(body?.error || "Your Google customer profile could not be loaded.");
      if (!active) return;

      if (normalizeMalaysiaPhone(body.profile?.phone || "")) {
        const target = safeCustomerRedirect(new URLSearchParams(window.location.search).get("redirect"));
        window.location.replace(target);
        return;
      }
      setPhone(body.profile?.phone || "");
      setLoading(false);
    }

    void loadProfile().catch((error) => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : "Your Google customer profile could not be loaded.");
      setLoadFailed(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!normalizeMalaysiaPhone(phone)) {
      setErrorMessage(t({ en: "Enter a valid Malaysia phone number.", zh: "请输入有效的马来西亚电话号码。" }));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage(t({ en: "Customer authentication is temporarily unavailable.", zh: "顾客登录服务暂时无法使用。" }));
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      window.location.replace("/auth");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/customer/google-profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone: phone.trim() })
    });
    const body = await response.json().catch(() => null) as GoogleProfileResponse | null;
    if (!response.ok) {
      setErrorMessage(body?.error || t({ en: "Your profile could not be completed safely.", zh: "暂时无法安全完成顾客资料。" }));
      setSubmitting(false);
      return;
    }

    const metadataResult = await supabase.auth.updateUser({ data: { phone: phone.trim() } });
    if (metadataResult.error) {
      setErrorMessage(t({ en: "Your contact details were saved, but the session could not be refreshed. Please login again.", zh: "联系资料已保存，但无法更新登录状态，请重新登录。" }));
      setSubmitting(false);
      return;
    }

    await syncSupabaseSessionToLocalStorage();
    const target = safeCustomerRedirect(new URLSearchParams(window.location.search).get("redirect"));
    window.location.replace(target);
  }

  return (
    <main className="pet-dream-bg grid min-h-screen place-items-center px-4 py-6 text-villa-text-primary">
      <section className="pet-clay-panel w-full max-w-[540px] rounded-[36px] p-6 sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <a href="/" className="pet-auth-logo" aria-label="The Pet Villa home">
            <img src="/petvilla-app-badge.webp" alt="The Pet Villa" />
          </a>
          <button type="button" onClick={toggleLang} className="pet-pressable grid h-11 min-w-11 place-items-center rounded-full border border-white/80 bg-white/90 px-3 text-xs font-black text-[#8d65da] shadow-md">
            {lang === "en" ? "中文" : "EN"}
          </button>
        </header>

        <div className="mt-7 rounded-[30px] border border-white/90 bg-white/88 p-5 shadow-[0_16px_36px_rgba(61,31,13,0.10)] sm:p-7">
          <span className="inline-flex rounded-pill bg-[#efe7ff] px-3 py-1 text-[10px] font-black uppercase text-[#7655c4]">Google Customer</span>
          <h1 className="mt-3 font-title text-[30px] font-black leading-tight text-[#6c4aba]">{t({ en: "Complete Your Profile", zh: "完成顾客资料" })}</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-villa-text-secondary">
            {t({ en: "Add your phone number so Pet Villa can contact you about your bookings.", zh: "请填写电话号码，方便 Pet Villa 就预约事宜与你联系。" })}
          </p>

          {loading ? <p className="mt-7 text-sm font-bold text-villa-text-secondary">{t({ en: "Loading your secure profile...", zh: "正在载入安全资料..." })}</p> : null}

          {!loading && !loadFailed ? (
            <form className="mt-7 grid gap-5" onSubmit={submit}>
              <label className="grid gap-2">
                <span className="text-sm font-black">{t({ en: "Phone Number", zh: "电话号码" })}</span>
                <input className="villa-input" value={phone} onChange={(event) => { setPhone(event.target.value); setErrorMessage(""); }} autoComplete="tel" inputMode="tel" placeholder="012-345 6789" required />
              </label>
              {errorMessage ? <p className="rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-600">{errorMessage}</p> : null}
              <button type="submit" disabled={submitting} className="customer-button-primary min-h-14 rounded-pill px-6 text-base font-black disabled:opacity-60">
                {submitting ? t({ en: "Saving securely...", zh: "安全保存中..." }) : t({ en: "Save and Continue", zh: "保存并继续" })}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
