"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getHostAuthErrorMessage, HOST_MAGIC_LINK_NOTICE_KEY } from "../lib/hostAuthErrors";
import { clearAuthPersistence, getSupabaseBrowserClient } from "../lib/supabase";

type SecurityMode = "set" | "change";
type SecurityNotice = { tone: "error" | "success"; message: string } | null;

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  if (!password) return { score: 0, label: "Not entered" };
  if (score <= 1) return { score: 1, label: "Weak" };
  if (score === 2) return { score: 2, label: "Fair" };
  if (score === 3) return { score: 3, label: "Strong" };
  return { score: 4, label: "Very strong" };
}

export function HostSecurityPanel({ initialMode = "set" }: { initialMode?: SecurityMode }) {
  const [mode, setMode] = useState<SecurityMode>(initialMode);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<SecurityNotice>(null);
  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);

  useEffect(() => {
    let active = true;
    void getSupabaseBrowserClient()?.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email || "");
    });
    return () => { active = false; };
  }, []);

  function resetFields(nextMode: SecurityMode) {
    setMode(nextMode);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNotice(null);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (newPassword.length < 8) {
      setNotice({ tone: "error", message: "Use at least 8 characters for the new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ tone: "error", message: "The new passwords do not match." });
      return;
    }
    if (mode === "change" && !currentPassword) {
      setNotice({ tone: "error", message: "Enter your current password first." });
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Unable to connect to Host authentication.");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError || new Error("Auth session missing");
      const currentEmail = userData.user.email || email;
      if (!currentEmail) throw new Error("Host profile missing");

      if (mode === "change") {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword
        });
        if (verifyError) throw verifyError;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      window.sessionStorage.removeItem(HOST_MAGIC_LINK_NOTICE_KEY);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ tone: "success", message: "Password saved securely. You will now return to Host login." });
      window.setTimeout(async () => {
        await supabase.auth.signOut();
        clearAuthPersistence();
        window.location.replace("/host/login?status=password-set");
      }, 1000);
    } catch (error) {
      setNotice({ tone: "error", message: getHostAuthErrorMessage(error) });
      setSaving(false);
    }
  }

  return (
    <article className="host-operating-card host-security-card">
      <div className="host-panel-heading">
        <div><span className="host-workspace-kicker">HOST ACCOUNT</span><h2>Security</h2><p>Set a regular login password or securely replace your current one.</p></div>
        <span className="host-security-lock" aria-hidden="true">SECURE</span>
      </div>

      <div className="host-security-tabs" role="tablist" aria-label="Password action">
        <button type="button" role="tab" aria-selected={mode === "set"} data-active={mode === "set" || undefined} onClick={() => resetFields("set")}>Set Password</button>
        <button type="button" role="tab" aria-selected={mode === "change"} data-active={mode === "change" || undefined} onClick={() => resetFields("change")}>Change Password</button>
      </div>

      <form className="host-security-form" onSubmit={savePassword}>
        <div className="host-security-context">
          <span>{mode === "set" ? "SIGNED IN BY SECURE LINK" : "PASSWORD VERIFICATION"}</span>
          <strong>{email || "Current Host account"}</strong>
          <p>{mode === "set" ? "No old password is required while this verified Host session is active." : "Your current password is checked again before a replacement is accepted."}</p>
        </div>

        {mode === "change" ? (
          <label>Current Password<span className="host-password-field"><input type={showCurrent ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); if (notice?.tone === "error") setNotice(null); }} required /><button type="button" onClick={() => setShowCurrent((value) => !value)}>{showCurrent ? "Hide" : "Show"}</button></span></label>
        ) : null}

        <label>New Password<span className="host-password-field"><input type={showNew ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); if (notice?.tone === "error") setNotice(null); }} required minLength={8} /><button type="button" onClick={() => setShowNew((value) => !value)}>{showNew ? "Hide" : "Show"}</button></span></label>
        <div className="host-password-strength" data-score={strength.score}><span><i /><i /><i /><i /></span><strong>{strength.label}</strong><small>Use 12+ characters with uppercase, lowercase, a number and a symbol.</small></div>
        <label>Confirm New Password<input type={showNew ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); if (notice?.tone === "error") setNotice(null); }} required minLength={8} /></label>

        {notice ? <p className={`host-security-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.message}</p> : null}
        <button type="submit" className="host-primary-action" disabled={saving}>{saving ? "Saving securely..." : mode === "set" ? "Save Password" : "Change Password"}</button>
        <small className="host-security-footnote">After a successful password update, this Host session is signed out on purpose.</small>
      </form>
    </article>
  );
}
