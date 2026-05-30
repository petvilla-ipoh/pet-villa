"use client";

import { useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

const days = Array.from({ length: 30 }, (_, index) => index + 1);
const fullDays = new Set([8, 14, 15, 22]);
const pets = [
  { id: "mochi", name: "Mochi", meta: "4.8kg · Vaccinated · Calm" },
  { id: "boba", name: "Boba", meta: "6.2kg · Vaccinated · Playful" },
  { id: "luna", name: "Luna", meta: "3.9kg · Vaccinated · Shy" }
];
const timeOptions = ["9:00am", "10:00am", "11:00am", "12:00pm", "1:00pm", "2:00pm", "3:00pm", "4:00pm", "5:00pm", "6:00pm", "7:00pm", "8:00pm"];

function hourIndex(value: string) {
  return timeOptions.indexOf(value) + 9;
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

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "Book a Stay", zh: "预约照顾" })}</h1>
          <p className="body-copy mt-2">{t({ en: "Choose service, dates, pets, and confirm the deposit amount.", zh: "选择服务、日期、宠物，并确认订金金额。" })}</p>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-6">
              <div className="villa-card">
                <div className="grid gap-2 sm:grid-cols-4">
                  {[
                    { en: "Service", zh: "选择服务" },
                    { en: "Date / Time", zh: "日期时间" },
                    { en: "Pet", zh: "选择宠物" },
                    { en: "Confirm", zh: "确认订单" }
                  ].map((step, index) => (
                    <div key={step.en} className="rounded-[16px] bg-villa-primary-bg p-3 text-sm font-bold">
                      <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-villa-primary text-white">{index + 1}</span>
                      {t(step)}
                    </div>
                  ))}
                </div>
              </div>

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Choose Service", zh: "选择服务" })}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "overnight", icon: "🌙", en: "Overnight Boarding", zh: "过夜寄宿", price: "RM40/night", desc: "No cages · 24h companionship" },
                    { id: "daycare", icon: "☀️", en: "Daycare", zh: "日托", price: "RM5/hour", desc: "9:00am - 8:00pm" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setService(item.id as "overnight" | "daycare")}
                      className={`rounded-[20px] border p-4 text-left transition hover:-translate-y-px ${service === item.id ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white shadow-sm"}`}
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#fff0ec] text-2xl">{item.icon}</div>
                      <h3 className="card-title mt-3">{t({ en: item.en, zh: item.zh })}</h3>
                      <p className="mt-1 text-sm font-black text-villa-primary">{item.price}</p>
                      <p className="muted-copy m-0 mt-1">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Choose Date / Time", zh: "选择日期 / 时间" })}</h2>
                {service === "overnight" ? (
                  <div className="mt-3 rounded-[16px] bg-villa-primary-bg p-3">
                    <p className="m-0 text-sm font-bold text-villa-text-secondary">
                      {t({
                        en: "Tap your check-in date, then tap any later check-out date. You can select as many nights as needed.",
                        zh: "先点入住日期，再点之后任何离店日期；可选择任意多晚。"
                      })}
                    </p>
                    <p className="m-0 mt-2 text-sm font-black text-villa-primary">
                      {dateLabel} · {overnightNights} {t({ en: "night(s)", zh: "晚" })} · RM{unitTotal} / {t({ en: "dog", zh: "只狗" })}
                    </p>
                  </div>
                ) : null}
                {service === "daycare" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "Start time", zh: "开始时间" })}</span>
                      <select className="villa-input" value={startTime} onChange={(event) => setStartTime(event.target.value)}>
                        {timeOptions.slice(0, -1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "End time", zh: "结束时间" })}</span>
                      <select className="villa-input" value={endTime} onChange={(event) => setEndTime(event.target.value)}>
                        {timeOptions.slice(1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                    <p className="body-copy sm:col-span-2">
                      {startTime} - {endTime} = {daycareHours} {t({ en: "hours", zh: "小时" })} = RM{daycareHours * 5}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 rounded-[20px] border border-villa-primary-light bg-villa-primary-bg/40 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <strong className="text-sm">June 2026</strong>
                    <span className="text-xs font-bold text-villa-text-muted">{t({ en: "Full dates are disabled", zh: "已满日期不可选" })}</span>
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
                          className={`min-h-[42px] rounded-[12px] border text-xs font-black transition ${
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

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Choose Pets", zh: "选择宠物" })}</h2>
                <p className="body-copy mt-2">{t({ en: "Select multiple dogs if they are staying together.", zh: "多只狗狗一起入住时，可一次选择多只。" })}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {pets.map((pet) => {
                    const active = selectedPets.includes(pet.id);
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => togglePet(pet.id)}
                        className={`rounded-[20px] border p-4 text-left text-sm font-bold transition hover:-translate-y-px ${active ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white shadow-sm"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-2xl">🐶</span>
                          <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${active ? "border-villa-primary bg-villa-primary text-white" : "border-villa-primary-light bg-white"}`}>{active ? "✓" : ""}</span>
                        </div>
                        <h3 className="card-title mt-3">{pet.name}</h3>
                        <p className="muted-copy m-0 mt-1">{pet.meta}</p>
                      </button>
                    );
                  })}
                </div>
                <textarea className="villa-input mt-4 h-28 py-3" placeholder={t({ en: "Special requests, food, medicine, or habits", zh: "特殊要求、狗粮、药物或习惯说明" })} />
              </section>
            </div>

            <aside className="villa-card h-fit lg:sticky lg:top-24">
              <h2 className="section-title">{t({ en: "Booking Summary", zh: "订单摘要" })}</h2>
              <div className="mt-4 grid gap-3 text-sm font-bold text-villa-text-secondary">
                <div className="flex justify-between gap-4"><span>{t({ en: "Service", zh: "服务" })}</span><span className="text-right">{service === "overnight" ? "Overnight" : "Daycare"}</span></div>
                <div className="flex justify-between gap-4"><span>{t({ en: "Date", zh: "日期" })}</span><span className="text-right">{dateLabel}</span></div>
                <div className="flex justify-between gap-4"><span>{t({ en: "Pets", zh: "宠物" })}</span><span className="text-right">{selectedPetNames.join(", ")}</span></div>
                <div className="flex justify-between gap-4"><span>{t({ en: "Pet count", zh: "宠物数量" })}</span><span>{petCount}</span></div>
                <div className="flex justify-between gap-4"><span>{t({ en: "Unit subtotal", zh: "单只小计" })}</span><span>RM{unitTotal}</span></div>
              </div>
              <div className="my-4 h-px bg-villa-primary-light" />
              <div className="flex justify-between text-xl font-extrabold"><span>Total</span><span>RM{total}</span></div>
              <div className="mt-2 flex justify-between text-sm font-bold text-villa-text-secondary"><span>{t({ en: "Deposit 50%", zh: "订金 50%" })}</span><span>RM{(total / 2).toFixed(2)}</span></div>
              <div className="mt-2 flex justify-between text-sm font-bold text-villa-text-secondary"><span>{t({ en: "Balance later", zh: "尾款稍后支付" })}</span><span>RM{(total / 2).toFixed(2)}</span></div>
              <a href="/payment" className="villa-button mt-5 w-full">{t({ en: "Continue to Payment", zh: "继续付款" })}</a>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
