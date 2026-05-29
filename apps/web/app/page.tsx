"use client";

import { AppNav } from "./components/AppNav";
import { DogIllustration } from "./components/DogIllustration";
import { useLanguage } from "./components/LanguageProvider";

const features = [
  {
    icon: "🐾",
    title: { en: "No Cages Ever", zh: "绝不关笼" },
    body: { en: "Your dog roams free and sleeps close to us in a calm home.", zh: "狗狗在家中自由活动，晚上也有人陪伴一起休息。" }
  },
  {
    icon: "📸",
    title: { en: "Daily Photo Updates", zh: "每日照片更新" },
    body: { en: "Receive 3-5 photos or videos every day during the stay.", zh: "寄宿期间每天收到 3–5 次照片或视频更新。" }
  },
  {
    icon: "❄️",
    title: { en: "24h Air-Conditioned", zh: "24小时冷气" },
    body: { en: "Comfortable indoor care all day and night for small dogs.", zh: "全天候舒适室内照护，特别适合小型犬。" }
  }
];

const notices = [
  { en: "Only small dogs from 1-12kg are accepted.", zh: "只接收 1–12kg 小型犬。" },
  { en: "Vaccination and health proof are required.", zh: "必须提供疫苗与健康证明。" },
  { en: "Please bring your dog's own food and snacks.", zh: "请自备狗粮、零食和日常用品。" },
  { en: "Aggressive dogs or dogs with fleas cannot be accepted.", zh: "不接攻击性犬或有跳蚤的狗狗。" },
  { en: "Special needs must be shared before confirmation.", zh: "特殊需求需在确认前说明。" }
];

