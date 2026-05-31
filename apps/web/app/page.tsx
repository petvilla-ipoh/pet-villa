"use client";

import { AppNav } from "./components/AppNav";
import { useLanguage } from "./components/LanguageProvider";

const heroFeatures = [
  { icon: "home", title: { en: "Cage Free Home", zh: "不关笼家庭" } },
  { icon: "care", title: { en: "24h Supervision By Owner", zh: "主人24小时陪伴" } },
  { icon: "camera", title: { en: "3-5 Daily Photo Updates", zh: "每日3-5次照片更新" } },
  { icon: "shield", title: { en: "Safe, Clean & Loved", zh: "安全干净被爱护" } }
];

const heroTags = [
  { icon: "🚫", label: "No cages" },
  { icon: "🐶", label: "Max 3 dogs" },
  { icon: "👜", label: "1-12kg only" },
  { icon: "📸", label: "24h updates" }
];

function FeatureIcon({ type }: { type: string }) {
  const stroke = "#7a4a24";
  const coral = "#e8927c";
  const soft = "#f5c4b3";
  const green = "#7a9e7e";

  if (type === "home") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <path d="M12 31 32 14l20 17" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 29v21h28V29" fill="#fff8f5" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        <path d="M24 39c0-4 3-7 8-7s8 3 8 7c0 7-8 11-8 11s-8-4-8-11Z" fill={coral} opacity="0.9" />
        <path d="M9 45c5-1 8-4 10-9M55 45c-5-1-8-4-10-9" fill="none" stroke={green} strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="39" r="3" fill="#fff" opacity="0.85" />
      </svg>
    );
  }

  if (type === "care") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <circle cx="29" cy="22" r="9" fill="#f2b27f" stroke={stroke} strokeWidth="2.5" />
        <path d="M16 55c1-14 25-14 27 0" fill="#fff0ec" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <circle cx="43" cy="37" r="9" fill="#d99864" stroke={stroke} strokeWidth="2.5" />
        <path d="M34 39c3 8 14 8 18 0" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 35c5 8 15 10 25 6" fill="none" stroke={coral} strokeWidth="4" strokeLinecap="round" />
        <path d="M49 15c3-5 10-2 8 4-1 4-8 8-8 8s-7-4-8-8c-2-6 5-9 8-4Z" fill={coral} opacity="0.9" />
        <circle cx="39" cy="35" r="1.8" fill={stroke} />
        <circle cx="47" cy="35" r="1.8" fill={stroke} />
      </svg>
    );
  }

  if (type === "camera") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <path d="M17 24h9l3-5h9l3 5h6a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6V30a6 6 0 0 1 6-6Z" fill="#fff8f5" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="32" cy="38" r="9" fill={soft} stroke={coral} strokeWidth="3" />
        <circle cx="46" cy="30" r="2.5" fill={coral} />
        <path d="M14 16c3-4 8-1 6 4-1 3-6 6-6 6s-5-3-6-6c-2-5 3-8 6-4ZM51 13c3-4 8-1 6 4-1 3-6 6-6 6s-5-3-6-6c-2-5 3-8 6-4Z" fill={coral} opacity="0.85" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <path d="M32 9 50 16v14c0 14-8 22-18 27-10-5-18-13-18-27V16l18-7Z" fill="#fff8f5" stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="m23 32 6 6 13-15" fill="none" stroke={coral} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 47c5-1 8-4 10-9M53 47c-5-1-8-4-10-9" fill="none" stroke={green} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="16" r="2" fill={soft} />
    </svg>
  );
}

const notices = [
  { en: "Only 1-12kg small dogs are accepted.", zh: "只接收 1-12kg 小型犬。" },
  { en: "Vaccination and health proof are required.", zh: "必须提供疫苗与健康证明。" },
  { en: "Bring your dog's own food and snacks.", zh: "请自备狗粮和零食。" },
  { en: "Please explain habits, allergies, medication, and special needs in advance.", zh: "习惯、过敏、药物和特殊需求请提前说明。" },
  { en: "Aggressive dogs or dogs with fleas cannot be accepted.", zh: "不接收攻击性犬或有跳蚤的狗狗。" }
];

const reviews = [
  { name: "林美玲", dog: "Mochi", quote: { en: "Mochi looked loved, calm, and safe every day.", zh: "Mochi 每天都看起来被爱护，也很安心。" } },
  { name: "陈嘉欣", dog: "Boba", quote: { en: "The updates were professional, warm, and always on time.", zh: "每日更新很专业，也很温暖准时。" } },
  { name: "王俊伟", dog: "Luna", quote: { en: "Simple booking and very careful small-dog care.", zh: "预约简单，小型犬照顾也很细心。" } }
];

