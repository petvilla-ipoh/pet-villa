"use client";

import { FormEvent, useEffect, useState } from "react";
import { sanitizeHostRedirect } from "../../lib/hostAuth";
import { getHostAuthErrorMessage } from "../../lib/hostAuthErrors";
import { getAuthRedirectUrl } from "../../lib/siteUrl";
import { getSupabaseBrowserClient, setAuthPersistence } from "../../lib/supabase";

type NoticeTone = "error" | "success" | "info";

export default function HostLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<NoticeTone>("info");
  const [loading, setLoading] = useState<"login" | "reset" | "magic" | "">("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const status = params.get("status");
    setMessage("");
    if (error === "session-expired") {
      setTone("error");
      setMessage("Your Host session expired. Please sign in again.");
    } else if (error === "session-missing") {
      setTone("error");
      setMessage("Your secure login session is missing or has expired.");
    } else if (error === "expired-link") {
      setTone("error");
      setMessage("This secure login link has expired. Please request a new one.");
    } else if (error === "access-denied") {
      setTone("error");
      setMessage("This account does not have access to Host Operations.");
    } else if (error === "profile-missing") {
      setTone("error");
      setMessage("Your Host profile could not be verified. Please contact the account owner.");
    } else if (error === "rate-limit") {
      setTone("error");
      setMessage("Too many attempts. Please wait before trying again.");
    } else if (error === "configuration") {
      setTone("error");
      setMessage("Host authentication is not configured.");
    } else if (error === "network") {
      setTone("error");
      setMessage("Unable to connect. Please check your connection and try again.");
    } else if (status === "password-reset") {
      setTone("success");
      setMessage("Password reset successful. Sign in with your new password.");
    } else if (status === "password-set") {
      setTone("success");
      setMessage("Password saved. Sign in with your new password.");
    } else if (status === "reset-email-sent") {
      setTone("success");
      setMessage("Password reset email sent. Open the secure link in your inbox.");
    } else if (status === "magic-link-sent") {
      setTone("success");
      setMessage("Secure login link sent. Open it on this device to continue.");
    }

    if (error || status) {
      params.delete("error");
      params.delete("status");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }

    const clearRestoredError = (event: PageTransitionEvent) => {
      if (event.persisted && !new URLSearchParams(window.location.search).has("error")) setMessage("");
    };
    window.addEventListener("pageshow", clearRestoredError);

    let active = true;
    async function redirectExistingHost() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session?.access_token) return;
      const response = await fetch("/api/host/staff/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      });
      if (!active) return;
      if (response.ok) {
        window.location.replace(sanitizeHostRedirect(params.get("redirect")));
      }
    }
    void redirectExistingHost();
    return () => {
      active = false;
      window.removeEventListener("pageshow", clearRestoredError);
    };
  }, []);

  function clearOldError() {
    if (tone === "error" && message) setMessage("");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("login");
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase Auth is not configured.");
      setAuthPersistence(remember);
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user || !data.session?.access_token) throw error || new Error("Login failed.");
      const accessResponse = await fetch("/api/host/staff/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      });
      if (accessResponse.status === 401) {
        await supabase.auth.signOut();
        throw new Error("Auth session missing.");
      }
      if (accessResponse.status === 403) {
        await supabase.auth.signOut();
        setTone("error");
        setMessage("This account does not have access to Host Operations.");
        setLoading("");
        return;
      }
      if (!accessResponse.ok) {
        setTone("error");
        setMessage("Host access could not be verified. Please try again.");
        setLoading("");
        return;
      }
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      window.location.replace(sanitizeHostRedirect(redirect));
    } catch (error) {
      setTone("error");
      setMessage(getHostAuthErrorMessage(error));
      setLoading("");
    }
  }

  async function sendResetEmail() {
    if (!email.trim()) {
      setTone("error");
      setMessage("Enter your Host email first.");
      return;
    }
    setLoading("reset");
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase Auth is not configured.");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthRedirectUrl("/host/reset-password")
      });
      if (error) throw error;
      setTone("success");
      setMessage("Password reset email sent. Open the secure link in your inbox.");
    } catch (error) {
      setTone("error");
      setMessage(getHostAuthErrorMessage(error));
    } finally {
      setLoading("");
    }
  }

  async function sendMagicLink() {
    if (!email.trim()) {
      setTone("error");
      setMessage("Enter your Host email first.");
      return;
    }
    setLoading("magic");
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase Auth is not configured.");
      setAuthPersistence(remember);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl("/host/auth/callback?flow=magic-link"),
          shouldCreateUser: false
        }
      });
      if (error) throw error;
      setTone("success");
      setMessage("Secure login link sent. Open it on this device to continue.");
    } catch (error) {
      setTone("error");
      setMessage(getHostAuthErrorMessage(error));
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="host-login-page">
      <section className="host-login-panel">
        <div className="host-login-brand">
          <img src="/petvilla-app-badge.webp" alt="Pet Villa" />
          <span>PET VILLA IPOH</span>
          <h1>Host Operations</h1>
          <p>Secure access for Pet Villa staff only.</p>
        </div>
        <form onSubmit={login}>
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => { setEmail(event.target.value); clearOldError(); }} required /></label>
          <label>
            Password
            <span className="host-password-field">
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); clearOldError(); }} required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
            </span>
          </label>
          <div className="host-login-options">
            <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Remember me</label>
            <button type="button" onClick={sendResetEmail} disabled={Boolean(loading)}>{loading === "reset" ? "Sending..." : "Forgot password?"}</button>
          </div>
          {message ? <p className={`host-login-message ${tone}`} role={tone === "error" ? "alert" : "status"}>{message}</p> : null}
          <button type="submit" disabled={Boolean(loading)}>{loading === "login" ? "Verifying..." : "Login to Host"}</button>
          <button type="button" className="host-magic-link" onClick={sendMagicLink} disabled={Boolean(loading)}>{loading === "magic" ? "Sending secure link..." : "Email me a secure login link"}</button>
          <a href="/">Return to customer website</a>
        </form>
        <footer><span>Pet Villa Host v0.1.0</span><span>Copyright 2026 The Pet Villa Ipoh</span></footer>
      </section>
    </main>
  );
}
