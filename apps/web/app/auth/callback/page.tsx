"use client";

import { useEffect, useState } from "react";
import { clearObsoleteCustomerPasswordStorage, syncSupabaseSessionToLocalStorage } from "../../lib/authSession";
import { getSupabaseBrowserClient, getSupabaseGoogleOAuthClient } from "../../lib/supabase";

function safeCustomerRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/host")) return "/";
  return value;
}

function callbackErrorMessage() {
  const flow = new URLSearchParams(window.location.search).get("flow");
  if (flow === "google") return "Google sign-in could not be completed. Please try again.";
  return "This secure confirmation link is invalid or has expired. Please login or request a new email.";
}

export default function CustomerAuthCallbackPage() {
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function completeConfirmation() {
      const params = new URLSearchParams(window.location.search);
      const flow = params.get("flow");
      const supabase = flow === "google"
        ? getSupabaseGoogleOAuthClient()
        : getSupabaseBrowserClient();
      if (!supabase) throw new Error("Customer authentication is not configured.");

      const storedRedirect = window.sessionStorage.getItem("pet-villa-google-redirect");
      const customerRedirect = safeCustomerRedirect(params.get("redirect") || storedRedirect);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) throw error || new Error("The secure confirmation link is missing or expired.");

      clearObsoleteCustomerPasswordStorage();
      await syncSupabaseSessionToLocalStorage();

      if (flow === "google") {
        const response = await fetch("/api/customer/google-profile", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store"
        });
        const body = await response.json().catch(() => null) as {
          profile?: { fullName?: string; phone?: string };
          phoneComplete?: boolean;
          linkStatus?: string;
          error?: string;
        } | null;
        if (!response.ok || !body) throw new Error(body?.error || "Your Google customer profile could not be loaded.");

        if (!body.phoneComplete) {
          const completionUrl = customerRedirect === "/"
            ? "/auth/complete-profile"
            : `/auth/complete-profile?redirect=${encodeURIComponent(customerRedirect)}`;
          window.location.replace(completionUrl);
          return;
        }

        const completionResponse = await fetch("/api/customer/google-profile", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: body.profile?.phone || ""
          })
        });
        const completionBody = await completionResponse.json().catch(() => null) as { error?: string } | null;
        if (!completionResponse.ok) throw new Error(completionBody?.error || "Your customer profile could not be completed safely.");
      }

      window.sessionStorage.removeItem("pet-villa-google-redirect");
      window.location.replace(customerRedirect);
    }

    void completeConfirmation().catch(() => {
      if (active) setErrorMessage(callbackErrorMessage());
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="pet-dream-bg grid min-h-screen place-items-center px-5 py-8 text-villa-text-primary">
      <section className="pet-clay-panel w-full max-w-[520px] rounded-[34px] p-7 text-center">
        <img src="/petvilla-app-badge.webp" alt="The Pet Villa" className="mx-auto h-24 w-24 object-contain" />
        <h1 className="mt-5 font-title text-3xl font-black text-[#6c4aba]">Completing Secure Login</h1>
        {errorMessage ? (
          <>
            <p className="mt-4 rounded-[16px] bg-red-50 p-4 text-sm font-bold text-red-600">{errorMessage}</p>
            <a href="/auth" className="pet-gradient-button mt-5 inline-flex h-12 items-center justify-center rounded-pill px-7 font-black text-white">Back to Login</a>
          </>
        ) : <p className="mt-4 text-sm font-bold text-villa-text-secondary">Please wait while we complete your secure customer session.</p>}
      </section>
    </main>
  );
}
