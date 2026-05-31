"use client";

import { useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

const days = Array.from({ length: 30 }, (_, index) => index + 1);
const fullDays = new Set([8, 14, 15, 22]);
const pets = [
  { id: "mochi", name: "Mochi", breed: "Toy Poodle", weight: "4.8kg", traits: ["Vaccinated", "Calm"], tone: "apricot" },
  { id: "boba", name: "Boba", breed: "Maltese", weight: "6.2kg", traits: ["Vaccinated", "Playful"], tone: "cream" },
  { id: "luna", name: "Luna", breed: "Maltese", weight: "3.9kg", traits: ["Vaccinated", "Shy"], tone: "soft" }
];
const timeOptions = ["9:00am", "10:00am", "11:00am", "12:00pm", "1:00pm", "2:00pm", "3:00pm", "4:00pm", "5:00pm", "6:00pm", "7:00pm", "8:00pm"];

function hourIndex(value: string) {
  return timeOptions.indexOf(value) + 9;
}

function ServiceIcon({ type }: { type: "overnight" | "daycare" }) {
  if (type === "overnight") {
    return (
      <svg viewBox="0 0 56 56" className="h-9 w-9" aria-hidden="true">
        <path d="M37 41A17 17 0 0 1 23 13a19 19 0 1 0 23 23 17 17 0 0 1-9 5Z" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
        <path d="M43 13v7M39.5 16.5h7" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 56 56" className="h-9 w-9" aria-hidden="true">
      <circle cx="28" cy="28" r="11" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
      <path d="M28 7v8M28 41v8M7 28h8M41 28h8M13 13l6 6M37 37l6 6M43 13l-6 6M19 37l-6 6" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 40 40" className="h-5 w-5" aria-hidden="true">
      <rect x="7" y="9" width="26" height="25" rx="5" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.5" />
      <path d="M7 17h26M14 6v7M26 6v7" stroke="#e8927c" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DogAvatar({ tone }: { tone: string }) {
  const fur = tone === "apricot" ? "#d99a62" : tone === "cream" ? "#f7efe5" : "#f2e5d6";
  const ear = tone === "apricot" ? "#bd7844" : "#e7d7c7";

  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-villa-primary-bg">
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

function CheckMark({ active }: { active: boolean }) {
  return (
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${active ? "border-villa-primary bg-villa-primary text-white" : "border-villa-primary-light bg-white text-transparent"}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function BookingPage() {
  const { t } = useLanguage();
  const [service, setService] = useState<"overnight" | "daycare">("overnight");
  const [selectedPets, setSelectedPets] = useState(["mochi"]);
  const [startDay, setStartDay] = useState(4);
  const [endDay, setEndDay] = useState(6);
  const [startTime, setStartTime] = useState("10:00am");
  const [endTime, setEndTime] = useState("2:00pm");

  const petCount = Math.max(1, selectedPets.length);
  const selectedPetNames = pets.filter((pet) => selectedPets.includes(pet.id)).map((pet) => pet.name);
  const daycareHours = Math.max(1, hourIndex(endTime) - hourIndex(startTime));
  const overnightNights = Math.max(1, endDay - startDay + 1);
  const unitTotal = service === "overnight" ? overnightNights * 40 : daycareHours * 5;
  const total = unitTotal * petCount;

  const dateLabel = useMemo(() => {
    if (service === "daycare") return `Jun ${startDay}, ${startTime} - ${endTime}`;
    return startDay === endDay ? `Jun ${startDay}` : `Jun ${startDay} - Jun ${endDay}`;
  }, [endDay, endTime, service, startDay, startTime]);

  function chooseDate(day: number) {
    if (fullDays.has(day)) return;
    if (service === "daycare") {
      setStartDay(day);
      setEndDay(day);
      return;
    }

    if (startDay === endDay) {
      if (day > startDay) {
        setEndDay(day);
      } else {
        setStartDay(day);
      }
      return;
    }

    if (day > endDay) {
      setEndDay(day);
      return;
    }

    if (day < startDay) {
      setStartDay(day);
      setEndDay(day);
    } else {
      setStartDay(day);
      setEndDay(day);
    }
  }

  function togglePet(id: string) {
    setSelectedPets((current) => {
      if (current.includes(id)) {
        return current.length === 1 ? current : current.filter((petId) => petId !== id);
      }
      return [...current, id];
    });
  }

  const steps = ["Service", "Date", "Pet", "Confirm"];
  const selectedPetSummary = selectedPetNames.join(", ");

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "Book a Stay", zh: "预约照顾" })}</h1>
          <p className="body-copy mt-1">{t({ en: "Choose service, dates, pets, and confirm the deposit amount.", zh: "选择服务、日期、宠物，并确认订金金额。" })}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="grid gap-4">
              <div className="rounded-[20px] border border-villa-primary-light bg-white/88 px-4 py-3 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
                <div className="grid grid-cols-4 items-start gap-1">
                  {steps.map((step, index) => (
                    <div key={step} className="relative grid justify-items-center gap-1 text-center">
                      {index > 0 ? <span className="absolute right-1/2 top-[10px] h-0.5 w-full bg-villa-primary-light/75" /> : null}
                      <span className={`relative z-10 grid h-5 w-5 place-items-center rounded-full border-2 ${index === 0 ? "border-villa-primary bg-villa-primary" : "border-villa-primary-light bg-white"}`}>
                        {index === 0 ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </span>
                      <span className={`text-[11px] font-black ${index === 0 ? "text-villa-primary" : "text-villa-text-muted"}`}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <section className="rounded-[20px] border border-villa-primary-light bg-white/88 p-4 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
                <h2 className="section-title">Choose Service</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "overnight" as const, title: "Overnight Boarding", price: "RM40/night", desc: "No cages · 24h Care" },
                    { id: "daycare" as const, title: "Daycare", price: "RM5/hour", desc: "9:00am – 8:00pm" }
                  ].map((item) => {
                    const active = service === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setService(item.id)}
                        className={`flex min-h-[104px] items-center gap-3 rounded-[18px] border p-3 text-left transition hover:-translate-y-px ${
                          active ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white shadow-sm"
                        }`}
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#fff0ec]">
                          <ServiceIcon type={item.id} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block font-title text-[18px] font-black leading-tight text-villa-text-primary">{item.title}</strong>
                          <span className="mt-1 block text-sm font-black text-villa-primary">{item.price}</span>
                          <span className="mt-0.5 block text-xs font-bold text-villa-text-secondary">{item.desc}</span>
                        </span>
                        <CheckMark active={active} />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[20px] border border-villa-primary-light bg-white/88 p-4 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
                <h2 className="section-title">Choose Date / Time</h2>
                <div className="mt-3 rounded-[14px] bg-villa-primary-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-sm font-black text-villa-text-primary">{dateLabel}</p>
                      <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">
                        {service === "overnight" ? `${overnightNights} Nights Selected · RM${unitTotal} / dog` : `${daycareHours} Hours Selected · RM${unitTotal} / dog`}
                      </p>
                    </div>
                    <div className="text-right text-lg font-black text-villa-primary">RM{unitTotal}</div>
                  </div>
                </div>

                {service === "daycare" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="villa-label">Start time</span>
                      <select className="villa-input" value={startTime} onChange={(event) => setStartTime(event.target.value)}>
                        {timeOptions.slice(0, -1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="villa-label">End time</span>
                      <select className="villa-input" value={endTime} onChange={(event) => setEndTime(event.target.value)}>
                        {timeOptions.slice(1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                  </div>
                ) : null}

                <div className="mt-3 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg/40 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <strong className="text-sm">June 2026</strong>
                    <span className="text-xs font-bold text-villa-text-muted">Full dates are disabled</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-villa-text-muted">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {days.map((day) => {
                      const disabled = fullDays.has(day);
                      const active = day >= startDay && day <= endDay;
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={disabled}
                          onClick={() => chooseDate(day)}
                          className={`min-h-[40px] rounded-[12px] border text-xs font-black transition ${
                            disabled
                              ? "cursor-not-allowed border-[#eaded7] bg-[#eee6e1] text-villa-text-muted"
                              : active
                                ? "border-villa-primary bg-villa-primary text-white shadow-sm"
                                : "border-villa-primary-light bg-white text-villa-text-secondary hover:border-villa-primary"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-villa-primary-light bg-white/88 p-4 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
                <h2 className="section-title">Choose Pets</h2>
                <p className="mt-1 text-xs font-bold text-villa-text-secondary">Select the dog(s) staying with us.</p>
                <div className="mt-3 grid gap-2">
                  {pets.map((pet) => {
                    const active = selectedPets.includes(pet.id);
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => togglePet(pet.id)}
                        className={`relative flex min-h-[86px] items-center gap-3 rounded-[18px] border p-3 text-left transition hover:-translate-y-px ${
                          active ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white shadow-sm"
                        }`}
                      >
                        <DogAvatar tone={pet.tone} />
                        <span className="min-w-0 flex-1">
                          <strong className="block font-title text-[18px] font-black leading-tight text-villa-text-primary">{pet.name}</strong>
                          <span className="mt-1 block text-xs font-bold text-villa-text-secondary">{pet.breed} · {pet.weight}</span>
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {pet.traits.map((trait) => (
                              <span key={trait} className="rounded-full bg-[#eef5eb] px-2 py-0.5 text-[10px] font-black text-villa-accent-green">
                                ✓ {trait}
                              </span>
                            ))}
                          </span>
                        </span>
                        <CheckMark active={active} />
                      </button>
                    );
                  })}
                </div>

                <label className="mt-3 grid gap-2">
                  <span className="villa-label">Special Request (Optional)</span>
                  <textarea className="villa-input h-16 py-3" placeholder="Tell us anything important for your dog's comfort." />
                </label>
              </section>
            </div>

            <aside className="h-fit rounded-[22px] border border-villa-primary-light bg-white/90 p-4 shadow-[0_8px_28px_rgba(61,31,13,0.10)] lg:sticky lg:top-24">
              <h2 className="section-title">Booking Summary</h2>
              <div className="mt-4 rounded-[18px] bg-villa-primary-bg/55 p-4">
                <div className="grid gap-3 text-sm font-black text-villa-text-primary">
                  <div className="flex items-center gap-3">
                    <ServiceIcon type={service} />
                    <span>{service === "overnight" ? "Overnight Boarding" : "Daycare"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon />
                    <span>{dateLabel}{service === "overnight" ? ` (${overnightNights} Nights)` : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DogAvatar tone="apricot" />
                    <span>{selectedPetSummary}</span>
                  </div>
                  <div className="text-xs font-bold text-villa-text-secondary">{petCount} {petCount === 1 ? "Dog" : "Dogs"}</div>
                </div>
              </div>

              <div className="my-4 h-px bg-villa-primary-light" />
              <div className="grid gap-3">
                <div className="flex items-end justify-between">
                  <span className="text-base font-black text-villa-text-primary">Total</span>
                  <span className="text-2xl font-black text-villa-text-primary">RM{total}</span>
                </div>
                <div className="flex justify-between text-sm font-black">
                  <span className="text-villa-text-secondary">Deposit Today (50%)</span>
                  <span className="text-villa-primary">RM{(total / 2).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-villa-text-secondary">
                  <span>Balance Later</span>
                  <span>RM{(total / 2).toFixed(0)}</span>
                </div>
              </div>
              <div className="my-4 h-px bg-villa-primary-light" />
              <a href="/payment" className="villa-button w-full">Continue to Payment</a>
              <p className="mt-3 text-center text-[11px] font-bold leading-relaxed text-villa-text-muted">Your booking is only confirmed after deposit payment.</p>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
