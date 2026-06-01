"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "./components/AppNav";
import { useLanguage } from "./components/LanguageProvider";
import { availableSlotsForDate, buildCapacityMap, MAX_DOGS_PER_DAY, startOfLocalDay } from "./lib/bookingCapacity";
import { getCurrentUserId } from "./lib/petProfiles";
import { readHomeGuestPhotos, type GuestPhoto } from "./lib/gallery";
import { claimVoucher, readVouchers } from "./lib/vouchers";

const phone = "+60165236409";
const whatsappUrl = "https://wa.me/60165236409?text=Hi%20Pet%20Villa%2C%20I%20would%20like%20to%20ask%20about%20boarding.";
const socialLinks = {
  whatsapp: whatsappUrl,
  instagram: "https://instagram.com/thepetvillaipoh", // TODO_UPDATE_SOCIAL_LINK
  facebook: "https://facebook.com/thepetvillaipoh", // TODO_UPDATE_SOCIAL_LINK
  xhs: "https://www.xiaohongshu.com/search_result?keyword=The%20Pet%20Villa%20Ipoh" // TODO_UPDATE_SOCIAL_LINK
};

type Copy = { en: string; zh: string };
type HomeIconName =
  | "moon"
  | "sun"
  | "paw"
  | "heart"
  | "dog"
  | "camera"
  | "shield"
  | "calendar"
  | "gift"
  | "friend"
  | "vaccine"
  | "food"
  | "no"
  | "flea"
  | "vet"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "xhs";

const services = [
  {
    id: "overnight",
    icon: "moon",
    title: { en: "Overnight Boarding", zh: "寄宿服务" },
    price: { en: "RM40 / night", zh: "RM40 / 晚" },
    details: {
      en: ["No cages", "Same-room sleeping", "24h companionship", "Daily photo updates"],
      zh: ["不关笼", "晚上一起睡", "24小时陪伴", "每日照片更新"]
    },
    href: "/booking?service=overnight",
    cta: { en: "Book Boarding", zh: "立即预约寄宿" }
  },
  {
    id: "daycare",
    icon: "sun",
    title: { en: "Daycare", zh: "日托服务" },
    price: { en: "RM5 / hour", zh: "RM5 / 小时" },
    details: {
      en: ["Daytime care", "9:00am - 8:00pm", "Safe activity space"],
      zh: ["白天照顾", "9:00am - 8:00pm", "安全活动空间"]
    },
    href: "/booking?service=daycare",
    cta: { en: "Book Daycare", zh: "立即预约日托" }
  }
] satisfies Array<{
  id: string;
  icon: HomeIconName;
  title: Copy;
  price: Copy;
  details: { en: string[]; zh: string[] };
  href: string;
  cta: Copy;
}>;

const promotions = [
  {
    code: "WELCOME10",
    icon: "gift",
    label: { en: "New Guest", zh: "新客专享" },
    title: { en: "RM10 OFF", zh: "RM10 OFF" },
    body: { en: "First boarding discount", zh: "首次寄宿优惠" }
  },
  {
    code: "SECOND50",
    icon: "dog",
    label: { en: "Multi-dog", zh: "多只家庭优惠" },
    title: { en: "50% OFF", zh: "50% OFF" },
    body: { en: "Second dog discount", zh: "第二只狗狗优惠" }
  },
  {
    code: "REFER10",
    icon: "friend",
    label: { en: "Referral", zh: "推荐好友" },
    title: { en: "RM10 Voucher", zh: "RM10 Voucher" },
    body: { en: "Both sides receive a voucher", zh: "双方各得优惠券" }
  }
] satisfies Array<{ code: string; icon: HomeIconName; label: Copy; title: Copy; body: Copy }>;

