"use client";

import { AppNav } from "../components/AppNav";
import { useLanguage } from "../components/LanguageProvider";

export default function ServicesPage() {
  const { t } = useLanguage();

  return (
    <div className="villa-shell">
      <AppNav />
      <main className="villa-section">
        <div className="villa-container">
          <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">{t({ en: "Services", zh: "服务" })}</span>
          <h1 className="page-title mt-4 max-w-4xl">{t({ en: "Small-dog boarding with clear rules and warm care", zh: "小型犬专属寄宿，规则清晰，照护温暖" })}</h1>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {[
              ["🌙", "Overnight Boarding", "过夜寄宿", "RM40/night", "No cages, same-room sleeping, 24h companionship.", "不关笼，同房休息，24小时陪伴。"],
              ["☀️", "Daycare", "日托", "RM5/hour", "Flexible daytime care from 9:00am to 8:00pm.", "9:00am 至 8:00pm 灵活日间照护。"]
            ].map(([icon, en, zh, price, bodyEn, bodyZh]) => (
              <article key={en} className="villa-card p-7">
                <div className="text-2xl">{icon}</div>
                <h2 className="card-title mt-3">{t({ en, zh })}</h2>
                <div className="price-number mt-3">{price}</div>
                <p className="mt-4 font-bold text-villa-text/65">{t({ en: bodyEn, zh: bodyZh })}</p>
                <a href="/booking" className="villa-button mt-6">{t({ en: "Book Now", zh: "立即预约" })}</a>
              </article>
            ))}
          </div>
          <section className="mt-10 villa-card border-l-8 border-villa-coral p-7">
            <h2 className="section-title">{t({ en: "Boarding Notice", zh: "寄宿须知" })}</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ["1-12kg small dogs only", "只接 1–12kg 小型犬"],
                ["Maximum 3 dogs per day", "每天最多 3 只狗狗"],
                ["No aggressive dogs or fleas", "不接攻击性犬或有跳蚤犬"],
                ["Bring food, snacks, and health proof", "请自备狗粮零食与健康证明"]
              ].map(([en, zh]) => (
                <div key={en} className="rounded-[18px] bg-villa-bg p-4 font-black">✓ {t({ en, zh })}</div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
