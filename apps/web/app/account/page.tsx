"use client";

import { useEffect, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

type SessionUser = {
  id: string;
  role: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
};

function readUser(): SessionUser {
  try {
    const session = JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}");
    return session.user || { id: "demo-owner", role: "owner" };
  } catch {
    return { id: "demo-owner", role: "owner" };
  }
}

function saveUser(user: SessionUser) {
  window.localStorage.setItem("pet-villa-session", JSON.stringify({ user }));
  window.dispatchEvent(new Event("pet-villa-auth"));
}

function DogAvatar() {
  return (
    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] bg-villa-primary-bg">
      <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
        <circle cx="40" cy="41" r="24" fill="#f5c4b3" />
        <path d="M22 36c-8 3-10 14-5 20 5 5 14 3 17-3M58 36c8 3 10 14 5 20-5 5-14 3-17-3" fill="#c7824f" />
        <circle cx="31" cy="41" r="3" fill="#3d1f0d" />
        <circle cx="49" cy="41" r="3" fill="#3d1f0d" />
        <ellipse cx="40" cy="51" rx="6" ry="4" fill="#3d1f0d" />
      </svg>
    </div>
  );
}

function Chevron() {
  return <span className="text-xl font-black text-villa-text-muted">›</span>;
}

export default function AccountPage() {
  const { t, lang, setLang } = useLanguage();
  const [user, setUser] = useState<SessionUser>({ id: "demo-owner", role: "owner" });
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setUser(readUser());
  }, []);

  function update(field: keyof SessionUser, value: string | boolean) {
    setUser((current) => ({ ...current, [field]: value }));
  }

  function saveProfile() {
    saveUser(user);
    setMessage(t({ en: "Profile saved.", zh: "资料已保存。" }));
  }

  function logout() {
    window.localStorage.removeItem("pet-villa-session");
    window.dispatchEvent(new Event("pet-villa-auth"));
    window.location.href = "/";
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "My Account", zh: "我的账号" })}</h1>
          {message ? <div className="mt-4 rounded-[16px] bg-[#eef5eb] p-3 text-sm font-black text-villa-accent-green">{message}</div> : null}

          <div className="mt-5 grid gap-3">
            <section className="villa-card">
              <div className="flex items-center gap-4">
                <DogAvatar />
                <div className="min-w-0 flex-1">
                  <h2 className="font-title text-2xl font-black text-villa-text-primary">{user.name || t({ en: "Pet Owner", zh: "宠主" })}</h2>
                  <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{user.email || "you@example.com"}</p>
                  <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{user.phone || "+60"}</p>
                  <button type="button" onClick={() => setProfileOpen((value) => !value)} className="mt-3 rounded-full border border-villa-primary px-4 py-2 text-xs font-black text-villa-primary">
                    {t({ en: "Edit Profile", zh: "编辑资料" })}
                  </button>
                </div>
              </div>
              {profileOpen ? (
                <div className="mt-4 grid gap-3 border-t border-villa-primary-light pt-4">
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Full Name", zh: "姓名" })}</span>
                    <input className="villa-input" value={user.name || ""} onChange={(event) => update("name", event.target.value)} placeholder={t({ en: "Enter full name", zh: "输入姓名" })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Phone Number", zh: "电话号码" })}</span>
                    <input className="villa-input" value={user.phone || ""} onChange={(event) => update("phone", event.target.value)} placeholder="+60" />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Email", zh: "邮箱" })}</span>
                    <input className="villa-input" value={user.email || ""} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" />
                  </label>
                  <button type="button" className="villa-button w-full" onClick={saveProfile}>{t({ en: "Save Profile", zh: "保存资料" })}</button>
                </div>
              ) : null}
            </section>

            <section className="villa-card">
              <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setProfileOpen((value) => !value)}>
                <span>
                  <h2 className="card-title">{t({ en: "Profile Information", zh: "个人资料" })}</h2>
                  <span className="text-xs font-bold text-villa-text-muted">{t({ en: "View and update your profile", zh: "查看和更新个人资料" })}</span>
                </span>
                <Chevron />
              </button>
            </section>

            <section className="villa-card">
              <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setPasswordOpen((value) => !value)}>
                <span>
                  <h2 className="card-title">{t({ en: "Security", zh: "安全" })}</h2>
                  <span className="text-xs font-bold text-villa-text-muted">{t({ en: "Change your password", zh: "更改你的密码" })}</span>
                </span>
                <Chevron />
              </button>
              {passwordOpen ? (
                <div className="mt-4 grid gap-3 border-t border-villa-primary-light pt-4">
                  <input className="villa-input" type="password" placeholder={t({ en: "Current password", zh: "当前密码" })} />
                  <input className="villa-input" type="password" placeholder={t({ en: "New password", zh: "新密码" })} />
                  <button type="button" className="villa-button-outline w-full" onClick={() => setMessage(t({ en: "Password change is saved locally for demo. Connect backend for production.", zh: "密码更改目前为本地演示，正式上线需连接后端。" }))}>{t({ en: "Change Password", zh: "更改密码" })}</button>
                </div>
              ) : null}
            </section>

            <section className="villa-card">
              <h2 className="card-title">{t({ en: "Verification", zh: "验证状态" })}</h2>
              <div className="mt-3 grid gap-2 text-sm font-black">
                <div className="flex justify-between rounded-[16px] bg-villa-primary-bg p-3">
                  <span>{t({ en: "Phone", zh: "电话" })}</span>
                  <span className={user.phoneVerified ? "text-villa-accent-green" : "text-villa-primary"}>{user.phoneVerified ? t({ en: "Verified", zh: "已验证" }) : t({ en: "Not Verified", zh: "未验证" })}</span>
                </div>
                <div className="flex justify-between rounded-[16px] bg-villa-primary-bg p-3">
                  <span>{t({ en: "Email", zh: "邮箱" })}</span>
                  <span className={user.emailVerified ? "text-villa-accent-green" : "text-villa-primary"}>{user.emailVerified ? t({ en: "Verified", zh: "已验证" }) : t({ en: "Not Verified", zh: "未验证" })}</span>
                </div>
              </div>
            </section>

            <section className="villa-card">
              <h2 className="card-title">{t({ en: "Language", zh: "语言" })}</h2>
              <div className="mt-4 grid grid-cols-2 rounded-full bg-villa-primary-bg p-1">
                <button type="button" className={`min-h-[42px] rounded-full text-sm font-black ${lang === "en" ? "bg-villa-primary text-white shadow-md" : "text-villa-text-secondary"}`} onClick={() => setLang("en")}>English</button>
                <button type="button" className={`min-h-[42px] rounded-full text-sm font-black ${lang === "zh" ? "bg-villa-primary text-white shadow-md" : "text-villa-text-secondary"}`} onClick={() => setLang("zh")}>中文</button>
              </div>
            </section>

            <section className="villa-card">
              <h2 className="card-title">{t({ en: "Notification Settings", zh: "通知设置" })}</h2>
              <p className="m-0 mt-1 text-xs font-bold text-villa-text-muted">{t({ en: "Manage your notification preferences", zh: "管理你的通知偏好" })}</p>
            </section>

            <section className="villa-card">
              <h2 className="card-title">{t({ en: "Help & Support", zh: "帮助与支持" })}</h2>
              <div className="mt-4 grid gap-2">
                <a className="villa-button w-full" href="https://wa.me/60123456789" target="_blank" rel="noreferrer">{t({ en: "WhatsApp Pet Villa", zh: "WhatsApp Pet Villa" })}</a>
                <a className="villa-button-outline w-full" href="tel:+60123456789">{t({ en: "Call Pet Villa", zh: "致电 Pet Villa" })}</a>
              </div>
            </section>

            <button type="button" className="villa-button-outline w-full border-villa-primary text-villa-primary" onClick={logout}>{t({ en: "Logout", zh: "退出登录" })}</button>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