const whyItems = [
  {
    icon: "no",
    title: { en: "No Cages", zh: "不关笼" },
    body: { en: "Free movement in a calm home.", zh: "狗狗在宽敞的家庭空间自由活动" }
  },
  {
    icon: "heart",
    title: { en: "24h Care", zh: "24小时陪伴" },
    body: { en: "Owner care day and night.", zh: "白天晚上都有保姆陪伴照顾" }
  },
  {
    icon: "dog",
    title: { en: "1-12kg Only", zh: "仅接待 1-12kg" },
    body: { en: "Small dogs feel safer.", zh: "只接待小型犬，让狗狗更安心" }
  },
  {
    icon: "camera",
    title: { en: "Daily Updates", zh: "每日 3-5 次更新" },
    body: { en: "Photos and videos every day.", zh: "每天收到照片视频，让你安心" }
  },
  {
    icon: "shield",
    title: { en: "Safety First", zh: "安全第一" },
    body: { en: "Clean, checked, and loved.", zh: "环境清洁消毒，定期健康检查" }
  },
  {
    icon: "paw",
    title: { en: "Cozy Home", zh: "温馨家庭环境" },
    body: { en: "Soft beds and a calm home setting.", zh: "柔软床铺与安静家庭空间" }
  }
] satisfies Array<{ icon: HomeIconName; title: Copy; body: Copy }>;

const requirements = [
  { icon: "vaccine", title: { en: "Vaccinated", zh: "已打疫苗" } },
  { icon: "food", title: { en: "Bring Own Food", zh: "自备狗粮" } },
  { icon: "dog", title: { en: "Small Dogs 1-12kg", zh: "小型犬 1-12kg" } },
  { icon: "no", title: { en: "No Aggressive Dogs", zh: "不接攻击性犬" } },
  { icon: "flea", title: { en: "Flea Free", zh: "无跳蚤" } },
  { icon: "vet", title: { en: "Emergency Vet Support", zh: "紧急兽医支持" } }
] satisfies Array<{ icon: HomeIconName; title: Copy }>;

const reviews = [
  {
    name: "Grace Sam",
    pet: "Toy Poodle",
    date: "2026-05-18",
    rating: 5,
    quote: {
      en: "We received photos every day. My dog looked happy, safe, and relaxed. I will choose Pet Villa again!",
      zh: "每天都会收到照片，狗狗玩得很开心！第一次寄宿也很放心，会继续选择 Pet Villa！"
    }
  },
  {
    name: "Michelle Tan",
    pet: "French Bulldog",
    date: "2026-05-12",
    rating: 5,
    quote: {
      en: "Warm updates, clean home, and very thoughtful care for small dogs.",
      zh: "更新很温暖，环境干净，对小型犬照顾得很细心。"
    }
  },
  {
    name: "Rachel Lee",
    pet: "Maltese",
    date: "2026-05-05",
    rating: 5,
    quote: {
      en: "The booking was simple and my dog settled in quickly.",
      zh: "预约很简单，狗狗也很快适应，真的很安心。"
    }
  }
] satisfies Array<{ name: string; pet: string; date: string; rating: number; quote: Copy }>;

const galleryDogs = [
  { breed: "Poodle", color: "#f0b46e" },
  { breed: "French Bulldog", color: "#f8f1e9" },
  { breed: "Maltese", color: "#fffaf2" },
  { breed: "Corgi", color: "#e8a45d" },
  { breed: "Shih Tzu", color: "#d8b28a" },
  { breed: "Pomeranian", color: "#efc27e" }
];

