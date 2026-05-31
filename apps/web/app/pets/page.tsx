"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

const pets = [
  { name: "Mochi", breed: "Toy Poodle", weight: "6.2kg", tone: "apricot", traits: ["Vaccinated", "Friendly"] },
  { name: "Boba", breed: "Maltese", weight: "4.8kg", tone: "cream", traits: ["Vaccinated", "Calm"] },
  { name: "Luna", breed: "Maltese", weight: "3.9kg", tone: "soft", traits: ["Vaccinated", "Shy"] }
];

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

function DogAvatar({ tone }: { tone: string }) {
  const fur = tone === "apricot" ? "#d99a62" : tone === "cream" ? "#f7efe5" : "#f2e5d6";
  const ear = tone === "apricot" ? "#bd7844" : "#e7d7c7";

  return (
    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-villa-primary-bg shadow-[0_8px_20px_rgba(61,31,13,0.08)]">
      <svg viewBox="0 0 72 72" className="h-full w-full" aria-hidden="true">
        <circle cx="36" cy="37" r="22" fill={fur} />
        <path d="M17 34c-8 2-11 12-8 20 3 7 12 8 17 1M55 34c8 2 11 12 8 20-3 7-12 8-17 1" fill={ear} />
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
  const [selected, setSelected] = useState("Mochi");
  const [vaccinated, setVaccinated] = useState(true);
  const [neutered, setNeutered] = useState(false);
  const [openSection, setOpenSection] = useState<"basic" | "food" | "photo" | null>(null);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <h1 className="page-title">My Pets</h1>
              <PawIcon className="h-7 w-7" />
            </div>
            <p className="body-copy mt-1">Your dogs staying with Pet Villa</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {pets.map((pet) => {
              const active = selected === pet.name;
              return (
                <button
                  key={pet.name}
                  type="button"
                  onClick={() => setSelected(pet.name)}
                  className={`flex items-center gap-3 rounded-[20px] border p-3 text-left shadow-[0_4px_16px_rgba(61,31,13,0.08)] transition hover:-translate-y-px ${
                    active ? "border-villa-primary bg-villa-primary-bg" : "border-villa-primary-light bg-white/88"
                  }`}
                >
                  <DogAvatar tone={pet.tone} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-title text-[20px] font-black leading-tight text-villa-text-primary">{pet.name}</span>
                    <span className="mt-1 block text-sm font-bold text-villa-text-secondary">{pet.breed}</span>
                    <span className="block text-sm font-bold text-villa-text-secondary">{pet.weight}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {pet.traits.map((trait) => (
                        <span key={trait} className="rounded-full bg-[#eef5eb] px-2 py-1 text-[11px] font-black text-villa-accent-green">
                          ✓ {trait}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="self-start whitespace-nowrap text-xs font-black text-villa-primary">Edit →</span>
                </button>
              );
            })}

            <button type="button" className="flex min-h-[118px] items-center gap-3 rounded-[20px] border-2 border-dashed border-villa-primary-light bg-white/55 p-4 text-left shadow-[0_4px_16px_rgba(61,31,13,0.05)]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-villa-primary-bg">
                <PawIcon className="h-7 w-7" />
              </span>
              <span>
                <span className="block text-base font-black text-villa-text-primary">Add New Pet</span>
                <span className="mt-1 block text-xs font-bold leading-relaxed text-villa-text-secondary">Add your dog's profile before booking.</span>
              </span>
            </button>
          </div>

          <form className="mt-5 grid gap-3">
            <AccordionSection title="Basic Details" open={openSection === "basic"} onToggle={() => setOpenSection(openSection === "basic" ? null : "basic")}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Name", "Mochi"],
                  ["Breed", "Toy Poodle"],
                  ["Age", "3 years"],
                  ["Weight", "6.2kg"],
                  ["Gender", "Female"],
                  ["Coat color", "Cream"]
                ].map(([label, placeholder]) => (
                  <label key={label} className="grid gap-2">
                    <span className="villa-label">{label}</span>
                    <input className="villa-input" placeholder={placeholder} />
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <ToggleCheck checked={vaccinated} label="Vaccinated" onClick={() => setVaccinated(!vaccinated)} />
                <ToggleCheck checked={neutered} label="Neutered" onClick={() => setNeutered(!neutered)} />
              </div>
            </AccordionSection>

            <AccordionSection title="Food & Care" open={openSection === "food"} onToggle={() => setOpenSection(openSection === "food" ? null : "food")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Food brand", "Meals per day", "Allergies", "Medication"].map((label) => (
                  <label key={label} className="grid gap-2">
                    <span className="villa-label">{label}</span>
                    <input className="villa-input" />
                  </label>
                ))}
                <label className="grid gap-2 sm:col-span-2">
                  <span className="villa-label">Special notes</span>
                  <textarea className="villa-input h-24 py-3" placeholder="Anything we should know before boarding?" />
                </label>
              </div>
            </AccordionSection>

            <AccordionSection title="Photo Upload" open={openSection === "photo"} onToggle={() => setOpenSection(openSection === "photo" ? null : "photo")}>
              <div className="grid min-h-[124px] place-items-center rounded-[18px] border-2 border-dashed border-villa-primary-light bg-villa-primary-bg/45 text-center text-sm font-bold text-villa-text-secondary">
                Drop pet photos here or click to upload
              </div>
            </AccordionSection>

            <button type="button" className="villa-button mt-2 w-full sm:w-fit sm:px-8">{t({ en: "Save Pet Profile", zh: "保存宠物档案" })}</button>
          </form>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
