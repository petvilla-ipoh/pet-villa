"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { createEmptyPet, deletePetProfile, dogAvatarOptions, dogAvatarSrc, loadPetProfiles, savePetProfile, type PetProfile } from "../lib/petProfiles";
import { loadOrders, readOrders } from "../lib/orderFlow";

function PawIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <ellipse cx="24" cy="31" rx="9" ry="7" fill="#e8927c" />
      <ellipse cx="13" cy="21" rx="4" ry="5.5" fill="#e8927c" />
      <ellipse cx="20" cy="14" rx="4" ry="5.5" fill="#e8927c" />
      <ellipse cx="28" cy="14" rx="4" ry="5.5" fill="#e8927c" />
      <ellipse cx="35" cy="21" rx="4" ry="5.5" fill="#e8927c" />
    </svg>
  );
}

function VaccineIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M14 10h20l3 14c1.5 7.1-3.2 14.2-13 18-9.8-3.8-14.5-10.9-13-18l3-14Z" fill="#ffffff" />
      <path d="M15 10h18.5l2.8 13.8c1.3 6.4-3 12.9-12.3 16.4-9.3-3.5-13.6-10-12.3-16.4L15 10Z" fill="#e9f9e7" stroke="#7fbc8b" strokeWidth="2.4" />
      <path d="m18.5 25.2 4.2 4.2 8.6-10" fill="none" stroke="#e8927c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReadyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="9" y="11" width="30" height="29" rx="9" fill="#fff4df" stroke="#d9ad46" strokeWidth="2.4" />
      <path d="M16 8v7M32 8v7M11 20h26" stroke="#d9ad46" strokeWidth="3" strokeLinecap="round" />
      <path d="m18 30 4 4 8-9" fill="none" stroke="#8d65da" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DogAvatar({ pet }: { pet: PetProfile }) {
  return <img src={dogAvatarSrc(pet.photoDataUrl)} alt="" className="h-16 w-16 shrink-0 rounded-[18px] object-cover shadow-[0_8px_20px_rgba(61,31,13,0.08)]" />;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 transition ${open ? "rotate-180" : ""}`} aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToggleCheck({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] items-center justify-between rounded-[14px] border px-3 text-sm font-black transition ${
        checked ? "border-villa-primary bg-villa-primary-bg text-villa-text-primary" : "border-villa-primary-light bg-white text-villa-text-secondary"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`grid h-5 w-5 place-items-center rounded-[6px] border ${checked ? "border-villa-primary bg-villa-primary text-white" : "border-villa-primary-light bg-white"}`}>
          {checked ? (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        {label}
      </span>
    </button>
  );
}

function AccordionSection({
  title,
  open,
  onToggle,
  children
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-villa-primary-light bg-white/90 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
      <button type="button" onClick={onToggle} className="flex min-h-[58px] w-full items-center justify-between px-4 text-left">
        <h2 className="text-[16px] font-black text-villa-text-primary">{title}</h2>
        <Chevron open={open} />
      </button>
      {open ? <div className="border-t border-villa-primary-light/70 p-4">{children}</div> : null}
    </section>
  );
}

export default function PetsPage() {
  const { t } = useLanguage();
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [formPet, setFormPet] = useState<PetProfile>(createEmptyPet());
  const [openSection, setOpenSection] = useState<"basic" | "food" | "photo" | null>("basic");
  const [orderCount, setOrderCount] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasLoadedPets, setHasLoadedPets] = useState(false);
  const [refreshingPets, setRefreshingPets] = useState(false);

  useEffect(() => {
    document.body.dataset.petVillaSurface = "pets";
    return () => {
      delete document.body.dataset.petVillaSurface;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let hasLoadedOnce = false;
    async function syncPets() {
      if (hasLoadedOnce) setRefreshingPets(true);
      try {
        const storedPets = await loadPetProfiles();
        if (!active) return;
        setPets(storedPets);
        hasLoadedOnce = true;
        setHasLoadedPets(true);
        setError("");
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") === "add") {
          setFormPet(createEmptyPet());
          setMode("form");
          setOpenSection("basic");
        } else if (params.get("petId")) {
          const pet = storedPets.find((item) => item.id === params.get("petId"));
          if (pet) {
            setFormPet({ ...pet });
            setMode("form");
            setOpenSection("basic");
          }
        }
      } catch (loadError) {
        if (!active) return;
        setError(hasLoadedOnce
          ? t({ en: "Unable to refresh — showing last known pets.", zh: "暂时无法刷新，正在显示上次同步的宠物资料。" })
          : loadError instanceof Error ? loadError.message : t({ en: "Your pets could not be loaded.", zh: "无法读取您的宠物资料。" }));
      } finally {
        if (active) setRefreshingPets(false);
      }
    }
    function handlePetsChanged() {
      void syncPets();
    }
    void syncPets();
    const syncOrders = () => {
      const activeOrders = readOrders().filter((order) => order.status !== "cancelled").length;
      setOrderCount(activeOrders);
      void loadOrders()
        .then((orders) => {
          if (active) setOrderCount(orders.filter((order) => order.status !== "cancelled").length);
        })
        .catch(() => undefined);
    };
    function handleVisibleRefresh() {
      if (document.visibilityState === "visible") void syncPets();
    }
    syncOrders();
    window.addEventListener("pet-villa-pets", handlePetsChanged);
    window.addEventListener("pet-villa-orders", syncOrders);
    window.addEventListener("focus", handleVisibleRefresh);
    document.addEventListener("visibilitychange", handleVisibleRefresh);
    return () => {
      active = false;
      window.removeEventListener("pet-villa-pets", handlePetsChanged);
      window.removeEventListener("pet-villa-orders", syncOrders);
      window.removeEventListener("focus", handleVisibleRefresh);
      document.removeEventListener("visibilitychange", handleVisibleRefresh);
    };
  }, []);

  function update<K extends keyof PetProfile>(key: K, value: PetProfile[K]) {
    setFormPet((current) => ({ ...current, [key]: value }));
  }

  function selectDogAvatar(src: string, breed?: string) {
    setFormPet((current) => ({
      ...current,
      photoDataUrl: src,
      breed: current.breed.trim() || breed || current.breed
    }));
  }

  function addPet() {
    setFormPet(createEmptyPet());
    setOpenSection("basic");
    setError("");
    setMode("form");
    window.history.replaceState(null, "", "/pets?mode=add");
  }

  function editPet(pet: PetProfile) {
    setFormPet({ ...pet });
    setOpenSection("basic");
    setError("");
    setMode("form");
    window.history.replaceState(null, "", `/pets?petId=${pet.id}`);
  }

  async function savePet() {
    if (!formPet.name.trim() || !formPet.breed.trim()) {
      setError(t({ en: "Please fill in name and breed before saving.", zh: "保存前请填写名字和品种。" }));
      setOpenSection("basic");
      return;
    }
    const normalizedWeight = formPet.weight.trim()
      ? `${formPet.weight.replace(/kg/gi, "").trim()}kg`
      : "";
    setSaving(true);
    try {
      const next = await savePetProfile({ ...formPet, weight: normalizedWeight });
      setPets(next);
      setMode("list");
      setError("");
      window.history.replaceState(null, "", "/pets");
    } catch {
      setError(t({ en: "Could not save pet profile. Please try again.", zh: "无法保存宠物资料，请重试。" }));
    } finally {
      setSaving(false);
    }
  }

  async function deletePet() {
    if (!window.confirm(t({ en: "Delete this pet profile?", zh: "确定要删除这份宠物资料？" }))) return;
    setSaving(true);
    try {
      const next = await deletePetProfile(formPet.id);
      setPets(next);
      setMode("list");
      setError("");
      window.history.replaceState(null, "", "/pets");
    } catch {
      setError(t({ en: "Could not delete pet profile. Please try again.", zh: "无法删除宠物资料，请重试。" }));
    } finally {
      setSaving(false);
    }
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update("photoDataUrl", String(reader.result || ""));
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  const vaccinatedCount = pets.filter((pet) => pet.vaccinated).length;
  if (mode === "form") {
    return (
      <ProtectedPage>
        <OwnerSidebar>
          <section className="pets-page">
            <div className="pets-editor-top">
              <button type="button" className="pets-back-button" onClick={() => { setMode("list"); window.history.replaceState(null, "", "/pets"); }}>
                ‹ {t({ en: "Back", zh: "返回" })}
              </button>
              <h1 className="text-center text-base font-black text-villa-text-primary">{formPet.name ? t({ en: "Edit Pet Profile", zh: "编辑宠物资料" }) : t({ en: "Add Pet Profile", zh: "新增宠物资料" })}</h1>
              <span className="w-10" />
            </div>

            <header className="pets-form-hero">
              <div className="pets-form-avatar">
                <img src={dogAvatarSrc(formPet.photoDataUrl)} alt="" />
              </div>
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-black uppercase text-[#8d65da]">{t({ en: "Pet Villa Profile", zh: "Pet Villa 档案" })}</p>
                <h2 className="m-0 mt-1 font-title text-[26px] font-black leading-tight text-villa-text-primary">{formPet.name || t({ en: "New Pet", zh: "新宠物" })}</h2>
                <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{t({ en: "Small pets 1-12kg · safer booking details", zh: "小型宠物 1-12kg · 预约资料更清楚" })}</p>
              </div>
            </header>

            {error ? <div className="pets-error-card">{error}</div> : null}

            <form key={formPet.id} className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void savePet(); }}>
              <AccordionSection title={t({ en: "Basic Details", zh: "基本资料" })} open={openSection === "basic"} onToggle={() => setOpenSection(openSection === "basic" ? null : "basic")}>
                <div className="pet-avatar-picker mb-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <span className="villa-label">{t({ en: "Choose pet avatar", zh: "选择宠物头像" })}</span>
                      <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">{t({ en: "Pick the closest look, or upload a real photo below.", zh: "选择最接近的外观，也可以在下方上传真实照片。" })}</p>
                    </div>
                    <span className="pet-avatar-hint">{t({ en: "Tap to select", zh: "点击选择" })}</span>
                  </div>
                  <div className="pet-dog-avatar-grid mt-3">
                    {dogAvatarOptions.map((option) => {
                      const src = `/avatars/${option.id}.png`;
                      const active = dogAvatarSrc(formPet.photoDataUrl) === src;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className="pet-dog-avatar-choice"
                          data-active={active}
                          onClick={() => selectDogAvatar(src, option.breed)}
                        >
                          <img src={src} alt={t({ en: option.en, zh: option.zh })} />
                          <span>{t({ en: option.en, zh: option.zh })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Name", zh: "名字" })}</span>
                    <input className="villa-input" value={formPet.name} onChange={(event) => update("name", event.target.value)} placeholder="Mochi" />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Breed", zh: "品种" })}</span>
                    <input className="villa-input" value={formPet.breed} onChange={(event) => update("breed", event.target.value)} placeholder="Toy Poodle" />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Age", zh: "年龄" })}</span>
                    <select className="villa-input" value={formPet.age} onChange={(event) => update("age", event.target.value)}>
                      <option value="">{t({ en: "Select age", zh: "选择年龄" })}</option>
                      {Array.from({ length: 31 }, (_, age) => (
                        <option key={age} value={age === 1 ? "1 year" : `${age} years`}>
                          {age === 1 ? t({ en: "1 year", zh: "1 岁" }) : t({ en: `${age} years`, zh: `${age} 岁` })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Weight (kg)", zh: "体重 (kg)" })}</span>
                    <div className="relative">
                      <input
                        className="villa-input pr-12"
                        type="number"
                        min="1"
                        max="12"
                        step="0.1"
                        value={formPet.weight.replace(/kg/gi, "")}
                        onChange={(event) => update("weight", event.target.value)}
                        placeholder="6.2"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-villa-text-muted">kg</span>
                    </div>
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Gender", zh: "性别" })}</span>
                    <select className="villa-input" value={formPet.gender} onChange={(event) => update("gender", event.target.value)}>
                      <option value="">{t({ en: "Select gender", zh: "选择性别" })}</option>
                      <option value="Female">{t({ en: "Female", zh: "母" })}</option>
                      <option value="Male">{t({ en: "Male", zh: "公" })}</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Coat color", zh: "毛色" })}</span>
                    <select className="villa-input" value={formPet.coatColor} onChange={(event) => update("coatColor", event.target.value)}>
                      <option value="">{t({ en: "Select coat color", zh: "选择毛色" })}</option>
                      {["Cream", "White", "Apricot", "Brown", "Black", "Grey", "Mixed"].map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ToggleCheck checked={formPet.vaccinated} label={t({ en: "Vaccinated", zh: "已接种疫苗" })} onClick={() => update("vaccinated", !formPet.vaccinated)} />
                  <ToggleCheck checked={formPet.neutered} label={t({ en: "Neutered", zh: "已绝育" })} onClick={() => update("neutered", !formPet.neutered)} />
                  <ToggleCheck checked={formPet.friendly} label={t({ en: "Friendly", zh: "亲人友善" })} onClick={() => update("friendly", !formPet.friendly)} />
                  <ToggleCheck checked={formPet.calm} label={t({ en: "Calm", zh: "性格稳定" })} onClick={() => update("calm", !formPet.calm)} />
                </div>
              </AccordionSection>

              <AccordionSection title={t({ en: "Food & Care", zh: "饮食护理" })} open={openSection === "food"} onToggle={() => setOpenSection(openSection === "food" ? null : "food")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["foodBrand", "Food brand", "狗粮品牌"],
                    ["mealsPerDay", "Meals per day", "每日餐数"],
                    ["allergies", "Allergies", "过敏"],
                    ["medication", "Medication", "药物"]
                  ].map(([key, en, zh]) => (
                    <label key={key} className="grid gap-2">
                      <span className="villa-label">{t({ en, zh })}</span>
                      <input className="villa-input" value={String(formPet[key as keyof PetProfile] || "")} onChange={(event) => update(key as keyof PetProfile, event.target.value as never)} />
                    </label>
                  ))}
                  <label className="grid gap-2 sm:col-span-2">
                    <span className="villa-label">{t({ en: "Special notes", zh: "特别说明" })}</span>
                    <textarea className="villa-input h-24 py-3" value={formPet.specialNotes} onChange={(event) => update("specialNotes", event.target.value)} placeholder={t({ en: "Anything we should know before boarding?", zh: "寄宿前有什么需要我们注意？" })} />
                  </label>
                </div>
              </AccordionSection>

              <AccordionSection title={t({ en: "Photo Upload", zh: "照片上传" })} open={openSection === "photo"} onToggle={() => setOpenSection(openSection === "photo" ? null : "photo")}>
                <label className="grid min-h-[124px] cursor-pointer place-items-center rounded-[18px] border-2 border-dashed border-villa-primary-light bg-villa-primary-bg/45 p-4 text-center text-sm font-bold text-villa-text-secondary">
                  <span className="grid gap-2 justify-items-center">
                    <img src={dogAvatarSrc(formPet.photoDataUrl)} alt="" className="h-28 w-28 rounded-[24px] object-cover shadow-[0_12px_26px_rgba(61,31,13,0.10)]" />
                    <span>{t({ en: "Upload real pet photo", zh: "上传真实宠物照片" })}</span>
                  </span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
                </label>
              </AccordionSection>

              <div className="pets-save-dock">
                <button type="submit" disabled={saving} className="pets-primary-action disabled:opacity-60">{saving ? t({ en: "Saving...", zh: "保存中..." }) : t({ en: "Save Pet Profile", zh: "保存宠物档案" })}</button>
                {pets.some((pet) => pet.id === formPet.id) ? (
                  <button type="button" disabled={saving} onClick={() => void deletePet()} className="pets-delete-action disabled:opacity-60">
                    {t({ en: "Delete Pet", zh: "删除宠物" })}
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </OwnerSidebar>
      </ProtectedPage>
    );
  }

    return (
      <ProtectedPage>
        <OwnerSidebar>
        <section className="pets-page">
          <header className="pets-hero">
            <img src="/petvilla-pets-playground-banner.webp" alt="" className="pets-hero-art" />
            <div className="pets-hero-copy">
              <span className="pets-kicker">{t({ en: "Pet Profiles", zh: "宠物档案" })}</span>
              <h1>{t({ en: "My Pets", zh: "我的宠物" })}</h1>
              <p>{t({ en: "Add each pet here before booking.", zh: "预约前先在这里添加宠物资料。" })}</p>
            </div>
            <button type="button" className="pets-hero-action" onClick={addPet}>
              <span><PawIcon className="h-6 w-6" /></span>
              <span className="pets-hero-action-copy">
                <strong>{t({ en: "Add Pet", zh: "新增宠物" })}</strong>
                <small>{t({ en: "Tap here first", zh: "先点这里添加" })}</small>
              </span>
            </button>
          </header>

          <section className="pets-stats-grid" aria-label={t({ en: "Pet profile summary", zh: "宠物资料摘要" })}>
            <div className="pets-stat-card" data-tone="warm">
              <span><PawIcon className="h-6 w-6" /></span>
              <small>{t({ en: "Pets", zh: "宠物" })}</small>
              <strong>{hasLoadedPets ? pets.length : "—"}</strong>
            </div>
            <div className="pets-stat-card" data-tone="mint">
              <span><VaccineIcon className="h-7 w-7" /></span>
              <small>{t({ en: "Vaccinated", zh: "已接种" })}</small>
              <strong>{hasLoadedPets ? vaccinatedCount : "—"}</strong>
            </div>
            <a className="pets-stat-card" data-tone="lavender" href="/orders" aria-label={t({ en: "View orders", zh: "查看订单" })}>
              <span><ReadyIcon className="h-7 w-7" /></span>
              <small>{t({ en: "Orders", zh: "订单" })}</small>
              <strong>{orderCount}</strong>
            </a>
          </section>

          <span className="sr-only" aria-live="polite">{refreshingPets ? t({ en: "Refreshing pets", zh: "正在同步宠物资料" }) : ""}</span>
          {error ? <div className="pets-error-card">{error}</div> : null}

          {!hasLoadedPets && !error ? (
            <div className="pets-empty-card" aria-busy="true">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-white shadow-[inset_0_-6px_12px_rgba(183,142,255,0.10),0_10px_18px_rgba(61,31,13,0.10)]"><PawIcon className="h-8 w-8" /></div>
              <h2 className="card-title mt-4">{t({ en: "Loading your pets", zh: "正在读取宠物资料" })}</h2>
              <p className="body-copy mt-2">{t({ en: "Securely syncing profiles from your account.", zh: "正在安全同步您的宠物档案。" })}</p>
            </div>
          ) : null}

          {hasLoadedPets && pets.length === 0 ? (
            <div className="pets-empty-card">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-white shadow-[inset_0_-6px_12px_rgba(183,142,255,0.10),0_10px_18px_rgba(61,31,13,0.10)]"><PawIcon className="h-8 w-8" /></div>
              <h2 className="card-title mt-4">{t({ en: "No pets yet", zh: "还没有宠物资料" })}</h2>
              <p className="body-copy mt-2">{t({ en: "Add your pet profile before booking", zh: "预约前请先添加宠物资料" })}</p>
              <p className="pets-empty-hint">{t({ en: "Start by tapping the button below.", zh: "请按下面按钮开始添加。" })}</p>
              <button type="button" className="pets-primary-action mt-5" onClick={addPet}>{t({ en: "Add New Pet", zh: "新增宠物" })}</button>
            </div>
          ) : (
            <div className="pets-card-grid">
              {pets.map((pet) => (
                <article key={pet.id} className="pets-profile-card">
                  <DogAvatar pet={pet} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-title text-[20px] font-black leading-tight text-villa-text-primary">{pet.name}</h2>
                    <p className="mt-1 text-sm font-bold text-villa-text-secondary">{pet.breed || t({ en: "Breed not set", zh: "未填写品种" })}</p>
                    <p className="text-sm font-bold text-villa-text-secondary">{pet.weight || t({ en: "Weight not set", zh: "未填写体重" })}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pet.vaccinated ? <span className="rounded-full bg-[#eef5eb] px-2 py-1 text-[11px] font-black text-villa-accent-green">✓ {t({ en: "Vaccinated", zh: "已接种" })}</span> : null}
                      {pet.friendly ? <span className="rounded-full bg-villa-primary-bg px-2 py-1 text-[11px] font-black text-villa-primary">✓ {t({ en: "Friendly", zh: "友善" })}</span> : null}
                      {pet.calm ? <span className="rounded-full bg-villa-primary-bg px-2 py-1 text-[11px] font-black text-villa-primary">✓ {t({ en: "Calm", zh: "稳定" })}</span> : null}
                    </div>
                  </div>
                  <button type="button" className="pets-edit-button" onClick={() => editPet(pet)}>
                    {t({ en: "Edit", zh: "编辑" })} →
                  </button>
                </article>
              ))}

              <button type="button" onClick={addPet} className="pets-add-card">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-villa-primary-bg">
                  <PawIcon className="h-7 w-7" />
                </span>
                <span>
                  <span className="block text-base font-black text-villa-text-primary">{t({ en: "Add New Pet", zh: "新增宠物" })}</span>
                  <span className="mt-1 block text-xs font-bold leading-relaxed text-villa-text-secondary">{t({ en: "Add your pet profile before booking.", zh: "预约前先添加宠物资料。" })}</span>
                </span>
                <span className="pets-add-card-cta">{t({ en: "Tap to add", zh: "点击添加" })}</span>
              </button>
            </div>
          )}
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
