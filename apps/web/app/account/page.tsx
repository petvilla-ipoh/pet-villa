"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { signOutAuth } from "../lib/authSession";
import { fetchAuthenticatedCustomerJson } from "../lib/dataReliability";
import { dogAvatarSrc, loadPetProfiles, readPetProfiles, type PetProfile } from "../lib/petProfiles";
import { avatarOptions, avatarToImageSrc, readProfileAvatar, saveProfileAvatar } from "../lib/profileAvatar";
import { getSupabaseBrowserClient } from "../lib/supabase";

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

type CustomerProfileResponse = {
  profile: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
  };
};
const contactLinks = [
  {
    brand: "xhs",
    label: "Xiaohongshu",
    href: "https://xhslink.cn/m/72j2fF2R1x1"
  },
  { brand: "instagram", label: "Instagram", href: "https://www.instagram.com/thepetvilla_boarding?igsh=MWtjMjd4MmdjMmQ0NA%3D%3D&utm_source=qr" },
  {
    brand: "whatsapp",
    label: "WhatsApp",
    href: "https://wa.me/601163830339"
  }
];

function writeSessionCache(user: SessionUser) {
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
  const [user, setUser] = useState<SessionUser>({ id: "", role: "owner" });
  const [avatarValue, setAvatarValue] = useState("system:human-01");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [quickMenu, setQuickMenu] = useState<"pets" | "contact" | null>(null);
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [notifications, setNotifications] = useState({
    booking: true,
    diary: true,
    payment: true,
    promo: false
  });

  useEffect(() => {
    document.body.dataset.petVillaSurface = "account";
    let active = true;
    let customerId = "";
    async function hydrateProfile() {
      try {
        const { profile } = await fetchAuthenticatedCustomerJson<CustomerProfileResponse>("/api/customer/profile");
        if (!active) return;
        customerId = profile.id;
        const nextUser: SessionUser = {
          id: profile.id,
          role: "owner",
          name: profile.fullName,
          phone: profile.phone,
          email: profile.email,
          phoneVerified: false,
          emailVerified: profile.emailVerified
        };
        setUser(nextUser);
        writeSessionCache(nextUser);
        setAvatarValue(readProfileAvatar(nextUser.id, nextUser.profileAvatar));
        setPets(readPetProfiles(nextUser.id));
        const items = await loadPetProfiles();
        if (active) setPets(items);
        try {
          const raw = window.localStorage.getItem(`pet-villa-notifications:${nextUser.id}`);
          if (raw) setNotifications(JSON.parse(raw));
        } catch {
          // Keep defaults.
        }
      } catch (error) {
        if (active) setProfileError(error instanceof Error ? error.message : t({ en: "Your profile could not be loaded.", zh: "无法读取个人资料。" }));
      }
    }
    const syncPets = () => {
      if (customerId) setPets(readPetProfiles(customerId));
      void loadPetProfiles().then((items) => { if (active) setPets(items); }).catch(() => undefined);
    };
    void hydrateProfile();
    window.addEventListener("pet-villa-pets", syncPets);
    return () => {
      active = false;
      window.removeEventListener("pet-villa-pets", syncPets);
      delete document.body.dataset.petVillaSurface;
    };
  }, []);

  function update(field: keyof SessionUser, value: string | boolean) {
    setUser((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    setMessage("");
    setProfileError("");
    if (!user.name?.trim() || !user.phone?.trim()) {
      setProfileError(t({ en: "Name and phone number are required.", zh: "姓名和电话号码为必填资料。" }));
      return;
    }
    setProfileSaving(true);
    try {
      const { profile } = await fetchAuthenticatedCustomerJson<CustomerProfileResponse>("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: user.name, phone: user.phone })
      });
      const nextUser = { ...user, name: profile.fullName, phone: profile.phone, email: profile.email, emailVerified: profile.emailVerified };
      setUser(nextUser);
      writeSessionCache(nextUser);
      setMessage(t({ en: "Profile saved.", zh: "资料已保存。" }));
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : t({ en: "Your profile could not be saved.", zh: "无法保存个人资料。" }));
    } finally {
      setProfileSaving(false);
    }
  }

  function saveAvatar(value: string) {
    const nextUser = { ...user, profileAvatar: value };
    setAvatarValue(value);
    saveProfileAvatar(user.id, value);
    setUser(nextUser);
    writeSessionCache(nextUser);
    setMessage(t({ en: "Avatar updated on this device.", zh: "头像已在此装置更新。" }));
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

  async function changePassword() {
    setPasswordError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user.email) {
      setPasswordError(t({ en: "Your secure session is not available. Please login again.", zh: "安全登录状态无效，请重新登录。" }));
      return;
    }
    if (!passwordForm.current) {
      setPasswordError(t({ en: "Please enter your current password.", zh: "请输入当前密码。" }));
      return;
    }
    if (passwordForm.next.length < 6) {
      setPasswordError(t({ en: "New password must be at least 6 characters.", zh: "新密码至少需要 6 个字符。" }));
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError(t({ en: "New password and confirmation do not match.", zh: "新密码和确认密码不一致。" }));
      return;
    }
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwordForm.current });
    if (reauthError) {
      setPasswordError(t({ en: "Current password is incorrect.", zh: "当前密码不正确。" }));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next });
    if (error) {
      setPasswordError(t({ en: "Password could not be changed. Please try again.", zh: "无法更改密码，请重试。" }));
      return;
    }
    setPasswordForm({ current: "", next: "", confirm: "" });
    setMessage(t({ en: "Password changed successfully.", zh: "密码已成功更改。" }));
  }

  async function logout() {
    await signOutAuth();
    window.location.href = "/";
  }

  function toggleQuickMenu(menu: "pets" | "contact") {
    setQuickMenu((current) => (current === menu ? null : menu));
  }

  function editPet(petId: string) {
    window.location.href = `/pets?petId=${encodeURIComponent(petId)}`;
  }

  const avatarSrc = avatarToImageSrc(avatarValue);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="account-page">
          <h1 className="page-title">{t({ en: "My Account", zh: "我的账号" })}</h1>
          {message ? <div className="mt-4 rounded-[16px] bg-[#eef5eb] p-3 text-sm font-black text-villa-accent-green">{message}</div> : null}
          {profileError ? <div className="mt-4 rounded-[16px] bg-red-50 p-3 text-sm font-black text-red-600">{profileError}</div> : null}

          <div className="mt-5 grid gap-3">
            <section className="villa-card account-profile-card">
              <div className="account-profile-main">
                <div className="flex min-w-0 items-center gap-4">
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
                    <p className="m-0 mt-1 truncate text-xs font-bold text-villa-text-secondary">{user.email || "you@example.com"}</p>
                    <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{user.phone || "+60"}</p>
                    <button type="button" onClick={() => setAvatarOpen(true)} className="mt-2 text-xs font-black text-villa-primary">{t({ en: "Change Avatar", zh: "更换头像" })}</button>
                  </div>
                </div>
                <div className="account-profile-actions" aria-label={t({ en: "Account shortcuts", zh: "账号快捷功能" })}>
                  <button type="button" className="account-quick-button" data-tone="pets" onClick={() => toggleQuickMenu("pets")} aria-expanded={quickMenu === "pets"}>
                    <span><img src="/avatars/dog-poodle.png" alt="" /></span>
                    <strong>{t({ en: "My Pets", zh: "我的宠物" })}</strong>
                  </button>
                  <a className="account-quick-button" data-tone="orders" href="/orders">
                    <span className="account-quick-icon" data-icon="orders">
                      <svg viewBox="0 0 48 48" aria-hidden="true">
                        <rect x="12" y="8" width="24" height="32" rx="8" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.6" />
                        <path d="M18 19h12M18 27h10" stroke="#8d65da" strokeWidth="2.8" strokeLinecap="round" />
                        <circle cx="34" cy="34" r="8" fill="#ffc45b" />
                        <path d="m30 34 3 3 6-7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <strong>{t({ en: "My Order", zh: "我的订单" })}</strong>
                  </a>
                  <button type="button" className="account-quick-button" data-tone="contact" onClick={() => toggleQuickMenu("contact")} aria-expanded={quickMenu === "contact"}>
                    <span className="account-quick-icon" data-icon="contact">
                      <svg viewBox="0 0 48 48" aria-hidden="true">
                        <rect x="9" y="11" width="30" height="24" rx="10" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.6" />
                        <path d="M18 21h12M18 27h7" stroke="#8d65da" strokeWidth="2.8" strokeLinecap="round" />
                        <path d="M18 35 13 41v-9" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.6" strokeLinejoin="round" />
                        <circle cx="36" cy="14" r="7" fill="#65d081" />
                        <path d="M32.5 14.5 35 17l5-6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <strong>{t({ en: "Contact Us", zh: "联系我们" })}</strong>
                  </button>
                </div>
              </div>
              {quickMenu === "pets" ? (
                <div className="account-quick-panel">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm font-black text-villa-text-primary">{t({ en: "Saved pets", zh: "已添加宠物" })}</strong>
                    <a href="/pets?mode=add" className="account-pet-edit">{t({ en: "Add Pet", zh: "新增宠物" })}</a>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {pets.length ? pets.map((pet) => (
                      <div key={pet.id} className="account-pet-row">
                        <img src={dogAvatarSrc(pet.photoDataUrl)} alt="" />
                        <span className="min-w-0 flex-1">
                          <strong>{pet.name || t({ en: "Unnamed pet", zh: "未命名宠物" })}</strong>
                          <small>{pet.breed || t({ en: "Breed not set", zh: "未填写品种" })}</small>
                        </span>
                        <button type="button" className="account-pet-edit" onClick={() => editPet(pet.id)}>{t({ en: "Edit", zh: "编辑" })}</button>
                      </div>
                    )) : (
                      <div className="account-pet-row">
                        <span className="account-social-logo" data-brand="pets">PV</span>
                        <span className="min-w-0 flex-1">
                          <strong>{t({ en: "No pets yet", zh: "还没有宠物资料" })}</strong>
                          <small>{t({ en: "Add your first pet before booking.", zh: "预约前请先添加宠物。" })}</small>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {quickMenu === "contact" ? (
                <div className="account-quick-panel">
                  <strong className="text-sm font-black text-villa-text-primary">{t({ en: "Choose a contact channel", zh: "选择联系方式" })}</strong>
                  <div className="mt-3 grid gap-2">
                    {contactLinks.map((item) => (
                      <a key={item.brand} href={item.href} target="_blank" rel="noreferrer" className="account-social-row">
                        <span className="account-social-logo" data-brand={item.brand}>{item.brand === "whatsapp" ? "WA" : item.brand === "instagram" ? "IG" : "RED"}</span>
                        <strong>{item.label}</strong>
                        <span>›</span>
                      </a>
                    ))}
                  </div>
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
                    <input className="villa-input opacity-75" value={user.email || ""} readOnly disabled placeholder="you@example.com" />
                    <span className="text-[11px] font-bold text-villa-text-muted">{t({ en: "Your email is your login identity. Contact Pet Villa if it needs to be changed.", zh: "邮箱是登录身份，如需更改请联系 Pet Villa。" })}</span>
                  </label>
                  <button type="button" disabled={profileSaving} className="villa-button w-full disabled:opacity-60" onClick={() => void saveProfile()}>{profileSaving ? t({ en: "Saving...", zh: "保存中..." }) : t({ en: "Save Profile", zh: "保存资料" })}</button>
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
                  <input className="villa-input" type="password" value={passwordForm.current} onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))} placeholder={t({ en: "Current password", zh: "当前密码" })} />
                  <input className="villa-input" type="password" value={passwordForm.next} onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))} placeholder={t({ en: "New password", zh: "新密码" })} />
                  <input className="villa-input" type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} placeholder={t({ en: "Confirm new password", zh: "确认新密码" })} />
                  {passwordError ? <p className="m-0 rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-600">{passwordError}</p> : null}
                  <button type="button" className="villa-button-outline w-full" onClick={() => void changePassword()}>{t({ en: "Change Password", zh: "更改密码" })}</button>
                </div>
              ) : null}
            </section>

            <section className="villa-card">
              <h2 className="card-title">{t({ en: "Verification", zh: "验证状态" })}</h2>
              <div className="mt-3 grid gap-2 text-sm font-black">
                {[
                  { key: "phone", label: t({ en: "Contact Number", zh: "联系电话" }), value: user.phone || "+60", status: t({ en: "Contact only", zh: "仅用于联系" }), verified: false },
                  { key: "email", label: t({ en: "Email", zh: "邮箱" }), value: user.email || "you@example.com", status: user.emailVerified ? t({ en: "Verified", zh: "已验证" }) : t({ en: "Not verified", zh: "未验证" }), verified: Boolean(user.emailVerified) }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-[16px] bg-villa-primary-bg p-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-villa-text-primary">{item.label}</span>
                      <span className="mt-1 block truncate text-xs font-bold text-villa-text-secondary">{item.value}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${item.verified ? "bg-[#eef5eb] text-villa-accent-green" : "bg-white text-villa-text-secondary"}`}>{item.status}</span>
                  </div>
                ))}
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
                <a className="villa-button w-full" href="https://wa.me/601163830339" target="_blank" rel="noreferrer">{t({ en: "WhatsApp Pet Villa", zh: "WhatsApp Pet Villa" })}</a>
                <a className="villa-button-outline w-full" href="tel:+601163830339">{t({ en: "Call Pet Villa", zh: "致电 Pet Villa" })}</a>
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
              <h3 className="mt-5 text-sm font-black text-villa-text-primary">{t({ en: "Choose Your Avatar", zh: "选择您的头像" })}</h3>
              <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{t({ en: "Pick a Pet Villa character that feels like you.", zh: "选择一个符合您风格的 Pet Villa 人物头像。" })}</p>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {avatarOptions.map((option) => (
                  <button key={option.id} type="button" onClick={() => saveAvatar(`system:${option.id}`)} className="profile-avatar-choice" data-active={avatarValue === `system:${option.id}`}>
                    <img src={avatarToImageSrc(`system:${option.id}`)} alt={t({ en: option.en, zh: option.zh })} />
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