const reviews = [
  { name: "林美玲", dog: "Mochi", quote: { en: "The updates were gentle and detailed. Mochi looked truly loved.", zh: "每天更新都很仔细，Mochi 看起来真的被好好照顾。" } },
  { name: "陈嘉欣", dog: "Boba", quote: { en: "Clean, calm, and very caring. I felt safe leaving Boba here.", zh: "环境干净安静，也很有爱心，把 Boba 交过去很安心。" } },
  { name: "王俊伟", dog: "Luna", quote: { en: "The booking flow was simple and the host replied quickly.", zh: "预约流程很简单，寄宿主回复也很快。" } }
];

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="villa-shell">
      <AppNav />

      <section className="villa-section pt-10 lg:pt-16">
        <div className="villa-container grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase tracking-wide">
              The Pet Villa · Ipoh · Pet Boarding
            </span>
            <h1 className="mt-6 font-title text-6xl font-black leading-[0.92] tracking-normal sm:text-7xl lg:text-8xl">
              A Home Away From Home
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-extrabold leading-relaxed text-villa-text/75">
              {t({
                en: "Premium small dog boarding in Ipoh · No cages · 24h companionship",
                zh: "怡保精品小型犬寄宿 · 不关笼 · 24小时陪伴"
              })}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="villa-button" href="/booking">{t({ en: "Book a Stay", zh: "预约寄宿" })}</a>
              <a className="villa-button-outline" href="#services">{t({ en: "Learn More", zh: "了解更多" })}</a>
            </div>
          </div>
          <div className="villa-card bg-white/80 p-5">
            <DogIllustration label={t({ en: "Small dogs only", zh: "只接小型犬" })} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["No cages", "Max 3 dogs", "1-12kg", "24h updates"].map((tag) => (
                <span key={tag} className="rounded-pill bg-villa-bg px-3 py-2 text-center text-xs font-black text-villa-text/75">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="villa-section">
        <div className="villa-container">
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.icon} className="villa-card paw-bg p-6">
                <div className="grid h-14 w-14 place-items-center rounded-[20px] bg-villa-peach text-3xl">{feature.icon}</div>
                <h2 className="mt-5 font-title text-3xl font-black">{t(feature.title)}</h2>
                <p className="mt-3 font-bold leading-relaxed text-villa-text/65">{t(feature.body)}</p>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center">
            <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">{t({ en: "Prices", zh: "价格" })}</span>
            <h2 className="mx-auto mt-4 max-w-3xl font-title text-5xl font-black">{t({ en: "Clear pricing before you book", zh: "预约前清楚知道价格" })}</h2>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="villa-card relative p-7">
              <span className="absolute right-6 top-6 rounded-pill bg-villa-coral px-4 py-2 text-xs font-black">{t({ en: "Most Popular", zh: "最受欢迎" })}</span>
              <div className="text-4xl">🌙</div>
              <h3 className="mt-4 font-title text-4xl font-black">Overnight</h3>
              <p className="mt-2 text-villa-text/65">{t({ en: "Home-style night boarding with daily media updates.", zh: "家庭式过夜寄宿，每天照片视频更新。" })}</p>
              <div className="mt-6 font-title text-6xl font-black">RM40<span className="ml-2 font-body text-lg font-black text-villa-text/55">/night</span></div>
              <a className="villa-button mt-6" href="/booking">{t({ en: "Book Now", zh: "立即预约" })}</a>
            </article>
            <article className="villa-card p-7">
              <div className="text-4xl">☀️</div>
              <h3 className="mt-4 font-title text-4xl font-black">Daycare</h3>
              <p className="mt-2 text-villa-text/65">{t({ en: "Flexible daytime care from 9:00am to 8:00pm.", zh: "灵活日托，服务时间 9:00am 至 8:00pm。" })}</p>
              <div className="mt-6 font-title text-6xl font-black">RM5<span className="ml-2 font-body text-lg font-black text-villa-text/55">/hour</span></div>
              <a className="villa-button mt-6" href="/booking">{t({ en: "Book Now", zh: "立即预约" })}</a>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["DuitNow", "FPX", "TNG", "GrabPay", "Visa", "Mastercard"].map((method) => (
              <span key={method} className="rounded-pill border border-villa-line bg-white/70 px-4 py-2 text-sm font-black">{method}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="villa-section bg-villa-peach/20">
        <div className="villa-container">
          <h2 className="font-title text-5xl font-black">{t({ en: "How It Works", zh: "预约流程" })}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["1", { en: "Fill Details", zh: "填资料" }],
              ["2", { en: "Confirm", zh: "确认" }],
              ["3", { en: "Pay Deposit", zh: "付订金" }],
              ["4", { en: "Check In", zh: "入住" }]
            ].map(([num, label]) => (
              <article key={num as string} className="villa-card p-6">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-villa-coral text-xl font-black">{num as string}</div>
                <h3 className="mt-4 font-title text-3xl font-black">{t(label as { en: string; zh: string })}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="villa-section">
        <div className="villa-container grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="border-l-8 border-villa-coral pl-6">
            <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">{t({ en: "Owner Notice", zh: "主人须知" })}</span>
            <h2 className="mt-4 font-title text-5xl font-black">{t({ en: "A few notes before check-in", zh: "入住前请注意" })}</h2>
          </div>
          <div className="grid gap-3">
            {notices.map((notice) => (
              <div key={notice.en} className="rounded-[20px] border border-villa-line bg-white/70 p-4 font-bold text-villa-text/70">✓ {t(notice)}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="villa-section bg-white/40">
        <div className="villa-container">
          <h2 className="text-center font-title text-5xl font-black">{t({ en: "Loved by Ipoh pet parents", zh: "怡保宠主的安心选择" })}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.name} className="villa-card p-6">
                <div className="text-xl text-[#d9922e]">★★★★★</div>
                <p className="mt-4 font-bold leading-relaxed text-villa-text/70">“{t(review.quote)}”</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-villa-peach font-black">{review.name[0]}</div>
                  <div>
                    <strong>{review.name}</strong>
                    <p className="m-0 text-sm text-villa-text/55">{review.dog}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-villa-brown px-5 py-12 text-villa-peach sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-title text-3xl font-black">The Pet Villa</h3>
            <p className="mt-3 text-villa-peach/75">{t({ en: "Ipoh small dog boarding with no cages and 24h companionship.", zh: "怡保小型犬寄宿，不关笼，24小时陪伴。" })}</p>
          </div>
          <div>
            <h3 className="font-title text-2xl font-black">{t({ en: "Contact", zh: "联系" })}</h3>
            <p className="mt-3 text-villa-peach/75">WhatsApp · Instagram · Facebook</p>
          </div>
          <div>
            <h3 className="font-title text-2xl font-black">{t({ en: "Hours", zh: "营业时间" })}</h3>
            <p className="mt-3 text-villa-peach/75">Check-in 9:00am-8:00pm<br />Check-out before 12:00pm</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
