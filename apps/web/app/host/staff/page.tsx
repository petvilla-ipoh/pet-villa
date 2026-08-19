"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { HostAccessGate } from "../../components/HostAccessGate";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import { HostLanguageRuntime, type HostUiLanguage } from "../../lib/hostI18n";
import {
  ROLE_LABELS,
  ROLE_PERMISSION_PRESETS,
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  hasStaffPermission,
  type StaffPermission,
  type StaffRole,
  type StaffStatus
} from "../../lib/staffAccess";

type StaffMember = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  access_role: StaffRole;
  status: StaffStatus;
  permissions: StaffPermission[];
  invited_at: string;
  last_active_at?: string | null;
};

type AuditEntry = {
  id: string;
  actor_id?: string | null;
  target_user_id?: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

type StaffPayload = {
  staff: StaffMember[];
  audit: AuditEntry[];
  current: { userId: string; accessRole: StaffRole; permissions: StaffPermission[] };
};

const NAV = [
  ["Dashboard", "/host"],
  ["Booking Center", "/host?workspace=bookings"],
  ["Calendar", "/host?workspace=calendar"],
  ["CRM & Pets", "/host?workspace=customers"],
  ["Inbox", "/host?workspace=messages"],
  ["Pet Diary", "/host?workspace=diary"],
  ["Payments", "/host?workspace=payments"],
  ["Vouchers & Pricing", "/host?workspace=vouchers"],
  ["Reviews", "/host?workspace=reviews"],
  ["Notifications", "/host?workspace=notifications"],
  ["Settings", "/host?workspace=settings"],
  ["Staff & Access", "/host/staff"]
] as const;

const NAV_PERMISSION: Record<(typeof NAV)[number][0], StaffPermission> = {
  Dashboard: "dashboard.view",
  "Booking Center": "bookings.view",
  Calendar: "calendar.view",
  "CRM & Pets": "crm.view",
  Inbox: "inbox.view",
  "Pet Diary": "diary.view",
  Payments: "payments.view",
  "Vouchers & Pricing": "vouchers.view",
  Reviews: "reviews.view",
  Notifications: "notifications.view",
  Settings: "settings.view",
  "Staff & Access": "staff.view"
};

function initials(name: string, email: string) {
  return (name || email).split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PV";
}

function friendlyAction(action: string) {
  return action.replace(/^staff\./, "Staff ").replaceAll("_", " ");
}

export default function HostStaffPage() {
  const [hostLanguage, setHostLanguage] = useState<HostUiLanguage>("en");
  const [payload, setPayload] = useState<StaffPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ displayName: "", email: "", accessRole: "staff" as StaffRole });
  const [permissionDraft, setPermissionDraft] = useState<StaffPermission[]>([]);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase is not configured for Host access.");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error("Your Host session expired. Please sign in again.");
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`, ...(init?.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Staff access request failed.");
    return body;
  }, []);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      await request("/api/host/staff/me");
      const result = await request("/api/host/staff");
      setPayload(result as StaffPayload);
      setSelectedId((current) => current || result.staff?.[0]?.id || "");
      setNotice(null);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Staff & Access could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const saved = window.localStorage.getItem("pet-villa-host-language");
    if (saved === "en" || saved === "zh") setHostLanguage(saved);
    void loadStaff();
  }, [loadStaff]);

  function changeHostLanguage(language: HostUiLanguage) {
    setHostLanguage(language);
    window.localStorage.setItem("pet-villa-host-language", language);
  }

  const canManage = hasStaffPermission(payload?.current.permissions, "staff.manage");
  const isOwner = payload?.current.accessRole === "owner";
  const assignableRoles = STAFF_ROLES.filter((role) => isOwner || (role !== "owner" && role !== "admin"));
  const selected = payload?.staff.find((member) => member.id === selectedId) || null;
  const selectedIsPrimaryOwner = selected?.email.toLowerCase() === "canyonfsp@gmail.com";
  const selectedIsProtectedOwner = selected?.access_role === "owner" && !isOwner;
  const canEditSelected = Boolean(canManage && !selectedIsPrimaryOwner && !selectedIsProtectedOwner);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (payload?.staff || []).filter((member) => !normalized || `${member.display_name} ${member.email} ${member.access_role} ${member.status}`.toLowerCase().includes(normalized));
  }, [payload?.staff, query]);

  useEffect(() => {
    setPermissionDraft(selected?.permissions?.length ? selected.permissions : selected ? ROLE_PERMISSION_PRESETS[selected.access_role] : []);
  }, [selected]);

  async function inviteStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("invite");
    setNotice(null);
    try {
      await request("/api/host/staff", {
        method: "POST",
        body: JSON.stringify({ ...invite, permissions: ROLE_PERMISSION_PRESETS[invite.accessRole] })
      });
      setInvite({ displayName: "", email: "", accessRole: "staff" });
      setInviteOpen(false);
      setNotice({ tone: "success", text: "Staff invitation sent. No password was created or stored." });
      await loadStaff();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Staff invitation failed." });
    } finally {
      setSaving("");
    }
  }

  async function updateStaff(member: StaffMember, changes: Record<string, unknown>, success: string) {
    setSaving(member.id);
    setNotice(null);
    try {
      await request(`/api/host/staff/${member.id}`, { method: "PATCH", body: JSON.stringify(changes) });
      setNotice({ tone: "success", text: success });
      await loadStaff();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Staff access could not be updated." });
    } finally {
      setSaving("");
    }
  }

  const activeCount = payload?.staff.filter((member) => member.status === "active").length || 0;
  const invitedCount = payload?.staff.filter((member) => member.status === "invited").length || 0;
  const restrictedCount = payload?.staff.filter((member) => member.status === "suspended" || member.status === "disabled").length || 0;

  return (
    <HostAccessGate>
      <div className="host-console host-staff-console">
        <HostLanguageRuntime language={hostLanguage} />
        <aside className="host-sidebar">
          <div className="host-brand"><img src="/petvilla-app-badge.webp" alt="Pet Villa" /><div><strong>Pet Villa</strong><span>Ipoh Operations</span></div></div>
          <div className="host-profile-card"><img src="/avatars/human-04.png" alt="Host profile" /><div><strong>Pet Villa Team</strong><span>{payload ? ROLE_LABELS[payload.current.accessRole] : "Secure staff"}</span></div><i aria-hidden="true" /></div>
          <nav className="host-sidebar-nav" aria-label="Host workspaces">
            <div className="host-nav-group"><p>Operations</p>
              {NAV.filter(([label]) => !payload || hasStaffPermission(payload.current.permissions, NAV_PERMISSION[label])).map(([label, href]) => (
                <a key={label} href={href} className={label === "Staff & Access" ? "is-active" : ""}><span className="host-nav-letter">{label.slice(0, 1)}</span><span>{label}</span></a>
              ))}
            </div>
          </nav>
          <div className="host-support-card"><span>Security rule</span><strong>Passwords and tokens are never shown here.</strong><a href="/host">Return to dashboard</a></div>
        </aside>

        <main className="host-main">
          <header className="host-topbar">
            <div><h1>Staff & Access</h1><p>Invite the right people, grant only what they need, and keep a clear audit trail.</p></div>
            <div className="host-topbar-actions"><div className="host-language-switch" role="group" aria-label="Host language"><button type="button" data-active={hostLanguage === "en" || undefined} onClick={() => changeHostLanguage("en")}>EN</button><button type="button" data-active={hostLanguage === "zh" || undefined} onClick={() => changeHostLanguage("zh")}>中文</button></div><span className="host-access-role-chip">{payload ? ROLE_LABELS[payload.current.accessRole] : "Checking access"}</span>{canManage ? <button type="button" className="host-primary-action" onClick={() => setInviteOpen(true)}>Invite Staff</button> : null}</div>
          </header>

          {notice ? <p className={`host-notice host-notice-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
          <section className="host-staff-hero">
            <div><span>SECURE OPERATIONS</span><h2>Your team, clearly controlled.</h2><p>Every role has a defined workspace. Sensitive actions are checked again by the server API.</p></div>
            <div className="host-staff-hero-mark"><strong>{activeCount}</strong><span>Active staff</span></div>
          </section>

          <section className="host-staff-stats">
            <article><span>Total team</span><strong>{payload?.staff.length || 0}</strong><small>Owner, admins and staff</small></article>
            <article><span>Active</span><strong>{activeCount}</strong><small>Can enter Host operations</small></article>
            <article><span>Invited</span><strong>{invitedCount}</strong><small>Waiting to accept invite</small></article>
            <article><span>Restricted</span><strong>{restrictedCount}</strong><small>Suspended or disabled</small></article>
          </section>

          <section className="host-staff-layout">
            <div className="host-operating-card host-staff-directory">
              <div className="host-section-heading"><div><span>TEAM DIRECTORY</span><h2>Staff Members</h2><p>Select a person to review role, status and permissions.</p></div></div>
              <label className="host-staff-search"><span aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, role or status..." /></label>
              {loading ? <p className="host-staff-empty">Loading secure staff records...</p> : null}
              {!loading && !filtered.length ? <p className="host-staff-empty">No matching staff members.</p> : null}
              <div className="host-staff-list">
                {filtered.map((member) => (
                  <button key={member.id} type="button" className={selectedId === member.id ? "is-selected" : ""} onClick={() => setSelectedId(member.id)}>
                    <span className="host-staff-avatar">{initials(member.display_name, member.email)}</span>
                    <span><strong>{member.display_name || member.email}</strong><small>{member.email}</small></span>
                    <span className={`host-staff-status is-${member.status}`}>{member.status}</span>
                    <b>{ROLE_LABELS[member.access_role]}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="host-operating-card host-staff-detail">
              {!selected ? <div className="host-staff-empty">Select a staff member to manage access.</div> : (
                <>
                  <div className="host-staff-person">
                    <span className="host-staff-avatar large">{initials(selected.display_name, selected.email)}</span>
                    <div><span>STAFF PROFILE</span><h2>{selected.display_name || selected.email}</h2><p>{selected.email}</p></div>
                    <span className={`host-staff-status is-${selected.status}`}>{selected.status}</span>
                  </div>

                  <div className="host-staff-form-grid">
                    <label>Role<select value={selected.access_role} disabled={!canEditSelected || saving === selected.id} onChange={(event) => void updateStaff(selected, { accessRole: event.target.value }, "Staff role updated and recorded in Audit Log.")}>{assignableRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
                    <label>Status<select value={selected.status} disabled={!canEditSelected || saving === selected.id} onChange={(event) => void updateStaff(selected, { status: event.target.value }, "Staff status updated and applied to sign-in access.")}><option value="invited">Invited</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select></label>
                  </div>

                  <div className="host-permission-heading"><div><strong>Permissions</strong><span>Buttons and API actions use the same permission IDs.</span></div>{canEditSelected ? <button type="button" onClick={() => setPermissionDraft(ROLE_PERMISSION_PRESETS[selected.access_role])}>Use role defaults</button> : null}</div>
                  <div className="host-permission-grid">
                    {STAFF_PERMISSIONS.map((permission) => (
                      <label key={permission}><input type="checkbox" disabled={!canEditSelected} checked={permissionDraft.includes(permission)} onChange={(event) => setPermissionDraft((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} /><span>{permission.replace(".", " / ")}</span></label>
                    ))}
                  </div>
                  {canEditSelected ? <button type="button" className="host-primary-action host-save-permissions" disabled={saving === selected.id} onClick={() => void updateStaff(selected, { permissions: permissionDraft }, "Permissions saved and recorded in Audit Log.")}>{saving === selected.id ? "Saving secure access..." : "Save Permissions"}</button> : <p className="host-staff-readonly">{selectedIsPrimaryOwner ? "The primary Pet Villa Owner is permanently protected." : "Your role can view this account but cannot change it."}</p>}
                </>
              )}
            </div>
          </section>

          {hasStaffPermission(payload?.current.permissions, "audit.view") ? (
            <section className="host-operating-card host-audit-card">
              <div className="host-section-heading"><div><span>ACCOUNTABILITY</span><h2>Audit Log</h2><p>Role, permission and account status changes are retained here.</p></div><b>{payload?.audit.length || 0} events</b></div>
              <div className="host-audit-list">
                {(payload?.audit || []).map((entry) => <article key={entry.id}><span className="host-audit-dot" /><div><strong>{friendlyAction(entry.action)}</strong><small>{new Date(entry.created_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</small></div><code>{entry.target_user_id?.slice(0, 8) || "system"}</code></article>)}
                {!payload?.audit.length ? <p className="host-staff-empty">No staff access changes recorded yet.</p> : null}
              </div>
            </section>
          ) : null}
        </main>

        {inviteOpen ? <div className="host-modal-layer" role="presentation"><form className="host-staff-modal" onSubmit={inviteStaff}><div className="host-modal-heading"><div><span>SECURE INVITATION</span><h2>Invite Staff</h2><p>Supabase sends the invite. Pet Villa never creates or stores a plaintext password.</p></div><button type="button" onClick={() => setInviteOpen(false)}>Close</button></div><label>Full name<input value={invite.displayName} onChange={(event) => setInvite({ ...invite, displayName: event.target.value })} required minLength={2} /></label><label>Email address<input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} required /></label><label>Access role<select value={invite.accessRole} onChange={(event) => setInvite({ ...invite, accessRole: event.target.value as StaffRole })}>{assignableRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label><div className="host-staff-invite-note"><strong>Same secure login</strong><span>The invited team member will use `/host/login` after accepting the email invitation.</span></div><button type="submit" className="host-primary-action" disabled={saving === "invite"}>{saving === "invite" ? "Sending secure invite..." : "Create Staff & Send Invite"}</button></form></div> : null}
      </div>
    </HostAccessGate>
  );
}
