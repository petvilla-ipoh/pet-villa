"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { useLanguage } from "../components/LanguageProvider";

const pets = [
  { name: "Mochi", breed: "Toy Poodle", weight: "6.2kg", icon: "🐩" },
  { name: "Boba", breed: "Maltese", weight: "4.8kg", icon: "🐶" }
];

export default function PetsPage() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState("Mochi");
  const [vaccinated, setVaccinated] = useState(true);
  const [neutered, setNeutered] = useState(false);

  return (
    <OwnerSidebar>
      <section className="p-5 sm:p-8 lg:p-10">
        <div className="mb-8">
          <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">{t({ en: "Pet Profile", zh: "宠物档案" })}</span>
          <h1 className="mt-4 font-title text-5xl font-black">{t({ en: "Tell us about your small dog", zh: "填写狗狗资料" })}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {pets.map((pet) => (
            <button
              key={pet.name}
              type="button"
              onClick={() => setSelected(pet.name)}
              className={`rounded-villa border p-5 text-left shadow-villa transition ${selected === pet.name ? "border-villa-coral bg-villa-peach/40" : "border-villa-line bg-white/70"}`}
            >
              <div className="text-4xl">{pet.icon}</div>
              <h2 className="mt-3 font-title text-3xl font-black">{pet.name}</h2>
              <p className="m-0 font-bold text-villa-text/60">{pet.breed} · {pet.weight}</p>
            </button>
          ))}
          <button type="button" className="min-h-[170px] rounded-villa border-2 border-dashed border-villa-coral/60 bg-white/35 p-5 text-center font-black text-villa-text/60">
            + {t({ en: "Add another pet", zh: "添加宠物" })}
          </button>
        </div>

        <form className="mt-8 grid gap-6">
          <section className="villa-card p-6">
            <h2 className="font-title text-3xl font-black">{t({ en: "Basic Details", zh: "基本资料" })}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
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
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => setVaccinated(!vaccinated)} className={vaccinated ? "villa-button" : "villa-button-outline"}>
                {t({ en: "Vaccinated", zh: "已接种疫苗" })}
              </button>
              <button type="button" onClick={() => setNeutered(!neutered)} className={neutered ? "villa-button" : "villa-button-outline"}>
                {t({ en: "Neutered", zh: "已绝育" })}
              </button>
            </div>
          </section>

          <section className="villa-card p-6">
            <h2 className="font-title text-3xl font-black">{t({ en: "Food & Care", zh: "饮食护理" })}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
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
              <label className="grid gap-2 md:col-span-2">
                <span className="villa-label">{t({ en: "Special notes", zh: "特别说明" })}</span>
                <textarea className="villa-input min-h-[130px] py-4" />
              </label>
            </div>
          </section>

          <section className="villa-card p-6">
            <h2 className="font-title text-3xl font-black">{t({ en: "Photo Upload", zh: "照片上传" })}</h2>
            <div className="mt-5 grid min-h-[170px] place-items-center rounded-villa border-2 border-dashed border-villa-coral/50 bg-white/50 p-6 text-center font-black text-villa-text/55">
              {t({ en: "Drop pet photos here or click to upload", zh: "拖放宠物照片到这里，或点击上传" })}
            </div>
          </section>

          <button type="button" className="villa-button w-full sm:w-auto sm:px-10">{t({ en: "Save Pet Profile", zh: "保存宠物档案" })}</button>
        </form>
      </section>
    </OwnerSidebar>
  );
}
