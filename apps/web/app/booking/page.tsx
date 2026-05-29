"use client";

import { useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { useLanguage } from "../components/LanguageProvider";

const dates = Array.from({ length: 14 }, (_, index) => index + 1);

export default function BookingPage() {
  const { t } = useLanguage();
  const [service, setService] = useState<"overnight" | "daycare">("overnight");
  const [selectedPet, setSelectedPet] = useState("Mochi");
  const [start, setStart] = useState(4);
  const [end, setEnd] = useState(6);

  const total = useMemo(() => service === "overnight" ? Math.max(1, end - start) * 40 : 6 * 5, [service, start, end]);

  function chooseDate(day: number) {
    if (day <= start) {
      setStart(day);
      setEnd(day + 1);
    } else {
      setEnd(day);
    }
  }

  return (
    <OwnerSidebar>
      <section className="p-5 sm:p-8 lg:p-10">
        <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">{t({ en: "Booking", zh: "预约" })}</span>
        <h1 className="mt-4 font-title text-5xl font-black">{t({ en: "Plan a safe stay", zh: "预约安心寄宿" })}</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <div className="villa-card p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                {["Service", "Dates", "Pet", "Confirm"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-[18px] bg-villa-bg p-3 font-black">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-villa-coral">{index + 1}</span>
                    <span>{t({ en: step, zh: ["服务", "日期", "宠物", "确认"][index] })}</span>
                  </div>
                ))}
              </div>
            </div>

            <section className="villa-card p-6">
              <h2 className="font-title text-3xl font-black">{t({ en: "Choose Service", zh: "选择服务" })}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  ["overnight", "🌙", "Overnight", "RM40/night", "过夜寄宿"],
                  ["daycare", "☀️", "Daycare", "RM5/hour", "日托"]
                ].map(([id, icon, en, price, zh]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setService(id as "overnight" | "daycare")}
                    className={`rounded-villa border p-5 text-left transition ${service === id ? "border-villa-coral bg-villa-peach/40" : "border-villa-line bg-white/70"}`}
                  >
                    <div className="text-3xl">{icon}</div>
                    <h3 className="mt-3 font-title text-3xl font-black">{t({ en, zh })}</h3>
                    <p className="m-0 font-black text-villa-text/55">{price}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="villa-card p-6">
              <h2 className="font-title text-3xl font-black">{t({ en: "Select Dates", zh: "选择日期" })}</h2>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {dates.map((day) => {
                  const active = day >= start && day <= end;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => chooseDate(day)}
                      className={`min-h-[58px] rounded-[18px] border text-sm font-black ${active ? "border-villa-coral bg-villa-peach" : "border-villa-line bg-white/70"}`}
                    >
                      Jun<br />{day}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="villa-card p-6">
              <h2 className="font-title text-3xl font-black">{t({ en: "Choose Pet", zh: "选择宠物" })}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {["Mochi", "Boba"].map((pet) => (
                  <button key={pet} type="button" onClick={() => setSelectedPet(pet)} className={`rounded-villa border p-5 text-left font-black ${selectedPet === pet ? "border-villa-coral bg-villa-peach/40" : "border-villa-line bg-white/70"}`}>
                    🐶 {pet}<p className="m-0 mt-2 text-sm text-villa-text/55">Vaccinated · 1-12kg eligible</p>
                  </button>
                ))}
              </div>
              <label className="mt-5 grid gap-2">
                <span className="villa-label">{t({ en: "Special requests", zh: "特别要求" })}</span>
                <textarea className="villa-input min-h-[140px] py-4" placeholder={t({ en: "Tell us about habits, anxiety, allergies, or routines.", zh: "请说明习惯、焦虑、过敏或日常作息。" })} />
              </label>
            </section>
          </div>

          <aside className="villa-card h-fit p-6 lg:sticky lg:top-28">
            <h2 className="font-title text-3xl font-black">{t({ en: "Booking Summary", zh: "预约摘要" })}</h2>
            <div className="mt-5 grid gap-3 text-sm font-black text-villa-text/65">
              <div className="flex justify-between"><span>{t({ en: "Service", zh: "服务" })}</span><span>{service === "overnight" ? "Overnight" : "Daycare"}</span></div>
              <div className="flex justify-between"><span>{t({ en: "Dates", zh: "日期" })}</span><span>Jun {start} - {end}</span></div>
              <div className="flex justify-between"><span>{t({ en: "Pet", zh: "宠物" })}</span><span>{selectedPet}</span></div>
            </div>
            <div className="my-5 h-px bg-villa-line" />
            <div className="flex justify-between font-title text-3xl font-black"><span>Total</span><span>RM{total}</span></div>
            <div className="mt-2 flex justify-between font-black text-villa-text/60"><span>Deposit 50%</span><span>RM{total / 2}</span></div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["DuitNow", "FPX", "TNG", "GrabPay", "Visa"].map((method) => <span key={method} className="rounded-pill bg-villa-bg px-3 py-2 text-xs font-black">{method}</span>)}
            </div>
            <a href="/payment" className="villa-button mt-6 w-full">{t({ en: "Continue to Payment", zh: "继续付款" })}</a>
          </aside>
        </div>
      </section>
    </OwnerSidebar>
  );
}
