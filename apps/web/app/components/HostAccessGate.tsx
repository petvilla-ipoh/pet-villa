"use client";

import { useEffect, useState } from "react";
import { clearAuthPersistence, getSupabaseBrowserClient } from "../lib/supabase";

export function HostAccessGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  const [deniedMessage, setDeniedMessage] = useState("This account does not have access to Pet Villa operations.");

  useEffect(() => {
    let active = true;
    async function verifyHost() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        window.location.replace("/host/login?error=configuration");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        window.location.replace(`/host/login?error=session-expired&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const response = await fetch("/api/host/staff/me", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      if (!active) return;
      if (response.status === 401) {
        window.location.replace(`/host/login?error=session-expired&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (!response.ok) {
        setDeniedMessage(response.status === 403
          ? "This Host account is suspended, disabled, or does not have access."
          : "Host access could not be verified. Please try again.");
        setState("denied");
        return;
      }
      setState("allowed");
    }
    void verifyHost();
    return () => {
      active = false;
    };
  }, []);

  if (state === "allowed") return <>{children}</>;
  if (state === "denied") {
    return (
      <main className="host-access-page">
        <section className="host-access-card" role="alert">
          <img src="/petvilla-app-badge.webp" alt="Pet Villa" />
          <span>HOST ACCESS</span>
          <h1>Access denied</h1>
          <p>{deniedMessage}</p>
          <div>
            <a href="/">Return to customer Home</a>
            <button type="button" onClick={async () => {
              await getSupabaseBrowserClient()?.auth.signOut();
              clearAuthPersistence();
              window.location.replace("/host/login");
            }}>Use another account</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="host-access-page">
      <section className="host-access-card" role="status" aria-live="polite">
        <img src="/petvilla-app-badge.webp" alt="" />
        <span>SECURE HOST</span>
        <h1>Checking Host access</h1>
        <p>Verifying your Pet Villa operations session.</p>
      </section>
    </main>
  );
}
