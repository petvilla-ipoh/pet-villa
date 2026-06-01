"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { readPetProfiles, type PetProfile } from "../lib/petProfiles";
import { saveBookingDraft } from "../lib/orderFlow";
import {
  availableSlotsForDate,
  buildCapacityMap,
  daysInclusive,
  firstCapacityIssue,
  formatDateRange,
  startOfLocalDay,
  toDateKey
} from "../lib/bookingCapacity";

const timeOptions = ["9:00am", "10:00am", "11:00am", "12:00pm", "1:00pm", "2:00pm", "3:00pm", "4:00pm", "5:00pm", "6:00pm", "7:00pm", "8:00pm"];

function hourIndex(value: string) {
  return timeOptions.indexOf(value) + 9;
}

function createLocalDate(year: number, month: number, day: number) {
  return new Date(year, month, day);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function monthCells(month: Date) {
  const first = createLocalDate(month.getFullYear(), month.getMonth(), 1);
  const blankCount = (first.getDay() + 6) % 7;
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: blankCount }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => createLocalDate(month.getFullYear(), month.getMonth(), index + 1))
  ];
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

function DogAvatar({ pet }: { pet?: PetProfile }) {
  if (pet?.photoDataUrl) {
    return <img src={pet.photoDataUrl} alt="" className="h-14 w-14 shrink-0 rounded-[16px] object-cover" />;
  }
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-villa-primary-bg">
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
  const today = startOfLocalDay(new Date());
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [service, setService] = useState<"overnight" | "daycare">("overnight");
  const [dateTouched, setDateTouched] = useState(false);
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => createLocalDate(today.getFullYear(), today.getMonth(), 1));
  const [startDate, setStartDate] = useState(() => createLocalDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [endDate, setEndDate] = useState(() => createLocalDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [startTime, setStartTime] = useState("10:00am");
  const [endTime, setEndTime] = useState("2:00pm");
  const [specialRequest, setSpecialRequest] = useState("");

  useEffect(() => {
    setPets(readPetProfiles());
    function syncPets() {
      const nextPets = readPetProfiles();
      setPets(nextPets);
      setSelectedPets((current) => current.filter((id) => nextPets.some((pet) => pet.id === id)));
    }
    window.addEventListener("pet-villa-pets", syncPets);
    return () => window.removeEventListener("pet-villa-pets", syncPets);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get("service");
    if (serviceParam === "daycare" || serviceParam === "overnight") {
      chooseService(serviceParam);
    }
  }, []);

  const selectedPetObjects = pets.filter((pet) => selectedPets.includes(pet.id));
  const petCount = Math.max(1, selectedPets.length);
  const selectedPetNames = selectedPetObjects.map((pet) => pet.name);
  const daycareHours = Math.max(1, hourIndex(endTime) - hourIndex(startTime));
  const overnightNights = daysInclusive(startDate, endDate);
  const unitTotal = service === "overnight" ? overnightNights * 40 : daycareHours * 5;
  const total = selectedPets.length > 0 ? unitTotal * petCount : 0;
  const capacityUsage = useMemo(() => buildCapacityMap(), [dateTouched, selectedPets.length]);
  const capacityIssue = selectedPets.length > 0 ? firstCapacityIssue(startDate, endDate, selectedPets.length, capacityUsage) : null;

  const dateLabel = useMemo(() => {
    if (service === "daycare") return `${formatDateRange(startDate, startDate)}, ${startTime} - ${endTime}`;
    return formatDateRange(startDate, endDate);
  }, [endDate, endTime, service, startDate, startTime]);

  const serviceCompleted = Boolean(service);
  const dateCompleted = serviceCompleted && dateTouched;
  const petCompleted = dateCompleted && selectedPets.length > 0;
  const confirmCompleted = petCompleted && total > 0 && !capacityIssue;
  const currentStep = !serviceCompleted ? 0 : !dateCompleted ? 1 : !petCompleted ? 2 : 3;

  function chooseService(nextService: "overnight" | "daycare") {
    setService(nextService);
    if (nextService === "daycare") setEndDate(startDate);
  }

  function chooseDate(date: Date) {
    if (date < today || availableSlotsForDate(date, capacityUsage) <= 0) return;
    setDateTouched(true);
    if (service === "daycare") {
      setStartDate(date);
      setEndDate(date);
      return;
    }
    if (toDateKey(startDate) === toDateKey(endDate)) {
      if (date > startDate) {
        setEndDate(date);
      } else {
        setStartDate(date);
      }
      return;
    }
    if (date > endDate) {
      setEndDate(date);
      return;
    }
    if (date < startDate) {
      setStartDate(date);
      setEndDate(date);
    } else {
      setStartDate(date);
      setEndDate(date);
    }
  }

  function togglePet(id: string) {
    setSelectedPets((current) => {
      if (current.includes(id)) {
        return current.filter((petId) => petId !== id);
      }
      return [...current, id];
    });
  }

  function stepState(index: number) {
    if (confirmCompleted || index < currentStep) return "done";
    if (index === currentStep) return "current";
    return "upcoming";
  }

  function saveDraftForPayment() {
    if (!confirmCompleted) return;
    saveBookingDraft({
      id: `draft-${Date.now()}`,
      service,
      serviceLabel: service === "overnight" ? "Overnight Boarding" : "Daycare",
      dateLabel,
      startDateISO: toDateKey(startDate),
      endDateISO: toDateKey(endDate),
      nights: service === "overnight" ? overnightNights : 0,
      hours: service === "daycare" ? daycareHours : 0,
      pets: selectedPetObjects.map((pet) => ({
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        weight: pet.weight,
        photoDataUrl: pet.photoDataUrl
      })),
      total,
      deposit: total / 2,
      balance: total / 2,
      specialRequest,
      createdAt: new Date().toISOString()
    });
    window.location.href = "/payment";
  }

  const steps = [
    t({ en: "Service", zh: "服务" }),
    t({ en: "Date", zh: "日期" }),
    t({ en: "Pet", zh: "宠物" }),
    t({ en: "Confirm", zh: "确认" })
  ];

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
                  {steps.map((step, index) => {
                    const state = stepState(index);
                    return (
                      <div key={step} className="relative grid justify-items-center gap-1 text-center">
                        {index > 0 ? <span className={`absolute right-1/2 top-[10px] h-0.5 w-full ${stepState(index - 1) === "done" ? "bg-villa-primary" : "bg-villa-primary-light/75"}`} /> : null}
                        <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] font-black ${
                          state === "upcoming" ? "border-villa-primary-light bg-white text-villa-text-muted" : "border-villa-primary bg-villa-primary text-white"
                        }`}>
                          {state === "done" ? "✓" : index + 1}
                        </span>
                        <span className={`text-[11px] font-black ${state === "upcoming" ? "text-villa-text-muted" : "text-villa-primary"}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <section className="rounded-[20px] border border-villa-primary-light bg-white/88 p-4 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
                <h2 className="section-title">{t({ en: "Choose Service", zh: "选择服务" })}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "overnight" as const, title: t({ en: "Overnight Boarding", zh: "过夜寄宿" }), price: "RM40/night", desc: t({ en: "No cages · 24h Care", zh: "不关笼 · 24小时照顾" }) },
                    { id: "daycare" as const, title: t({ en: "Daycare", zh: "日托" }), price: "RM5/hour", desc: "9:00am – 8:00pm" }
                  ].map((item) => {
                    const active = service === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseService(item.id)}
                        className={`flex min-h-[104px] items-center gap-3 rounded-[18px] border p-3 text-left transition hover:-translate-y-px ${
                          active ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white shadow-sm"
                        }`}
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#fff0ec]"><ServiceIcon type={item.id} /></span>
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
                <h2 className="section-title">{t({ en: "Choose Date / Time", zh: "选择日期 / 时间" })}</h2>
                <div className="mt-3 rounded-[14px] bg-villa-primary-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-sm font-black text-villa-text-primary">{dateLabel}</p>
                      <p className="m-0 mt-1 text-xs font-bold text-villa-text-secondary">
                        {service === "overnight"
                          ? t({ en: `${overnightNights} Nights Selected · RM${unitTotal} / dog`, zh: `已选 ${overnightNights} 晚 · 每只 RM${unitTotal}` })
                          : t({ en: `${daycareHours} Hours Selected · RM${unitTotal} / dog`, zh: `已选 ${daycareHours} 小时 · 每只 RM${unitTotal}` })}
                      </p>
                    </div>
                    <div className="text-right text-lg font-black text-villa-primary">RM{unitTotal}</div>
                  </div>
                </div>

                {service === "daycare" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "Start time", zh: "开始时间" })}</span>
                      <select className="villa-input" value={startTime} onChange={(event) => { setStartTime(event.target.value); setDateTouched(true); }}>
                        {timeOptions.slice(0, -1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "End time", zh: "结束时间" })}</span>
                      <select className="villa-input" value={endTime} onChange={(event) => { setEndTime(event.target.value); setDateTouched(true); }}>
                        {timeOptions.slice(1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                  </div>
                ) : null}

                <div className="mt-3 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg/40 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" className="rounded-full px-2 text-lg font-black text-villa-text-primary" onClick={() => setVisibleMonth(createLocalDate(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>‹</button>
                    <strong className="text-sm">{monthLabel(visibleMonth)}</strong>
                    <button type="button" className="rounded-full px-2 text-lg font-black text-villa-text-primary" onClick={() => setVisibleMonth(createLocalDate(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>›</button>
                  </div>
                  <p className="mb-3 text-center text-[11px] font-bold text-villa-text-muted">{t({ en: "Past dates are disabled. Full dates only appear after real capacity is reached.", zh: "过去日期不可选；只有真实满位后才会显示 Full。" })}</p>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-villa-text-muted">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {monthCells(visibleMonth).map((date, index) => {
                      if (!date) return <span key={`blank-${index}`} />;
                      const past = date < today;
                      const slots = availableSlotsForDate(date, capacityUsage);
                      const full = slots <= 0;
                      const disabled = past || full;
                      const active = date >= startOfLocalDay(startDate) && date <= startOfLocalDay(endDate);
                      const isToday = toDateKey(date) === toDateKey(today);
                      return (
                        <button
                          key={toDateKey(date)}
                          type="button"
                          disabled={disabled}
                          onClick={() => chooseDate(date)}
                          title={full ? "Full" : past ? "Past date" : `${slots} slots left`}
                          className={`min-h-[40px] rounded-[12px] border text-xs font-black transition ${
                            disabled
                              ? "cursor-not-allowed border-[#eaded7] bg-[#eee6e1] text-villa-text-muted"
                              : active
                                ? "border-villa-primary bg-villa-primary text-white shadow-sm"
                                : isToday
                                  ? "border-villa-primary bg-white text-villa-primary hover:bg-villa-primary-bg"
                                  : "border-villa-primary-light bg-white text-villa-text-secondary hover:border-villa-primary"
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-villa-primary-light bg-white/88 p-4 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
                <h2 className="section-title">{t({ en: "Choose Pets", zh: "选择宠物" })}</h2>
                {pets.length === 0 ? (
                  <div className="mt-3 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4 text-center">
                    <h3 className="font-title text-xl font-black text-villa-text-primary">{t({ en: "Please add your pet first before booking.", zh: "预约前请先添加宠物资料。" })}</h3>
                    <a href="/pets?mode=add" className="villa-button mt-4 w-full">{t({ en: "Add Pet Profile", zh: "新增宠物资料" })}</a>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-xs font-bold text-villa-text-secondary">{t({ en: "Select the dog(s) staying with us.", zh: "选择这次要入住的狗狗。" })}</p>
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
                            <DogAvatar pet={pet} />
                            <span className="min-w-0 flex-1">
                              <strong className="block font-title text-[18px] font-black leading-tight text-villa-text-primary">{pet.name}</strong>
                              <span className="mt-1 block text-xs font-bold text-villa-text-secondary">{pet.breed} · {pet.weight}</span>
                              <span className="mt-1.5 flex flex-wrap gap-1.5">
                                {pet.vaccinated ? <span className="rounded-full bg-[#eef5eb] px-2 py-0.5 text-[10px] font-black text-villa-accent-green">✓ {t({ en: "Vaccinated", zh: "已接种" })}</span> : null}
                                {pet.calm ? <span className="rounded-full bg-villa-primary-bg px-2 py-0.5 text-[10px] font-black text-villa-primary">✓ {t({ en: "Calm", zh: "稳定" })}</span> : null}
                              </span>
                            </span>
                            <CheckMark active={active} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                <label className="mt-3 grid gap-2">
                  <span className="villa-label">{t({ en: "Special Request (Optional)", zh: "特别要求（选填）" })}</span>
                  <textarea
                    className="villa-input h-16 py-3"
                    value={specialRequest}
                    onChange={(event) => setSpecialRequest(event.target.value)}
                    placeholder={t({ en: "Tell us anything important for your dog's comfort.", zh: "告诉我们狗狗照顾上需要注意的事项。" })}
                  />
                </label>
              </section>
            </div>

            <aside className="h-fit rounded-[22px] border border-villa-primary-light bg-white/90 p-4 shadow-[0_8px_28px_rgba(61,31,13,0.10)] lg:sticky lg:top-24">
              <h2 className="section-title">{t({ en: "Booking Summary", zh: "预约摘要" })}</h2>
              <div className="mt-4 rounded-[18px] bg-villa-primary-bg/55 p-4">
                <div className="grid gap-3 text-sm font-black text-villa-text-primary">
                  <div className="flex items-center gap-3">
                    <ServiceIcon type={service} />
                    <span>{service === "overnight" ? t({ en: "Overnight Boarding", zh: "过夜寄宿" }) : t({ en: "Daycare", zh: "日托" })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon />
                    <span>{dateLabel}{service === "overnight" ? ` (${overnightNights} ${t({ en: "Nights", zh: "晚" })})` : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DogAvatar pet={selectedPetObjects[0]} />
                    <span>{selectedPetNames.length ? selectedPetNames.join(", ") : t({ en: "No pet selected", zh: "未选择宠物" })}</span>
                  </div>
                  <div className="text-xs font-bold text-villa-text-secondary">{selectedPets.length} {selectedPets.length === 1 ? t({ en: "Dog", zh: "只狗" }) : t({ en: "Dogs", zh: "只狗" })}</div>
                </div>
              </div>

              <div className="my-4 h-px bg-villa-primary-light" />
              <div className="grid gap-3">
                <div className="flex items-end justify-between">
                  <span className="text-base font-black text-villa-text-primary">{t({ en: "Total", zh: "总计" })}</span>
                  <span className="text-2xl font-black text-villa-text-primary">RM{total}</span>
                </div>
                <div className="flex justify-between text-sm font-black">
                  <span className="text-villa-text-secondary">{t({ en: "Deposit Today (50%)", zh: "今日订金（50%）" })}</span>
                  <span className="text-villa-primary">RM{(total / 2).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-villa-text-secondary">
                  <span>{t({ en: "Balance Later", zh: "尾款稍后支付" })}</span>
                  <span>RM{(total / 2).toFixed(0)}</span>
                </div>
              </div>
              <div className="my-4 h-px bg-villa-primary-light" />
              {capacityIssue ? (
                <p className="mb-3 rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-700">
                  {t({
                    en: `Only ${capacityIssue.available} slot${capacityIssue.available === 1 ? "" : "s"} left on ${formatDateRange(capacityIssue.date, capacityIssue.date)}.`,
                    zh: `${formatDateRange(capacityIssue.date, capacityIssue.date)} 只剩 ${capacityIssue.available} 个位置。`
                  })}
                </p>
              ) : null}
              {pets.length === 0 ? (
                <a href="/pets?mode=add" className="villa-button w-full">{t({ en: "Add Pet Profile", zh: "新增宠物资料" })}</a>
              ) : (
                <button type="button" onClick={saveDraftForPayment} disabled={!confirmCompleted} className={`villa-button w-full ${confirmCompleted ? "" : "opacity-60"}`}>{t({ en: "Continue to Payment", zh: "继续付款" })}</button>
              )}
              <p className="mt-3 text-center text-[11px] font-bold leading-relaxed text-villa-text-muted">{t({ en: "Your booking is only confirmed after deposit payment.", zh: "付款订金后，预约才会确认。" })}</p>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
