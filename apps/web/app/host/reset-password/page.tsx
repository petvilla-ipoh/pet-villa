"use client";

import { FormEvent, useEffect, useState } from "react";
import { isHostRole } from "../../lib/hostAuth";
import { clearAuthPersistence, getSupabaseBrowserClient } from "../../lib/supabase";

function readableRecoveryError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/session missing|invalid|expired|otp_expired|flow state/i.test(message)) {
    return "This recovery link is invalid or expired.";
  }
  if (/fetch|network|offline|failed to connect/i.test(message)) {
    return "Network error. Check your connection and try again.";
  }
  return message || "This recovery link is invalid or expired.";
}

export default function HostResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("Verifying your secure recovery link...");

  useEffect(() => {
    let active = true;
    async function verifyRecovery() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Host authentication is not configured.");
        setChecking(false);
        return;
      }
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, "", "/host/reset-password");
        }
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw userError || new Error("This recovery link is invalid or expired.");
        const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
        if (profileError || !profile || !isHostRole(profile.role)) {
          await supabase.auth.signOut();
          throw new Error("This recovery link does not belong to a Host account.");
        }
        if (!active) return;
        setAllowed(true);
        setMessage("");
      } catch (error) {
        if (!active) return;
        setMessage(readableRecoveryError(error));
      } finally {
        if (active) setChecking(false);
      }
    }
    void verifyRecovery();
    return () => { active = false; };
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Use at least 8 characters for the new password.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Host authentication is not configured.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      clearAuthPersistence();
      window.location.replace("/host/login?status=password-reset");
    } catch (error) {
      setMessage(readableRecoveryError(error));
      setSaving(false);
    }
  }

  return (
    <main className="host-login-page">
      <section className="host-login-panel">
        <div className="host-login-brand">
          <img src="/petvilla-app-badge.webp" alt="Pet Villa" />
          <span>SECURE HOST RECOVERY</span>
          <h1>Reset Password</h1>
          <p>Create a new password for your Host account.</p>
        </div>
        {checking ? <p className="host-login-message info" role="status">{message}</p> : null}
        {!checking && !allowed ? <div className="host-recovery-error"><p role="alert">{message}</p><a href="/host/login">Request a new recovery link</a></div> : null}
        {allowed ? (
          <form onSubmit={savePassword}>
            <label>
              New password
              <span className="host-password-field">
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
                <button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>
              </span>
            </label>
            <label>Confirm password<input type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /></label>
            {message ? <p className="host-login-message error" role="alert">{message}</p> : null}
            <button type="submit" disabled={saving}>{saving ? "Saving new password..." : "Save New Password"}</button>
          </form>
        ) : null}
        <footer><span>Pet Villa Host v0.1.0</span><span>Copyright 2026 The Pet Villa Ipoh</span></footer>
      </section>
    </main>
  );
}