const steps = [
  { en: "Register Account", zh: "注册账号", body: { en: "Add your contact details so we can confirm quickly.", zh: "填写基本资料，方便快速确认预约。" } },
  { en: "Add Your Dog", zh: "添加狗狗", body: { en: "Share breed, weight, vaccine record, and daily habits.", zh: "填写品种、体重、疫苗记录和日常习惯。" } },
  { en: "Choose Dates", zh: "选择日期", body: { en: "Pick boarding nights or daycare hours from the calendar.", zh: "选择寄宿日期或日托时间。" } },
  { en: "Confirm Booking", zh: "确认预约", body: { en: "Review service, pet count, notes, and total price.", zh: "检查服务、宠物数量、备注和总价。" } },
  { en: "Pay Deposit", zh: "付订金", body: { en: "Pay 50% deposit to secure your dog's stay.", zh: "支付 50% 订金确认名额。" } }
];

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="villa-shell paw-bg">
      <AppNav />

      <main>
        <section id="about" className="villa-section relative overflow-hidden pb-6 pt-6 sm:pb-10 sm:pt-10">
          <div className="pointer-events-none absolute inset-y-0 right-0 top-0 h-[420px] w-[70%] opacity-95 lg:h-full lg:w-[50%]">
            <img
              src="/hero-dogs.png"
              alt=""
              className="h-full w-full object-cover object-[72%_62%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#faf6f2_0%,rgba(250,246,242,0.92)_34%,rgba(250,246,242,0.35)_63%,rgba(250,246,242,0.08)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-villa-background to-transparent" />
          </div>
          <span className="paw-mark right-5 top-5" />
          <div className="villa-container relative z-10">
            <div className="max-w-[310px] min-[390px]:max-w-[340px] lg:max-w-[560px]">
              <span className="rounded-pill bg-villa-primary-light px-3 py-2 text-[11px] font-bold uppercase text-villa-text-primary sm:text-xs">
                The Pet Villa · Ipoh · Pet Boarding
              </span>
              <h1 className="page-title mt-4 max-w-[300px] lg:max-w-none">A Home Away From Home <span className="text-villa-primary">♡</span></h1>
              <p className="body-copy mt-3 max-w-[285px] lg:max-w-2xl">
                {t({
                  en: "Premium small dog boarding in Ipoh · No cages · 24h companionship · thoughtful daily updates",
                  zh: "怡保精品小型犬寄宿 · 不关笼 · 24小时陪伴 · 每日温馨更新"
                })}
              </p>
              <div className="mt-5 grid max-w-[250px] gap-3">
                <a className="villa-button min-h-[46px] w-full" href="/booking">{t({ en: "Book a Stay", zh: "预约寄宿" })}</a>
                <a className="villa-button-outline min-h-[46px] w-full bg-white/45 backdrop-blur" href="#how-it-works">{t({ en: "Learn More", zh: "了解更多" })}</a>
              </div>
              <div className="mt-5 grid w-[calc(100vw-32px)] max-w-[480px] grid-cols-4 gap-2">
                {heroTags.map((tag) => (
                  <span key={tag.label} className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-pill bg-white/95 px-2 py-2 text-[10px] font-bold text-villa-text-secondary shadow-md backdrop-blur min-[390px]:gap-1.5 min-[390px]:text-xs">
                    <span className="text-villa-primary">{tag.icon}</span>
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative mt-5 h-[280px] overflow-hidden rounded-[28px] border-[6px] border-white bg-white shadow-[0_14px_44px_rgba(61,31,13,0.16)] sm:h-[420px] lg:aspect-[4/3] lg:h-auto">
              <img
                src="/hero-dogs.png"
                alt="Toy poodle and French bulldog resting in a warm home living room"
                className="absolute inset-0 h-full w-full object-cover object-[center_66%]"
              />
              <div className="absolute left-4 top-4 rounded-pill bg-white/95 px-4 py-2 text-xs font-black text-villa-accent-green shadow-md backdrop-blur sm:text-sm">
                🏡 Cage Free
              </div>
              <div className="absolute right-4 top-4 rounded-pill bg-white/95 px-4 py-2 text-xs font-black text-villa-primary shadow-md backdrop-blur sm:text-sm">
                ❤️ 24h Care
              </div>
              <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
                <div className="rounded-pill bg-white/95 px-5 py-2.5 text-sm font-black text-villa-primary shadow-lg backdrop-blur">
                  📸 3–5 Daily Photo Updates
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="villa-section pt-0">
          <div className="villa-container">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {heroFeatures.map((feature) => (
                <article
                  key={feature.title.en}
                  className="rounded-[22px] border border-villa-primary-light bg-white/95 px-3 py-4 text-center shadow-[0_10px_28px_rgba(61,31,13,0.09)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:px-4"
                >
                  <div className="mx-auto h-14 w-14 sm:h-16 sm:w-16">
                    <FeatureIcon type={feature.icon} />
                  </div>
                  <h2 className="mx-auto mt-2 max-w-[104px] text-[13px] font-black leading-[1.08] text-villa-text-primary sm:mt-3 sm:text-sm">
                    {t(feature.title)}
                  </h2>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="villa-section pt-0">
          <div className="villa-container">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="section-title">{t({ en: "Simple Pricing", zh: "清晰价格" })}</h2>
              <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-villa-primary-bg text-sm">🐾</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="villa-card relative border-2 border-villa-primary bg-villa-primary-bg">
                <span className="absolute right-4 top-4 rounded-pill bg-villa-primary px-3 py-1 text-xs font-bold text-white">{t({ en: "Most Popular", zh: "最受欢迎" })}</span>
                <div className="text-2xl">🌙</div>
                <h3 className="card-title mt-3">Overnight Boarding</h3>
                <div className="price-number mt-3">RM40<span className="ml-1 text-sm text-villa-text-secondary">/night</span></div>
                <p className="body-copy mt-3">{t({ en: "No cages, same-room sleeping, 24h companionship, and daily updates.", zh: "不关笼、同房休息、24小时陪伴，并提供每日更新。" })}</p>
                <a className="villa-button mt-5 w-full" href="/booking">{t({ en: "Book Now", zh: "立即预约" })}</a>
              </article>
              <article className="villa-card">
                <div className="text-2xl">☀️</div>
                <h3 className="card-title mt-3">Daycare</h3>
                <div className="price-number mt-3">RM5<span className="ml-1 text-sm text-villa-text-secondary">/hour</span></div>
                <p className="body-copy mt-3">{t({ en: "Flexible daytime care between 9:00am and 8:00pm.", zh: "9:00am 至 8:00pm 灵活日托照顾。" })}</p>
                <a className="villa-button mt-5 w-full" href="/booking">{t({ en: "Book Now", zh: "立即预约" })}</a>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="villa-section pt-0">
          <div className="villa-container">
            <h2 className="section-title">{t({ en: "How It Works", zh: "预约流程" })}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {steps.map((step, index) => (
                <article key={step.en} className="villa-card">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-villa-primary text-sm font-bold text-white">{index + 1}</span>
                  <h3 className="card-title mt-3">{t({ en: step.en, zh: step.zh })}</h3>
                  <p className="muted-copy mt-2">{t(step.body)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="villa-section pt-0">
          <div className="villa-container rounded-[20px] border-l-4 border-villa-primary bg-white p-4 shadow-md">
            <h2 className="section-title">{t({ en: "Owner Notice", zh: "主人须知" })}</h2>
            <div className="mt-3 grid gap-2">
              {notices.map((notice) => <p key={notice.en} className="body-copy m-0">✓ {t(notice)}</p>)}
            </div>
          </div>
        </section>

        <section id="reviews" className="villa-section pt-0">
          <div className="villa-container">
            <h2 className="section-title">{t({ en: "Reviews", zh: "客户评价" })}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {reviews.map((review) => (
                <article key={review.name} className="villa-card">
                  <div className="text-sm text-[#d9922e]">★★★★★</div>
                  <p className="body-copy mt-3">"{t(review.quote)}"</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-villa-primary-light text-sm font-bold">{review.name[0]}</span>
                    <div>
                      <strong className="text-sm">{review.name}</strong>
                      <p className="muted-copy m-0">{review.dog}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden bg-villa-host-dark px-4 py-10 text-villa-primary-light">
        <span className="paw-mark paw-mark-lg bottom-4 left-4 opacity-[0.08]" />
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div>
            <h3 className="font-title text-xl font-black">The Pet Villa</h3>
            <p className="mt-2 text-xs font-semibold text-villa-primary-light/75">{t({ en: "Premium small dog boarding in Ipoh.", zh: "怡保精品小型犬寄宿。" })}</p>
          </div>
          <div>
            <h3 className="font-title text-xl font-black">{t({ en: "Contact", zh: "联系" })}</h3>
            <p className="mt-2 text-xs font-semibold text-villa-primary-light/75">WhatsApp · Instagram · Facebook</p>
          </div>
          <div>
            <h3 className="font-title text-xl font-black">{t({ en: "Hours", zh: "时间" })}</h3>
            <p className="mt-2 text-xs font-semibold text-villa-primary-light/75">Check-in 9:00am-8:00pm<br />Check-out before 12:00pm</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
