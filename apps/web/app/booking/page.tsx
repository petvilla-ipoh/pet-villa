"use client";

import { useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { PaymentLogoStrip } from "../components/PaymentLogo";
import { ProtectedPage } from "../components/ProtectedPage";
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
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "Book a Stay", zh: "预约寄宿" })}</h1>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-6">
              <div className="villa-card">
                <div className="grid gap-2 sm:grid-cols-4">
                  {["Service", "Dates", "Pet", "Confirm"].map((step, index) => (
                    <div key={step} className="rounded-[16px] bg-villa-primary-bg p-3 text-sm font-bold">
                      <span className="mr-2 rounded-full bg-villa-primary px-2 py-1">{index + 1}</span>{t({ en: step, zh: ["服务", "日期", "宠物", "确认"][index] })}
                    </div>
                  ))}
                </div>
              </div>

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Service", zh: "服务" })}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["overnight", "🌙", "Overnight", "过夜寄宿", "RM40/night"],
                    ["daycare", "☀️", "Daycare", "日托", "RM5/hour"]
                  ].map(([id, icon, en, zh, price]) => (
                    <button key={id} type="button" onClick={() => setService(id as "overnight" | "daycare")} className={`rounded-[20px] border p-4 text-left ${service === id ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white"}`}>
                      <div className="text-2xl">{icon}</div>
                      <h3 className="card-title mt-2">{t({ en, zh })}</h3>
                      <p className="muted-copy m-0">{price}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Dates", zh: "日期" })}</h2>
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {dates.map((day) => {
                    const active = day >= start && day <= end;
                    return (
                      <button key={day} type="button" onClick={() => chooseDate(day)} className={`min-h-[48px] rounded-[14px] border text-xs font-bold ${active ? "border-villa-primary bg-villa-primary-light" : "border-villa-primary-light bg-white"}`}>
                        Jun<br />{day}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Pet & Notes", zh: "宠物与备注" })}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {["Mochi", "Boba"].map((pet) => (
                    <button key={pet} type="button" onClick={() => setSelectedPet(pet)} className={`rounded-[20px] border p-4 text-left text-sm font-bold ${selectedPet === pet ? "border-villa-primary bg-villa-primary-bg" : "border-villa-primary-light bg-white"}`}>
                      🐶 {pet}<p className="muted-copy m-0 mt-1">Vaccinated · 1-12kg</p>
                    </button>
                  ))}
                </div>
                <textarea className="villa-input mt-4 h-28 py-3" placeholder={t({ en: "Special requests", zh: "特别要求" })} />
              </section>
            </div>

            <aside className="villa-card h-fit lg:sticky lg:top-24">
              <h2 className="section-title">{t({ en: "Summary", zh: "摘要" })}</h2>
              <div className="mt-4 grid gap-2 text-sm font-bold text-villa-text-secondary">
                <div className="flex justify-between"><span>Service</span><span>{service}</span></div>
                <div className="flex justify-between"><span>Dates</span><span>Jun {start}-{end}</span></div>
                <div className="flex justify-between"><span>Pet</span><span>{selectedPet}</span></div>
              </div>
              <div className="my-4 h-px bg-villa-primary-light" />
              <div className="flex justify-between text-xl font-extrabold"><span>Total</span><span>RM{total}</span></div>
              <div className="mt-2 flex justify-between text-sm font-bold text-villa-text-secondary"><span>Deposit</span><span>RM{total / 2}</span></div>
              <div className="mt-4"><PaymentLogoStrip compact /></div>
              <a href="/payment" className="villa-button mt-5 w-full">{t({ en: "Continue", zh: "继续" })}</a>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
