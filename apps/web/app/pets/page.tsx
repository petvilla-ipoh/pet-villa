"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

const pets = [
  { name: "Mochi", breed: "Toy Poodle", weight: "6.2kg" },
  { name: "Boba", breed: "Maltese", weight: "4.8kg" }
];

export default function PetsPage() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState("Mochi");
  const [vaccinated, setVaccinated] = useState(true);
  const [neutered, setNeutered] = useState(false);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "Pet Profile", zh: "宠物档案" })}</h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {pets.map((pet) => (
              <button key={pet.name} type="button" onClick={() => setSelected(pet.name)} className={`villa-card text-left ${selected === pet.name ? "border-villa-primary bg-villa-primary-bg" : ""}`}>
                <div className="text-3xl">🐶</div>
                <h2 className="card-title mt-2">{pet.name}</h2>
                <p className="muted-copy m-0">{pet.breed} · {pet.weight}</p>
              </button>
            ))}
            <button type="button" className="min-h-[140px] rounded-[20px] border-2 border-dashed border-villa-primary-light bg-white/50 p-4 text-sm font-bold text-villa-text-secondary">
              + {t({ en: "Add Pet", zh: "添加宠物" })}
            </button>
          </div>

          <form className="mt-6 grid gap-6">
            <section className="villa-card">
              <h2 className="section-title">{t({ en: "Basic Details", zh: "基本资料" })}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Name", "名字", "Mochi"],
                  ["Breed", "品种", "Toy Poodle"],
                  ["Age", "年龄", "3 years"],
                  ["Weight", "体重", "6.2kg"],
                  ["Gender", "性别", "Female"],
                  ["Coat color", "毛色", "Cream"]
                ].map(([en, zh, placeholder]) => (
                  <label key={en} className="grid gap-2">
                    <span className="villa-label">{t({ en, zh })}</span>
                    <input className="villa-input" placeholder={placeholder} />
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:flex">
                <button type="button" onClick={() => setVaccinated(!vaccinated)} className={vaccinated ? "villa-button" : "villa-button-outline"}>{t({ en: "Vaccinated", zh: "已接种疫苗" })}</button>
                <button type="button" onClick={() => setNeutered(!neutered)} className={neutered ? "villa-button" : "villa-button-outline"}>{t({ en: "Neutered", zh: "已绝育" })}</button>
              </div>
            </section>

            <section className="villa-card">
              <h2 className="section-title">{t({ en: "Food & Care", zh: "饮食护理" })}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Food brand", "狗粮品牌"],
                  ["Meals per day", "喂食次数"],
                  ["Allergies", "过敏"],
                  ["Medication", "药物"]
                ].map(([en, zh]) => (
                  <label key={en} className="grid gap-2">
                    <span className="villa-label">{t({ en, zh })}</span>
                    <input className="villa-input" />
                  </label>
                ))}
                <label className="grid gap-2 sm:col-span-2">
                  <span className="villa-label">{t({ en: "Special notes", zh: "特别说明" })}</span>
                  <textarea className="villa-input h-32 py-3" />
                </label>
              </div>
            </section>

            <section className="villa-card">
              <h2 className="section-title">{t({ en: "Photo Upload", zh: "照片上传" })}</h2>
              <div className="mt-4 grid min-h-[150px] place-items-center rounded-[20px] border-2 border-dashed border-villa-primary-light bg-white/60 text-center text-sm font-bold text-villa-text-secondary">
                {t({ en: "Drop pet photos here or click to upload", zh: "拖放照片到这里，或点击上传" })}
              </div>
            </section>

            <button type="button" className="villa-button w-full sm:w-fit sm:px-8">{t({ en: "Save Pet Profile", zh: "保存宠物档案" })}</button>
          </form>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
