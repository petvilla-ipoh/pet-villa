"use client";

import { AppNav } from "./components/AppNav";
import { DogIllustration } from "./components/DogIllustration";
import { useLanguage } from "./components/LanguageProvider";

const features = [
  { icon: "🐾", title: { en: "No Cages", zh: "不关笼" }, body: { en: "Your dog roams freely and rests near us in a calm home.", zh: "狗狗可在安静家中自由活动，安心陪伴休息。" } },
  { icon: "📸", title: { en: "Daily Updates", zh: "每日照片更新" }, body: { en: "Receive 3-5 photos or videos every day during the stay.", zh: "入住期间每天收到 3-5 次照片或视频更新。" } },
  { icon: "❄️", title: { en: "24h Air-Conditioned", zh: "24小时冷气" }, body: { en: "Comfortable indoor care through warm Ipoh days and nights.", zh: "无论白天夜晚，都在舒适冷气空间中照顾。" } }
];

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
        <section id="about" className="villa-section relative pt-8">
          <span className="paw-mark right-5 top-5" />
          <div className="villa-container grid gap-7 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <span className="rounded-pill bg-villa-primary-light px-3 py-2 text-xs font-bold uppercase text-villa-text-primary">
                The Pet Villa · Ipoh · Pet Boarding
              </span>
              <h1 className="page-title mt-4">A Home Away From Home</h1>
              <p className="body-copy mt-3 max-w-2xl">
                {t({
                  en: "Premium small dog boarding in Ipoh · No cages · 24h companionship · thoughtful daily updates",
                  zh: "怡保精品小型犬寄宿 · 不关笼 · 24小时陪伴 · 每日温馨更新"
                })}
              </p>
              <div className="mt-5 grid gap-3 sm:flex">
                <a className="villa-button" href="/booking">{t({ en: "Book a Stay", zh: "预约寄宿" })}</a>
                <a className="villa-button-outline" href="#how-it-works">{t({ en: "Learn More", zh: "了解更多" })}</a>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {["No cages", "Max 3 dogs", "1-12kg only", "24h updates"].map((tag) => (
                  <span key={tag} className="rounded-pill bg-white px-3 py-2 text-xs font-bold text-villa-text-secondary shadow-sm">{tag}</span>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] bg-white p-3 shadow-lg">
              <DogIllustration label={t({ en: "Protected & loved", zh: "被爱护与保护" })} />
            </div>
          </div>
        </section>

        <section id="services" className="villa-section">
          <div className="villa-container grid gap-3 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title.en} className="villa-card">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#fff0ec] text-[30px]">{feature.icon}</div>
                <h2 className="card-title mt-4">{t(feature.title)}</h2>
                <p className="body-copy mt-2">{t(feature.body)}</p>
              </article>
            ))}
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
