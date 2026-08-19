"use client";

import { useLanguage } from "../components/LanguageProvider";
import { OwnerSidebar } from "../components/OwnerSidebar";

function MoonIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
      <path d="M32 36c-11 0-20-9-20-20 0-2.5.5-4.8 1.3-7A17 17 0 1 0 39 34.7c-2.2.8-4.5 1.3-7 1.3Z" fill="#fff4df" stroke="#db982d" strokeWidth="3" strokeLinejoin="round" />
      <path d="M33 10v8M29 14h8" stroke="#db982d" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
      <circle cx="24" cy="24" r="10" fill="#fff4df" stroke="#db982d" strokeWidth="3" />
      <path d="M24 5v7M24 36v7M5 24h7M36 24h7M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5" stroke="#db982d" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ServicesPage() {
  const { t } = useLanguage();

  const services = [
    {
      key: "boarding",
      icon: <MoonIcon />,
      title: t({ en: "Overnight Boarding", zh: "过夜寄宿" }),
      price: "RM35/night",
      desc: t({ en: "Cage-free small dog boarding with 24h companionship.", zh: "无笼小型犬寄宿，24小时陪伴照顾。" }),
      tone: "boarding",
      points: [
        t({ en: "No cages", zh: "不关笼" }),
        t({ en: "Same-room sleeping", zh: "同房休息" }),
        t({ en: "3-5 photo/video updates", zh: "3-5次照片/影片更新" })
      ]
    },
    {
      key: "daycare",
      icon: <SunIcon />,
      title: t({ en: "Daycare", zh: "日托" }),
      price: "RM5/hour",
      desc: t({ en: "Flexible daytime care for short errands or busy days.", zh: "适合短时间外出或忙碌日子的日间照顾。" }),
      tone: "daycare",
      points: [
        t({ en: "9:00am - 8:00pm", zh: "9:00am - 8:00pm" }),
        t({ en: "Safe indoor play", zh: "安全室内活动" }),
        t({ en: "No deposit needed", zh: "无需订金" })
      ]
    }
  ];

  return (
    <OwnerSidebar>
      <section className="services-page min-h-screen">
      <main className="services-main">
        <section className="services-hero">
          <div className="services-hero-copy">
            <span>{t({ en: "Pet Villa Care Menu", zh: "Pet Villa 服务" })}</span>
            <h1>{t({ en: "Choose the right cozy stay", zh: "选择最适合的温馨照顾" })}</h1>
            <p>{t({ en: "Clear prices, small-dog rules, and a simple booking flow for boarding or daycare.", zh: "价格清楚、小型犬规则明确，寄宿或日托都可以轻松预约。" })}</p>
          </div>
          <a href="/booking" className="services-hero-cta pet-primary-cta">{t({ en: "Book Now", zh: "立即预约" })}</a>
        </section>

        <section className="services-grid">
          {services.map((service) => (
            <article key={service.key} className="service-premium-card" data-tone={service.tone}>
              <div className="service-card-top">
                <span>{service.icon}</span>
                <b>{service.price}</b>
              </div>
              <h2>{service.title}</h2>
              <p>{service.desc}</p>
              <div className="service-point-list">
                {service.points.map((point) => (
                  <span key={point}>
                    <CheckIcon />
                    {point}
                  </span>
                ))}
              </div>
              <a href={`/booking?service=${service.key}`} className="service-card-button pet-primary-cta">{t({ en: "Select Service", zh: "选择服务" })}</a>
            </article>
          ))}
        </section>

        <section className="services-notice">
          <span>{t({ en: "Boarding Rules", zh: "寄宿须知" })}</span>
          <div>
            {[
              t({ en: "Small dogs from 1-12kg only", zh: "只接 1-12kg 小型犬" }),
              t({ en: "Maximum 3 dogs per day", zh: "每天最多 3 只狗狗" }),
              t({ en: "No aggressive dogs or fleas", zh: "不接攻击性狗狗或有跳蚤情况" }),
              t({ en: "Please bring food, snacks, and health proof", zh: "请自备狗粮、零食与健康证明" })
            ].map((item) => (
              <p key={item}><CheckIcon />{item}</p>
            ))}
          </div>
        </section>
      </main>
      </section>
    </OwnerSidebar>
  );
}
