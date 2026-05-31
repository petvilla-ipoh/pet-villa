"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { createEmptyPet, readPetProfiles, type PetProfile, upsertPetProfile } from "../lib/petProfiles";

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

function DogAvatar({ pet }: { pet: PetProfile }) {
  if (pet.photoDataUrl) {
    return <img src={pet.photoDataUrl} alt="" className="h-16 w-16 shrink-0 rounded-[18px] object-cover shadow-[0_8px_20px_rgba(61,31,13,0.08)]" />;
  }

  return (
    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-villa-primary-bg shadow-[0_8px_20px_rgba(61,31,13,0.08)]">
      <svg viewBox="0 0 72 72" className="h-full w-full" aria-hidden="true">
        <circle cx="36" cy="37" r="22" fill="#d99a62" />
        <path d="M17 34c-8 2-11 12-8 20 3 7 12 8 17 1M55 34c8 2 11 12 8 20-3 7-12 8-17 1" fill="#bd7844" />
        <circle cx="28" cy="38" r="3" fill="#3d1f0d" />
        <circle cx="44" cy="38" r="3" fill="#3d1f0d" />
        <ellipse cx="36" cy="47" rx="6" ry="4" fill="#3d1f0d" />
        <path d="M30 54c4 4 8 4 12 0" fill="none" stroke="#3d1f0d" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
  );
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
    <section className="rounded-[20px] border border-villa-primary-light bg-white/88 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
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
  const [error, setError] = useState("");

  useEffect(() => {
    const storedPets = readPetProfiles();
    setPets(storedPets);
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
    function syncPets() {
      setPets(readPetProfiles());
    }
    window.addEventListener("pet-villa-pets", syncPets);
    return () => window.removeEventListener("pet-villa-pets", syncPets);
  }, []);

  function update<K extends keyof PetProfile>(key: K, value: PetProfile[K]) {
    setFormPet((current) => ({ ...current, [key]: value }));
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

  function savePet() {
    if (!formPet.name.trim() || !formPet.breed.trim() || !formPet.weight.trim()) {
      setError(t({ en: "Please fill in name, breed, and weight before saving.", zh: "保存前请填写名字、品种和体重。" }));
      setOpenSection("basic");
      return;
    }
    const next = upsertPetProfile({ ...formPet });
    setPets(next);
    setMode("list");
    setError("");
    window.history.replaceState(null, "", "/pets");
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

  if (mode === "form") {
    return (
      <ProtectedPage>
        <OwnerSidebar>
          <section className="p-4 lg:p-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button type="button" className="text-sm font-black text-villa-text-primary" onClick={() => { setMode("list"); window.history.replaceState(null, "", "/pets"); }}>
                ‹ {t({ en: "Back", zh: "返回" })}
              </button>
              <h1 className="text-center text-base font-black text-villa-text-primary">{formPet.name ? t({ en: "Edit Pet Profile", zh: "编辑宠物资料" }) : t({ en: "Add Pet Profile", zh: "新增宠物资料" })}</h1>
              <span className="w-10" />
            </div>

            {error ? <div className="mb-3 rounded-[16px] bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

            <form key={formPet.id} className="grid gap-3" onSubmit={(event) => { event.preventDefault(); savePet(); }}>
              <AccordionSection title={t({ en: "Basic Details", zh: "基本资料" })} open={openSection === "basic"} onToggle={() => setOpenSection(openSection === "basic" ? null : "basic")}>
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
                    <input className="villa-input" value={formPet.age} onChange={(event) => update("age", event.target.value)} placeholder="3 years" />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Weight", zh: "体重" })}</span>
                    <input className="villa-input" value={formPet.weight} onChange={(event) => update("weight", event.target.value)} placeholder="6.2kg" />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Gender", zh: "性别" })}</span>
                    <input className="villa-input" value={formPet.gender} onChange={(event) => update("gender", event.target.value)} placeholder="Female" />
                  </label>
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Coat color", zh: "毛色" })}</span>
                    <input className="villa-input" value={formPet.coatColor} onChange={(event) => update("coatColor", event.target.value)} placeholder="Cream" />
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
                  {formPet.photoDataUrl ? <img src={formPet.photoDataUrl} alt="" className="h-28 w-28 rounded-[18px] object-cover" /> : t({ en: "Upload pet photo", zh: "上传宠物照片" })}
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
                </label>
              </AccordionSection>

              <button type="submit" className="villa-button mt-2 w-full sm:w-fit sm:px-8">{t({ en: "Save Pet Profile", zh: "保存宠物档案" })}</button>
            </form>
          </section>
        </OwnerSidebar>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <h1 className="page-title">{t({ en: "My Pets", zh: "我的宠物" })}</h1>
              <PawIcon className="h-7 w-7" />
            </div>
            <p className="body-copy mt-1">{t({ en: "Your dogs staying with Pet Villa", zh: "管理入住 Pet Villa 的狗狗资料" })}</p>
          </div>

          {pets.length === 0 ? (
            <div className="rounded-[24px] border border-villa-primary-light bg-white/88 p-6 text-center shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-villa-primary-bg"><PawIcon className="h-8 w-8" /></div>
              <h2 className="card-title mt-4">{t({ en: "No pets yet", zh: "还没有宠物资料" })}</h2>
              <p className="body-copy mt-2">{t({ en: "Add your dog profile before booking", zh: "预约前请先添加狗狗资料" })}</p>
              <button type="button" className="villa-button mt-5 w-full sm:w-fit sm:px-8" onClick={addPet}>{t({ en: "Add New Pet", zh: "新增宠物" })}</button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pets.map((pet) => (
                <article key={pet.id} className="flex items-center gap-3 rounded-[20px] border border-villa-primary-light bg-white/88 p-3 text-left shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
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
                  <button type="button" className="self-start whitespace-nowrap text-xs font-black text-villa-primary" onClick={() => editPet(pet)}>
                    {t({ en: "Edit", zh: "编辑" })} →
                  </button>
                </article>
              ))}

              <button type="button" onClick={addPet} className="flex min-h-[118px] items-center gap-3 rounded-[20px] border-2 border-dashed border-villa-primary-light bg-white/55 p-4 text-left shadow-[0_4px_16px_rgba(61,31,13,0.05)]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-villa-primary-bg">
                  <PawIcon className="h-7 w-7" />
                </span>
                <span>
                  <span className="block text-base font-black text-villa-text-primary">{t({ en: "Add New Pet", zh: "新增宠物" })}</span>
                  <span className="mt-1 block text-xs font-bold leading-relaxed text-villa-text-secondary">{t({ en: "Add your dog's profile before booking.", zh: "预约前先添加狗狗资料。" })}</span>
                </span>
              </button>
            </div>
          )}
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
