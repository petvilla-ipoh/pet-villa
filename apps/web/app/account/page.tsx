"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { avatarOptions, avatarToImageSrc, readProfileAvatar, saveProfileAvatar } from "../lib/profileAvatar";

type SessionUser = {
  id: string;
  role: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  profileAvatar?: string;
};

type VerifyTarget = "phone" | "email" | null;

const DEMO_OTP = "123456";

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

function Chevron() {
  return <span className="text-xl font-black text-villa-text-muted">›</span>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex h-7 w-12 items-center rounded-full p-1 transition ${checked ? "justify-end bg-villa-primary" : "justify-start bg-villa-primary-bg"}`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}

export default function AccountPage() {
  const { t, lang, setLang } = useLanguage();
  const [user, setUser] = useState<SessionUser>({ id: "demo-owner", role: "owner" });
  const [avatarValue, setAvatarValue] = useState("system:poodle");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<VerifyTarget>(null);
  const [otpValue, setOtpValue] = useState("");
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState({
    booking: true,
    diary: true,
    payment: true,
    promo: false
  });

  useEffect(() => {
    const nextUser = readUser();
    setUser(nextUser);
    setAvatarValue(readProfileAvatar(nextUser.id, nextUser.profileAvatar));
    try {
      const raw = window.localStorage.getItem(`pet-villa-notifications:${nextUser.id}`);
      if (raw) setNotifications(JSON.parse(raw));
    } catch {
      // Keep defaults.
    }
  }, []);

  function update(field: keyof SessionUser, value: string | boolean) {
    setUser((current) => ({ ...current, [field]: value }));
  }

  function saveProfile(nextUser = user) {
    saveUser(nextUser);
    setUser(nextUser);
    setMessage(t({ en: "Profile saved.", zh: "资料已保存。" }));
  }

  function saveAvatar(value: string) {
    const nextUser = { ...user, profileAvatar: value };
    setAvatarValue(value);
    saveProfileAvatar(user.id, value);
    saveProfile(nextUser);
    setAvatarOpen(false);
  }

  function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") saveAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function saveNotifications(next = notifications) {
    setNotifications(next);
    window.localStorage.setItem(`pet-villa-notifications:${user.id}`, JSON.stringify(next));
    setMessage(t({ en: "Notification settings saved.", zh: "通知设置已保存。" }));
  }

  function beginVerification(target: Exclude<VerifyTarget, null>) {
    setVerifyTarget(target);
    setOtpValue("");
    setMessage(t({ en: "Verification is in demo mode. Use OTP 123456.", zh: "验证目前为测试模式，请输入 OTP 123456。" }));
  }

  function verifyOtp() {
    if (!verifyTarget) return;
    if (otpValue !== DEMO_OTP) {
      setMessage(t({ en: "Wrong OTP. Please try again.", zh: "OTP 不正确，请重试。" }));
      return;
    }
    const nextUser = { ...user, [`${verifyTarget}Verified`]: true } as SessionUser;
    saveProfile(nextUser);
    setVerifyTarget(null);
    setOtpValue("");
    setMessage(t({ en: "Verification completed.", zh: "验证已完成。" }));
  }

  function logout() {
    window.localStorage.removeItem("pet-villa-session");
    window.dispatchEvent(new Event("pet-villa-auth"));
    window.location.href = "/";
  }

  const avatarSrc = avatarToImageSrc(avatarValue);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "My Account", zh: "我的账号" })}</h1>
          {message ? <div className="mt-4 rounded-[16px] bg-[#eef5eb] p-3 text-sm font-black text-villa-accent-green">{message}</div> : null}

          <div className="mt-5 grid gap-3">
            <section className="villa-card">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setAvatarOpen(true)} className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] bg-villa-primary-bg shadow-sm" aria-label="Change Avatar">
                  <img src={avatarSrc} alt={t({ en: "Profile avatar", zh: "头像" })} className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-villa-primary text-white shadow-md">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path d="M8 7h8l1.5 2H20v9H4V9h2.5L8 7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <circle cx="12" cy="13.5" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-title text-2xl font-black text-villa-text-primary">{user.name || t({ en: "Pet Owner", zh: "宠主" })}</h2>
                  <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{user.email || "you@example.com"}</p>
                  <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{user.phone || "+60"}</p>
                  <button type="button" onClick={() => setAvatarOpen(true)} className="mt-2 text-xs font-black text-villa-primary">{t({ en: "Change Avatar", zh: "更换头像" })}</button>
                </div>
              </div>
            </section>

            <section className="villa-card">
              <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setProfileOpen((value) => !value)}>
                <span>
                  <h2 className="card-title">{t({ en: "Profile Information", zh: "个人资料" })}</h2>
                  <span className="text-xs font-bold text-villa-text-muted">{t({ en: "View and update your profile", zh: "查看和更新个人资料" })}</span>
                </span>
                <Chevron />
              </button>
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
                  <button type="button" className="villa-button w-full" onClick={() => saveProfile()}>{t({ en: "Save Profile", zh: "保存资料" })}</button>
                </div>
              ) : null}
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
                {[
                  { key: "phone" as const, label: t({ en: "Phone", zh: "电话" }), value: user.phone || "+60", verified: Boolean(user.phoneVerified) },
                  { key: "email" as const, label: t({ en: "Email", zh: "邮箱" }), value: user.email || "you@example.com", verified: Boolean(user.emailVerified) }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-[16px] bg-villa-primary-bg p-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-villa-text-primary">{item.label}</span>
                      <span className="mt-1 block truncate text-xs font-bold text-villa-text-secondary">{item.value}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs ${item.verified ? "bg-[#eef5eb] text-villa-accent-green" : "bg-red-50 text-villa-primary"}`}>
                        {item.verified ? t({ en: "Verified", zh: "已验证" }) : t({ en: "Not Verified", zh: "未验证" })}
                      </span>
                      {!item.verified ? <button type="button" onClick={() => beginVerification(item.key)} className="villa-button-outline min-h-[30px] px-3 py-1 text-[11px]">{t({ en: "Verify", zh: "验证" })}</button> : null}
                    </span>
                  </div>
                ))}
              </div>
              {verifyTarget ? (
                <div className="mt-4 grid gap-3 rounded-[16px] border border-villa-primary-light bg-white p-3">
                  <p className="m-0 text-xs font-bold text-villa-text-secondary">
                    {verifyTarget === "phone"
                      ? t({ en: "Phone verification demo. Enter 123456.", zh: "电话验证测试模式，请输入 123456。" })
                      : t({ en: "Email verification demo. Enter 123456.", zh: "邮箱验证测试模式，请输入 123456。" })}
                  </p>
                  <input className="villa-input text-center text-xl tracking-[0.35em]" inputMode="numeric" maxLength={6} value={otpValue} onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="_ _ _ _ _ _" />
                  <button type="button" className="villa-button w-full" onClick={verifyOtp}>{t({ en: "Verify OTP", zh: "验证 OTP" })}</button>
                </div>
              ) : null}
            </section>

            <section className="villa-card">
              <h2 className="card-title">{t({ en: "Language", zh: "语言" })}</h2>
              <div className="mt-4 grid grid-cols-2 rounded-full bg-villa-primary-bg p-1">
                <button type="button" className={`min-h-[42px] rounded-full text-sm font-black ${lang === "en" ? "bg-villa-primary text-white shadow-md" : "text-villa-text-secondary"}`} onClick={() => setLang("en")}>English</button>
                <button type="button" className={`min-h-[42px] rounded-full text-sm font-black ${lang === "zh" ? "bg-villa-primary text-white shadow-md" : "text-villa-text-secondary"}`} onClick={() => setLang("zh")}>中文</button>
              </div>
            </section>

            <section className="villa-card">
              <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setNotificationsOpen((value) => !value)}>
                <span>
                  <h2 className="card-title">{t({ en: "Notification Settings", zh: "通知设置" })}</h2>
                  <span className="text-xs font-bold text-villa-text-muted">{t({ en: "Manage your notification preferences", zh: "管理你的通知偏好" })}</span>
                </span>
                <Chevron />
              </button>
              {notificationsOpen ? (
                <div className="mt-4 grid gap-3 border-t border-villa-primary-light pt-4">
                  {[
                    ["booking", t({ en: "Booking reminders", zh: "预约提醒" })],
                    ["diary", t({ en: "Diary updates", zh: "日记更新" })],
                    ["payment", t({ en: "Payment reminders", zh: "付款提醒" })],
                    ["promo", t({ en: "Promotion updates", zh: "优惠通知" })]
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-[16px] bg-villa-primary-bg p-3 text-sm font-black">
                      <span>{label}</span>
                      <Toggle checked={Boolean(notifications[key as keyof typeof notifications])} onChange={() => saveNotifications({ ...notifications, [key]: !notifications[key as keyof typeof notifications] })} />
                    </div>
                  ))}
                </div>
              ) : null}
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

        {avatarOpen ? (
          <div className="fixed inset-0 z-50 grid place-items-end bg-villa-text-primary/35 p-4 sm:place-items-center">
            <div className="w-full max-w-[520px] rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(61,31,13,0.24)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">{t({ en: "Change Avatar", zh: "更换头像" })}</h2>
                <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-villa-primary-light text-xl font-black" onClick={() => setAvatarOpen(false)}>×</button>
              </div>
              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4 text-sm font-black text-villa-text-primary">
                <span>{t({ en: "Upload Photo", zh: "上传照片" })}</span>
                <span className="text-villa-primary">›</span>
                <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </label>
              <h3 className="mt-5 text-sm font-black text-villa-text-primary">{t({ en: "Choose Pet Villa Avatar", zh: "选择 Pet Villa 头像" })}</h3>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {avatarOptions.map((option) => (
                  <button key={option.id} type="button" onClick={() => saveAvatar(`system:${option.id}`)} className="grid justify-items-center gap-2 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-2 text-center text-[10px] font-black text-villa-text-secondary">
                    <img src={avatarToImageSrc(`system:${option.id}`)} alt={t({ en: option.en, zh: option.zh })} className="h-14 w-14 rounded-[16px] object-cover" />
                    <span>{t({ en: option.en, zh: option.zh })}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </OwnerSidebar>
    </ProtectedPage>
  );
}
