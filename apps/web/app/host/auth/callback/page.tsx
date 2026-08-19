"use client";

import { useEffect, useState } from "react";
import { sanitizeHostRedirect } from "../../../lib/hostAuth";
import { getHostAuthErrorKind, HOST_MAGIC_LINK_NOTICE_KEY } from "../../../lib/hostAuthErrors";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

export default function HostAuthCallbackPage() {
  const [message, setMessage] = useState("Completing secure Host sign in...");

  useEffect(() => {
    let active = true;
    async function finishSignIn() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Host authentication is not configured.");
        return;
      }
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) {
          throw sessionError || new Error("Auth session missing.");
        }
        const accessResponse = await fetch("/api/host/staff/me", {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
        });
        if (accessResponse.status === 403) {
          await supabase.auth.signOut();
          throw new Error("This account does not have Host access.");
        }
        if (accessResponse.status === 401) throw new Error("Auth session missing.");
        if (!accessResponse.ok) throw new Error("Unable to connect. Host access could not be verified.");
        if (!active) return;
        if (params.get("flow") === "magic-link") {
          window.sessionStorage.setItem(HOST_MAGIC_LINK_NOTICE_KEY, "1");
        }
        window.location.replace(sanitizeHostRedirect(params.get("redirect")));
      } catch (error) {
        if (!active) return;
        const kind = getHostAuthErrorKind(error);
        const reason = kind === "unknown" ? "session-missing" : kind;
        setMessage("Secure Host sign in could not be completed.");
        window.setTimeout(() => window.location.replace(`/host/login?error=${reason}`), 1200);
      }
    }
    void finishSignIn();
    return () => { active = false; };
  }, []);

  return (
    <main className="host-access-page">
      <section className="host-access-card" role="status" aria-live="polite">
        <img src="/petvilla-app-badge.webp" alt="" />
        <span>SECURE HOST</span>
        <h1>Authenticating</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