function Icon({ name, className = "h-9 w-9" }: { name: HomeIconName; className?: string }) {
  const deep = "#3d1f0d";
  const coral = "#e8927c";
  const green = "#7a9e7e";

  if (name === "moon") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M42 45A20 20 0 0 1 25 13a23 23 0 1 0 26 26 20 20 0 0 1-9 6Z" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
        <path d="M47 13v8M43 17h8" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="12" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
        <path d="M32 6v9M32 49v9M6 32h9M49 32h9M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "paw") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <ellipse cx="32" cy="42" rx="13" ry="10" fill={coral} />
        <ellipse cx="17" cy="28" rx="6" ry="8" fill={coral} />
        <ellipse cx="28" cy="17" rx="6" ry="9" fill={coral} />
        <ellipse cx="40" cy="17" rx="6" ry="9" fill={coral} />
        <ellipse cx="49" cy="28" rx="6" ry="8" fill={coral} />
      </svg>
    );
  }
  if (name === "heart") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="27" fill="#fff3ef" />
        <path d="M32 47S17 38 17 27c0-7 9-10 15 0 6-10 15-7 15 0 0 11-15 20-15 20Z" fill={coral} />
      </svg>
    );
  }
  if (name === "no") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="20" fill="#fff3ef" stroke={coral} strokeWidth="5" />
        <path d="M19 19 45 45" stroke={coral} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "camera") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <rect x="12" y="23" width="40" height="28" rx="8" fill="#fff" stroke={deep} strokeWidth="3" />
        <path d="M23 23l4-6h10l4 6" fill="#f5c4b3" stroke={deep} strokeWidth="3" />
        <circle cx="32" cy="37" r="9" fill="#f5c4b3" stroke={coral} strokeWidth="3" />
        <circle cx="45" cy="30" r="2.5" fill={coral} />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M32 7 51 15v16c0 15-9 24-19 29-10-5-19-14-19-29V15l19-8Z" fill="#fff8f5" stroke={deep} strokeWidth="4" />
        <path d="m22 32 7 7 14-17" fill="none" stroke={coral} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "dog" || name === "friend") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="34" r="19" fill="#fff8f5" stroke={deep} strokeWidth="3" />
        <path d="M17 28c-7 1-10 9-7 15 3 6 11 5 13 0M47 28c7 1 10 9 7 15-3 6-11 5-13 0" fill="#d99864" />
        <circle cx="25" cy="35" r="2.5" fill={deep} />
        <circle cx="39" cy="35" r="2.5" fill={deep} />
        <ellipse cx="32" cy="43" rx="5" ry="3.5" fill={deep} />
        {name === "friend" ? <circle cx="48" cy="14" r="8" fill={coral} opacity="0.85" /> : null}
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <rect x="13" y="15" width="38" height="38" rx="7" fill="#fff8f5" stroke={coral} strokeWidth="3" />
        <path d="M13 26h38M23 10v10M41 10v10" stroke={coral} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "gift") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <rect x="12" y="26" width="40" height="28" rx="6" fill="#fff8f5" stroke={coral} strokeWidth="3" />
        <path d="M32 26v28M12 36h40" stroke={coral} strokeWidth="3" />
        <path d="M31 24c-12 0-13-13-4-13 5 0 5 8 5 13Zm2 0c12 0 13-13 4-13-5 0-5 8-5 13Z" fill="#f5c4b3" stroke={coral} strokeWidth="3" />
      </svg>
    );
  }
  if (name === "vaccine" || name === "food" || name === "flea" || name === "vet") {
    const label = name === "vaccine" ? "V" : name === "food" ? "F" : name === "flea" ? "X" : "+";
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="25" fill="#fff3ef" />
        <rect x="21" y="21" width="22" height="22" rx="6" fill="#fff8f5" stroke={deep} strokeWidth="3" />
        <text x="32" y="39" textAnchor="middle" fontSize="20" fontWeight="900" fill={coral}>{label}</text>
      </svg>
    );
  }
  if (name === "whatsapp" || name === "instagram" || name === "facebook" || name === "xhs") {
    const label = name === "whatsapp" ? "WA" : name === "instagram" ? "IG" : name === "facebook" ? "f" : "RED";
    const fill = name === "whatsapp" ? "#25D366" : name === "facebook" ? "#1877F2" : name === "xhs" ? "#ff2442" : "#e8927c";
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="26" fill={fill} />
        <text x="32" y="38" textAnchor="middle" fontSize={name === "xhs" ? "14" : "17"} fontWeight="900" fill="#fff">{label}</text>
      </svg>
    );
  }
  return null;
}

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <div className="flex gap-1 text-[#f5a623]" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className="text-base leading-none">{index < rating ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function DogPortrait({ breed, color, large = false }: { breed: string; color: string; large?: boolean }) {
  const isFrenchie = breed.includes("French");
  const isCorgi = breed.includes("Corgi");
  const isMaltese = breed.includes("Maltese");
  const isPoodle = breed.includes("Poodle");
  return (
    <svg viewBox="0 0 180 130" className="h-full w-full" aria-hidden="true">
      <rect width="180" height="130" rx="22" fill="#fff3ef" />
      <ellipse cx="92" cy="112" rx="58" ry="11" fill="#f5c4b3" opacity="0.35" />
      <circle cx="90" cy="62" r={large ? 38 : 34} fill={color} stroke="#3d1f0d" strokeWidth="3" />
      {isFrenchie ? (
        <>
          <path d="M55 30 38 7l3 39Z" fill={color} stroke="#3d1f0d" strokeWidth="3" />
          <path d="M125 30 142 7l-3 39Z" fill={color} stroke="#3d1f0d" strokeWidth="3" />
        </>
      ) : (
        <>
          <ellipse cx="55" cy="62" rx={isPoodle ? 19 : 15} ry={isPoodle ? 27 : 22} fill={isMaltese ? "#f4eadf" : "#c68553"} />
          <ellipse cx="125" cy="62" rx={isPoodle ? 19 : 15} ry={isPoodle ? 27 : 22} fill={isMaltese ? "#f4eadf" : "#c68553"} />
        </>
      )}
      {isCorgi ? <path d="M55 34 44 12l23 12M125 34l11-22-23 12" fill={color} stroke="#3d1f0d" strokeWidth="3" /> : null}
      <circle cx="78" cy="63" r="4" fill="#3d1f0d" />
      <circle cx="102" cy="63" r="4" fill="#3d1f0d" />
      <ellipse cx="90" cy="76" rx="8" ry="6" fill="#3d1f0d" />
      <path d="M80 86c7 7 14 7 21 0" fill="none" stroke="#3d1f0d" strokeWidth="3" strokeLinecap="round" />
      <path d="M31 104c7-1 12-5 16-13M149 104c-7-1-12-5-16-13" fill="none" stroke="#7a9e7e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function formatDay(date: Date, lang: "en" | "zh") {
  return lang === "zh"
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function couponKey() {
  return `pet-villa-coupons:${getCurrentUserId()}`;
}

function readCoupons() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(couponKey()) || "[]") as string[];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const { lang, t } = useLanguage();
  const [claimedCoupons, setClaimedCoupons] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeGallery, setActiveGallery] = useState(0);
  const [capacityMap, setCapacityMap] = useState<Record<string, number>>({});
  const [guestPhotos, setGuestPhotos] = useState<GuestPhoto[]>([]);
  const [couponMessage, setCouponMessage] = useState("");

  useEffect(() => {
    setClaimedCoupons(readVouchers().map((voucher) => voucher.code));
    setGuestPhotos(readHomeGuestPhotos(6));
    setCapacityMap(buildCapacityMap());
    const sync = () => setCapacityMap(buildCapacityMap());
    const syncVouchers = () => setClaimedCoupons(readVouchers().map((voucher) => voucher.code));
    const syncGallery = () => setGuestPhotos(readHomeGuestPhotos(6));
    window.addEventListener("pet-villa-orders", sync);
    window.addEventListener("pet-villa-vouchers", syncVouchers);
    window.addEventListener("pet-villa-gallery", syncGallery);
    return () => {
      window.removeEventListener("pet-villa-orders", sync);
      window.removeEventListener("pet-villa-vouchers", syncVouchers);
      window.removeEventListener("pet-villa-gallery", syncGallery);
    };
  }, []);

  const today = startOfLocalDay(new Date());
  const availabilityDays = useMemo(() => Array.from({ length: 4 }, (_, index) => addDays(today, index)), [today.getTime()]);
  const todaySlots = availableSlotsForDate(today, capacityMap);
  const activeReview = reviews[reviewIndex];

  function claimCoupon(code: string) {
    const result = claimVoucher(code);
    if (result.ok) {
      setClaimedCoupons(readVouchers().map((voucher) => voucher.code));
      setCouponMessage(t({ en: "Voucher added to My Vouchers.", zh: "优惠券已加入优惠券钱包。" }));
      return;
    }
    if (result.reason === "login") {
      setCouponMessage(t({ en: "Please login or register before claiming vouchers.", zh: "请先登录或注册后再领取优惠券。" }));
      return;
    }
    setCouponMessage(t({ en: "You have already claimed this voucher.", zh: "你已经领取过这张优惠券。" }));
  }

  function slotLabel(date: Date) {
    const slots = availableSlotsForDate(date, capacityMap);
    if (slots <= 0) return t({ en: "Full", zh: "满位" });
    if (slots === 1) return t({ en: "1 slot left", zh: "剩 1 位" });
    return t({ en: "Available", zh: "可预约" });
  }

  return (
    <div className="villa-shell paw-bg">
      <AppNav />

      <main className="pb-24 lg:pb-0">
        <section className="px-4 pb-5 pt-5 sm:px-6 lg:px-10">
          <div className="villa-container overflow-hidden rounded-[26px] border border-villa-primary-light bg-white/75 shadow-[0_14px_44px_rgba(61,31,13,0.08)]">
            <div className="relative grid gap-0 lg:min-h-[610px] lg:grid-cols-[1fr_0.95fr]">
              <div className="relative z-10 px-4 pb-4 pt-7 sm:px-7 lg:px-8 lg:py-14">
                <div className="inline-flex rounded-pill bg-villa-primary-light/80 px-4 py-2 text-[11px] font-black uppercase text-villa-text-primary">
                  The Pet Villa · Ipoh · Pet Boarding
                </div>
                <h1 className="mt-5 max-w-[330px] font-title text-[34px] font-black leading-[1.05] text-villa-text-primary sm:text-[44px] lg:max-w-[560px] lg:text-[64px]">
                  {t({ en: "Cage Free · 24h Care", zh: "不关笼 · 24小时陪伴" })}
                  <span className="ml-2 text-villa-primary">♡</span>
                </h1>
                <p className="mt-3 text-[15px] font-black text-villa-text-primary sm:text-lg">
                  {t({ en: "Premium small dog boarding in Ipoh", zh: "怡保精品小型犬寄宿" })}
                </p>
                <ul className="mt-4 grid gap-2 text-[13px] font-bold leading-relaxed text-villa-text-primary sm:text-sm">
                  {[
                    { en: "Only 3 dogs per day", zh: "一天只接待 3 只狗狗" },
                    { en: "3-5 photo/video updates daily", zh: "每日 3-5 次照片视频更新" },
                    { en: "Only small dogs from 1-12kg", zh: "仅接待 1-12kg 小型犬" }
                  ].map((item) => (
                    <li key={item.en} className="flex items-center gap-2">
                      <Icon name="paw" className="h-4 w-4 shrink-0" />
                      {t(item)}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-[560px]">
                  {services.map((service) => (
                    <a
                      key={service.id}
                      href={service.href}
                      className="rounded-[22px] border border-villa-primary-light bg-white/88 p-4 shadow-[0_10px_30px_rgba(61,31,13,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        <Icon name={service.icon} className="h-11 w-11 shrink-0" />
                        <div className="min-w-0">
                          <h2 className="text-sm font-black text-villa-text-primary">{t(service.title)}</h2>
                          <p className="mt-1 text-[26px] font-black leading-none text-villa-primary">{t(service.price)}</p>
                        </div>
                      </div>
                      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold text-villa-text-primary">
                        {service.details[lang].map((detail) => (
                          <li key={detail} className="flex items-center gap-1.5">
                            <span className="text-villa-accent-green">✓</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                      <span className="villa-button mt-4 min-h-[40px] w-full text-xs">{t(service.cta)}</span>
                    </a>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 lg:max-w-[560px]">
                  <a className="villa-button min-h-[46px] text-sm" href="/booking?service=overnight">
                    {t({ en: "Book Boarding", zh: "立即预约寄宿" })}
                  </a>
                  <a className="villa-button-outline min-h-[46px] bg-white/65 text-sm" href={whatsappUrl} target="_blank" rel="noreferrer">
                    WhatsApp {t({ en: "Ask", zh: "咨询" })}
                  </a>
                </div>
              </div>

              <div className="relative min-h-[250px] lg:min-h-full">
                <img src="/hero-dogs.png" alt="Poodle and French Bulldog at The Pet Villa" className="absolute inset-0 h-full w-full object-cover object-[50%_68%]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,245,0.08)_0%,rgba(255,248,245,0.0)_45%,#fff8f5_100%)] lg:bg-[linear-gradient(90deg,#fff8f5_0%,rgba(255,248,245,0.2)_28%,rgba(255,248,245,0)_100%)]" />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="villa-container rounded-[24px] border border-villa-primary-light bg-white/86 p-4 shadow-[0_10px_34px_rgba(61,31,13,0.08)]">
            <div className="grid gap-4 lg:grid-cols-[180px_1fr_96px] lg:items-center">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-villa-primary-bg">
                  <Icon name="dog" className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-base font-black text-villa-text-primary">{t({ en: "Today Availability", zh: "今日名额" })}</h2>
                  <p className="mt-1 text-xl font-black text-villa-text-primary">
                    {Math.max(0, todaySlots)} / {MAX_DOGS_PER_DAY} {t({ en: "dogs left", zh: "只狗狗" })}
                  </p>
                  <div className="mt-2 h-2 w-24 overflow-hidden rounded-full bg-villa-primary-light/45">
                    <span className="block h-full rounded-full bg-villa-primary" style={{ width: `${Math.max(0, todaySlots / MAX_DOGS_PER_DAY) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {availabilityDays.map((date) => {
                  const slots = availableSlotsForDate(date, capacityMap);
                  const isFull = slots <= 0;
                  return (
                    <a key={date.toISOString()} href="/booking" className="rounded-[14px] border border-villa-primary-light bg-white/75 px-2 py-3 text-center transition hover:-translate-y-px hover:shadow-md">
                      <span className="block text-[10px] font-black text-villa-text-primary">{formatDay(date, lang)}</span>
                      <strong className={`mt-2 block text-[12px] font-black ${isFull ? "text-red-500" : slots === 1 ? "text-orange-500" : "text-villa-accent-green"}`}>
                        {slotLabel(date)}
                      </strong>
                    </a>
                  );
                })}
              </div>
              <a className="villa-button-outline min-h-[42px] w-full bg-white text-xs" href="/booking">
                <Icon name="calendar" className="h-4 w-4" />
                {t({ en: "View Calendar", zh: "查看日历" })}
              </a>
            </div>
          </div>
        </section>

        <section id="promotions" className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="villa-container rounded-[24px] border border-villa-primary-light bg-white/86 p-4 shadow-[0_10px_34px_rgba(61,31,13,0.08)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-title text-xl font-black text-villa-text-primary">{t({ en: "Promotions", zh: "精选优惠" })}</h2>
              <a href="/vouchers" className="text-xs font-black text-villa-primary">{t({ en: "My Vouchers", zh: "我的优惠券" })}</a>
            </div>
            {couponMessage ? <p className="mb-3 rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{couponMessage}</p> : null}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {promotions.map((promo) => {
                const claimed = claimedCoupons.includes(promo.code);
                return (
                  <article key={promo.code} className="flex min-h-[178px] flex-col rounded-[18px] border border-villa-primary-light bg-villa-primary-bg/70 p-3 shadow-sm">
                    <span className="inline-flex rounded-pill bg-white px-2 py-1 text-[9px] font-black text-villa-primary">{t(promo.label)}</span>
                    <Icon name={promo.icon} className="mt-2 h-10 w-10" />
                    <h3 className="mt-2 text-[15px] font-black leading-tight text-villa-text-primary">{t(promo.title)}</h3>
                    <p className="mt-1 min-h-[30px] text-[10px] font-bold leading-tight text-villa-text-secondary">{t(promo.body)}</p>
                    <button type="button" className={`mt-auto min-h-[34px] w-full rounded-pill text-[11px] font-black ${claimed ? "bg-villa-accent-green text-white" : "bg-villa-primary text-white"}`} onClick={() => claimCoupon(promo.code)}>
                      {claimed ? t({ en: "CLAIMED", zh: "已领取" }) : "CLAIM"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="villa-container rounded-[24px] border border-villa-primary-light bg-white/86 p-4 shadow-[0_10px_34px_rgba(61,31,13,0.08)]">
            <h2 className="mb-4 font-title text-xl font-black text-villa-text-primary">
              {t({ en: "Why Choose Pet Villa", zh: "为什么选择 Pet Villa" })}
            </h2>
            <div className="grid grid-cols-3 overflow-hidden rounded-[20px] border border-villa-primary-light sm:grid-cols-6">
              {whyItems.map((item, index) => (
                <article key={item.title.en} className={`min-h-[128px] border-b border-r border-villa-primary-light/70 bg-white/50 p-3 text-center ${index > 2 ? "border-b-0" : ""} sm:border-b-0`}>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-villa-primary-bg shadow-sm">
                    <Icon name={item.icon} className="h-8 w-8" />
                  </div>
                  <h3 className="mt-2 text-[12px] font-black leading-tight text-villa-text-primary">{t(item.title)}</h3>
                  <p className="mt-1 text-[10px] font-bold leading-tight text-villa-text-secondary">{t(item.body)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="villa-container rounded-[24px] border border-villa-primary-light bg-white/86 p-4 shadow-[0_10px_34px_rgba(61,31,13,0.08)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-title text-xl font-black text-villa-text-primary">{t({ en: "Pet Owner Reviews", zh: "宠主评价" })}</h2>
              <button type="button" className="text-xs font-black text-villa-primary" onClick={() => setReviewsOpen(true)}>
                {t({ en: "View All", zh: "查看全部" })} →
              </button>
            </div>
            <div className="rounded-[20px] bg-villa-primary-bg/70 p-4">
              <Stars rating={activeReview.rating} />
              <p className="mt-3 text-sm font-bold leading-relaxed text-villa-text-primary">“{t(activeReview.quote)}”</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full">
                    <DogPortrait breed={activeReview.pet} color="#f0b46e" />
                  </div>
                  <div>
                    <strong className="block text-sm font-black">{activeReview.name}</strong>
                    <span className="text-xs font-bold text-villa-text-secondary">{activeReview.pet}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {reviews.map((review, index) => (
                    <button
                      key={review.name}
                      type="button"
                      className={`h-2.5 w-2.5 rounded-full ${index === reviewIndex ? "bg-villa-primary" : "bg-villa-primary-light"}`}
                      onClick={() => setReviewIndex(index)}
                      aria-label={`Show review ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="villa-container rounded-[24px] border border-villa-primary-light bg-white/86 p-4 shadow-[0_10px_34px_rgba(61,31,13,0.08)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-title text-xl font-black text-villa-text-primary">{t({ en: "Happy Guests", zh: "快乐小客人" })}</h2>
              <a className="text-xs font-black text-villa-primary" href="/gallery">
                {t({ en: "View All", zh: "查看全部" })} →
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {guestPhotos.map((dog, index) => (
                <button
                  key={dog.id}
                  type="button"
                  className="h-24 overflow-hidden rounded-[16px] border border-villa-primary-light bg-white shadow-sm transition hover:-translate-y-px hover:shadow-md sm:h-28"
                  onClick={() => {
                    setActiveGallery(index);
                    setGalleryOpen(true);
                  }}
                  aria-label={`Open ${dog.petName} gallery photo`}
                >
                  {dog.imageUrl ? <img src={dog.imageUrl} alt={dog.petName} className="h-full w-full object-cover" /> : <DogPortrait breed={dog.breed} color={dog.color} />}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="villa-container rounded-[24px] border border-villa-primary-light bg-white/86 p-4 shadow-[0_10px_34px_rgba(61,31,13,0.08)]">
            <h2 className="mb-4 font-title text-xl font-black text-villa-text-primary">{t({ en: "Boarding Requirements", zh: "入住前须知" })}</h2>
            <div className="grid grid-cols-3 overflow-hidden rounded-[20px] border border-villa-primary-light">
              {requirements.map((item, index) => (
                <div key={item.title.en} className={`grid min-h-[92px] place-items-center border-b border-r border-villa-primary-light/70 bg-white/50 p-2 text-center ${index >= 3 ? "border-b-0" : ""}`}>
                  <Icon name={item.icon} className="h-9 w-9" />
                  <strong className="text-[10px] font-black leading-tight text-villa-text-primary">{t(item.title)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-villa-host-dark px-4 pb-28 pt-6 text-villa-primary-light sm:px-6 lg:pb-6 lg:px-10">
        <div className="villa-container grid gap-5 text-xs font-semibold sm:grid-cols-4">
          <div>
            <h2 className="font-title text-lg font-black text-white">The Pet Villa</h2>
            <p className="mt-1 text-villa-primary-light/80">{t({ en: "Premium small dog boarding in Ipoh", zh: "怡保精品小型犬寄宿" })}</p>
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{t({ en: "Contact Us", zh: "联系我们" })}</h3>
            <a className="mt-1 block hover:text-white" href={`tel:${phone}`}>{phone}</a>
            <a className="block hover:text-white" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="block hover:text-white" href="mailto:PetVillaIpoh@gmail.com">PetVillaIpoh@gmail.com</a>
            <p className="m-0">Ipoh, Perak</p>
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{t({ en: "Hours", zh: "营业时间" })}</h3>
            <p className="mt-1">Check-in: 9:00am - 8:00pm</p>
            <p className="m-0">Check-out: before 12:00pm</p>
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{t({ en: "Follow Us", zh: "关注我们" })}</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(socialLinks).map(([key, href]) => (
                <a key={key} href={href} target="_blank" rel="noreferrer" className="flex min-h-[42px] items-center gap-2 rounded-[14px] bg-white/10 px-3 transition hover:-translate-y-px hover:bg-white/20" aria-label={key}>
                  <Icon name={key as HomeIconName} className="h-6 w-6" />
                  <span className="text-[11px] font-black capitalize text-white">{key === "xhs" ? "Xiaohongshu" : key}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-villa-primary-light bg-villa-background/95 p-3 shadow-[0_-10px_28px_rgba(61,31,13,0.10)] backdrop-blur lg:hidden">
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="villa-button-outline min-h-[44px] bg-white text-xs">
          WhatsApp {t({ en: "Ask", zh: "咨询" })}
        </a>
        <a href="/booking?service=overnight" className="villa-button min-h-[44px] text-xs">
          {t({ en: "Book Boarding", zh: "立即预约寄宿" })}
        </a>
      </div>

      {reviewsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-villa-text-primary/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[86vh] w-full max-w-lg overflow-auto rounded-[24px] border border-villa-primary-light bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-title text-xl font-black">{t({ en: "All Reviews", zh: "全部评价" })}</h2>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-villa-primary-light font-black" onClick={() => setReviewsOpen(false)}>×</button>
            </div>
            <div className="grid gap-3">
              {reviews.map((review) => (
                <article key={review.name} className="rounded-[18px] bg-villa-primary-bg p-4">
                  <Stars rating={review.rating} />
                  <p className="mt-2 text-sm font-bold leading-relaxed">“{t(review.quote)}”</p>
                  <p className="mt-3 text-xs font-black">{review.name} · {review.pet} · {review.date}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {galleryOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-villa-text-primary/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-[24px] border border-villa-primary-light bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-title text-xl font-black">{galleryDogs[activeGallery]?.breed || t({ en: "Gallery", zh: "相册" })}</h2>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-villa-primary-light font-black" onClick={() => setGalleryOpen(false)}>×</button>
            </div>
            <div className="h-[330px] overflow-hidden rounded-[22px] bg-villa-primary-bg">
              <DogPortrait breed={galleryDogs[activeGallery]?.breed || "Poodle"} color={galleryDogs[activeGallery]?.color || "#f0b46e"} large />
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {galleryDogs.map((dog, index) => (
                <button key={dog.breed} type="button" className={`h-14 overflow-hidden rounded-[12px] border ${index === activeGallery ? "border-villa-primary" : "border-villa-primary-light"}`} onClick={() => setActiveGallery(index)}>
                  <DogPortrait breed={dog.breed} color={dog.color} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
