"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "./components/AppNav";
import { useLanguage } from "./components/LanguageProvider";
import { startOfLocalDay } from "./lib/bookingCapacity";
import { getCurrentUser } from "./lib/petProfiles";
import { avatarToImageSrc, readProfileAvatar } from "./lib/profileAvatar";
import { isHostOffDay, loadHostOffDays } from "./lib/hostAvailability";
import { loadPublicReviews, readPublicReviews, type PublicReview } from "./lib/reviews";
import { loadOrders, readOrders, type VillaOrder } from "./lib/orderFlow";
import { loadBusinessSettings, type BusinessSettings } from "./lib/businessSettings";

const phone = "+601163830339";
const whatsappUrl = "https://wa.me/601163830339";
const socialLinks = {
  whatsapp: whatsappUrl,
  instagram: "https://www.instagram.com/thepetvilla_boarding?igsh=MWtjMjd4MmdjMmQ0NA%3D%3D&utm_source=qr",
  facebook: "https://www.instagram.com/thepetvilla_boarding?igsh=MWtjMjd4MmdjMmQ0NA%3D%3D&utm_source=qr",
  xhs: "https://xhslink.cn/m/72j2fF2R1x1"
};

type Copy = { en: string; zh: string };
type AvailabilityStatus = "loading" | "ready" | "refreshing" | "stale" | "error";
type HomeIconName =
  | "moon"
  | "sun"
  | "paw"
  | "heart"
  | "dog"
  | "camera"
  | "shield"
  | "calendar"
  | "orders"
  | "gift"
  | "friend"
  | "chat"
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
    details: {
      en: ["No cages", "Same-room sleeping", "24h companionship", "Daily photo updates"],
      zh: ["不关笼", "晚上一起睡", "24小时陪伴", "每日照片更新"]
    },
    href: "/booking?service=overnight",
    cta: { en: "Book Now", zh: "立即预约" }
  },
  {
    id: "daycare",
    icon: "sun",
    title: { en: "Daycare", zh: "日托服务" },
    details: {
      en: ["Daytime care", "9:00am - 8:00pm", "Safe activity space"],
      zh: ["白天照顾", "9:00am - 8:00pm", "安全活动空间"]
    },
    href: "/booking?service=daycare",
    cta: { en: "Book Now", zh: "立即预约" }
  }
] satisfies Array<{
  id: string;
  icon: HomeIconName;
  title: Copy;
  price?: Copy;
  details: { en: string[]; zh: string[] };
  href: string;
  cta: Copy;
}>;

const whyItems = [
  {
    icon: "no",
    title: { en: "No Cages", zh: "不关笼" },
    body: { en: "Free movement in a calm home.", zh: "宠物在宽敞的家庭空间自由活动" }
  },
  {
    icon: "heart",
    title: { en: "24h Care", zh: "24小时陪伴" },
    body: { en: "Owner care day and night.", zh: "白天晚上都有保姆陪伴照顾" }
  },
  {
    icon: "dog",
    title: { en: "1-12kg Only", zh: "仅接待 1-12kg" },
    body: { en: "Small pets feel safer.", zh: "只接待小型宠物，让宠物更安心" }
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
  if (name === "chat") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M14 15h36a8 8 0 0 1 8 8v15a8 8 0 0 1-8 8H32L20 54v-8h-6a8 8 0 0 1-8-8V23a8 8 0 0 1 8-8Z" fill="#fff8f5" stroke={coral} strokeWidth="4" strokeLinejoin="round" />
        <path d="M20 28h24M20 36h16" stroke={deep} strokeWidth="4" strokeLinecap="round" />
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
  if (name === "orders") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <rect x="14" y="10" width="36" height="44" rx="10" fill="#fff8f5" stroke={coral} strokeWidth="4" />
        <path d="M23 22h18M23 32h18M23 42h11" stroke={deep} strokeWidth="4" strokeLinecap="round" />
        <circle cx="44" cy="44" r="9" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
        <path d="m40 44 3 3 6-7" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
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

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatReviewDate(value: string, lang: "en" | "zh") {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default function HomePage() {
  const { lang, setLang, t } = useLanguage();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewTouchStart, setReviewTouchStart] = useState<number | null>(null);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("loading");
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [today, setToday] = useState<Date | null>(null);
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [homeUserName, setHomeUserName] = useState("");
  const [homeUserAvatar, setHomeUserAvatar] = useState(avatarToImageSrc());
  const [homeOrders, setHomeOrders] = useState<VillaOrder[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [pricingStatus, setPricingStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setToday(startOfLocalDay(new Date()));
  }, []);

  useEffect(() => {
    let active = true;
    setAvailabilityStatus((current) => current === "ready" || current === "stale" ? "refreshing" : "loading");
    void loadHostOffDays()
      .then((days) => {
        if (!active) return;
        setOffDays(days);
        setAvailabilityStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setAvailabilityStatus((current) => current === "refreshing" ? "stale" : "error");
      });
    return () => {
      active = false;
    };
  }, [availabilityRefreshKey]);

  useEffect(() => {
    let active = true;
    setPublicReviews(readPublicReviews());
    void loadPublicReviews()
      .then((nextReviews) => setPublicReviews(nextReviews))
      .catch(() => undefined)
      .finally(() => setReviewsLoading(false));
    const syncBusinessSettings = () => {
      setPricingStatus("loading");
      void loadBusinessSettings()
        .then((settings) => {
          if (!active) return;
          setBusinessSettings(settings);
          setPricingStatus("ready");
        })
        .catch(() => {
          if (!active) return;
          setPricingStatus("error");
        });
    };
    const syncHomeUser = () => {
      const user = getCurrentUser();
      setHomeUserName(user?.name || "");
      setHomeUserAvatar(user?.id ? avatarToImageSrc(readProfileAvatar(user.id, user.profileAvatar)) : avatarToImageSrc());
    };
    const syncHomeOrders = () => {
      setHomeOrders(readOrders());
      if (!getCurrentUser()?.id) return;
      void loadOrders().then((orders) => setHomeOrders(orders)).catch(() => undefined);
    };
    syncHomeUser();
    syncHomeOrders();
    const sync = () => {
      syncHomeOrders();
    };
    const syncAvailability = () => setAvailabilityRefreshKey((current) => current + 1);
    const syncReviews = () => {
      setPublicReviews(readPublicReviews());
      setReviewsLoading(true);
      void loadPublicReviews()
        .then((nextReviews) => setPublicReviews(nextReviews))
        .catch(() => undefined)
        .finally(() => setReviewsLoading(false));
    };
    syncBusinessSettings();
    window.addEventListener("pet-villa-orders", sync);
    window.addEventListener("pet-villa-reviews", syncReviews);
    window.addEventListener("pet-villa-availability", syncAvailability);
    window.addEventListener("pet-villa-auth", syncHomeUser);
    window.addEventListener("pet-villa-pets", syncHomeUser);
    window.addEventListener("pet-villa-host-settings", syncBusinessSettings);
    return () => {
      active = false;
      window.removeEventListener("pet-villa-orders", sync);
      window.removeEventListener("pet-villa-reviews", syncReviews);
      window.removeEventListener("pet-villa-availability", syncAvailability);
      window.removeEventListener("pet-villa-auth", syncHomeUser);
      window.removeEventListener("pet-villa-pets", syncHomeUser);
      window.removeEventListener("pet-villa-host-settings", syncBusinessSettings);
    };
  }, []);

  const availabilityDays = useMemo(
    () => today ? Array.from({ length: 7 }, (_, index) => addDays(today, index)) : [],
    [today]
  );
  const availabilityKnown = availabilityStatus === "ready" || availabilityStatus === "refreshing" || availabilityStatus === "stale";
  const todayFull = Boolean(today && availabilityKnown && isHostOffDay(localDateKey(today), offDays));
  const todayAvailabilityTone = !availabilityKnown ? "text-villa-text-secondary" : todayFull ? "text-red-500" : "text-villa-accent-green";
  const displayReviews = publicReviews;
  const activeReview = displayReviews.length ? displayReviews[reviewIndex % displayReviews.length] : null;
  const dashboardName = homeUserName ? homeUserName.split(" ")[0] : "Pet Villa";
  const isHomeLoggedIn = Boolean(homeUserName);
  const pricingReady = pricingStatus === "ready" && businessSettings !== null;
  const servicePrice = (serviceId: string) => {
    if (!pricingReady || !businessSettings) {
      return pricingStatus === "error"
        ? t({ en: "Price unavailable", zh: "价格暂时无法读取" })
        : t({ en: "Loading price...", zh: "正在读取价格..." });
    }
    return serviceId === "overnight"
      ? t({ en: `RM${businessSettings.boardingRate} / night`, zh: `RM${businessSettings.boardingRate} / 晚` })
      : t({ en: `RM${businessSettings.daycareRate} / hour`, zh: `RM${businessSettings.daycareRate} / 小时` });
  };

  function moveReview(direction: 1 | -1) {
    if (displayReviews.length < 2) return;
    setReviewIndex((index) => (index + direction + displayReviews.length) % displayReviews.length);
  }

  function handleSwipe(startX: number, endX: number, callback: (direction: 1 | -1) => void) {
    const delta = endX - startX;
    if (Math.abs(delta) < 35) return;
    callback(delta < 0 ? 1 : -1);
  }

  function slotLabel(date: Date) {
    if (!availabilityKnown) {
      return availabilityStatus === "error"
        ? t({ en: "Unavailable", zh: "暂时无法读取" })
        : t({ en: "Checking...", zh: "查询中..." });
    }
    if (isHostOffDay(localDateKey(date), offDays)) return t({ en: "Full", zh: "已满" });
    return t({ en: "Available", zh: "可预约" });
  }

  function todayAvailabilityLabel() {
    if (!availabilityKnown) {
      return availabilityStatus === "error"
        ? t({ en: "Unavailable", zh: "暂时无法读取" })
        : t({ en: "Checking...", zh: "查询中..." });
    }
    return todayFull ? t({ en: "Full", zh: "已满" }) : t({ en: "Available", zh: "可预约" });
  }

  return (
    <div className="villa-shell pet-dream-bg">
      <div className="hidden lg:block">
        <AppNav />
      </div>

      <main className="pet-mobile-app">
        <section className="grid gap-4 lg:hidden">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a href="/" className="pet-logo-badge" aria-label="The Pet Villa home">
                <img src="/petvilla-app-badge.webp" alt="The Pet Villa" className="h-full w-full object-cover" />
              </a>
              <div>
                <p className="text-[12px] font-black text-[#8d65da]">{t({ en: "Hello", zh: "欢迎" })}, {dashboardName}</p>
                <h1 className="m-0 font-title text-[28px] font-black leading-none text-villa-text-primary">The Pet Villa</h1>
                <div className="pet-language-pill" aria-label="Language">
                  <button type="button" data-active={lang === "en"} onClick={() => setLang("en")}>EN</button>
                  <button type="button" data-active={lang === "zh"} onClick={() => setLang("zh")}>中文</button>
                </div>
              </div>
            </div>
            {isHomeLoggedIn ? (
              <div className="flex items-center gap-2">
                <a href="/diary" className="pet-round-action pet-clickable text-[11px] font-black text-[#8d65da]" aria-label="Pet Diary">
                  <Icon name="camera" className="h-6 w-6" />
                </a>
                <a href="/orders" className="pet-round-action pet-clickable text-[11px] font-black text-[#8d65da]" aria-label="Orders">
                  <Icon name="orders" className="h-6 w-6" />
                </a>
                <a href="/account" className="pet-round-action pet-clickable overflow-hidden" aria-label="Account">
                  <img src={homeUserAvatar} alt="" className="h-full w-full object-cover" />
                </a>
              </div>
            ) : (
              <div className="home-auth-actions" aria-label="Account actions">
                <a href="/auth?mode=login">{t({ en: "Login", zh: "登入" })}</a>
                <a href="/auth?mode=register" data-primary="true">{t({ en: "Register", zh: "注册" })}</a>
              </div>
            )}
          </header>

          <a href="/booking" className="pet-clickable flex min-h-[52px] items-center gap-3 rounded-[24px] border border-white/90 bg-white/90 px-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2e7ff]">
              <Icon name="calendar" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-black text-villa-text-muted">{t({ en: "Search dates, daycare, boarding...", zh: "搜索日期、日托、寄宿..." })}</span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ffb84d] shadow-[0_8px_16px_rgba(255,184,77,0.26)]">
              <Icon name="paw" className="h-5 w-5" />
            </span>
          </a>

          <nav className="grid grid-cols-4 gap-3">
            {[
              { href: "/booking?service=overnight", icon: "moon" as HomeIconName, label: t({ en: "Boarding", zh: "寄宿" }), color: "#ffe1bd" },
              { href: "/booking?service=daycare", icon: "sun" as HomeIconName, label: t({ en: "Daycare", zh: "日托" }), color: "#fff0d5" },
              { href: "/pets", icon: "dog" as HomeIconName, label: t({ en: "My Pets", zh: "宠物" }), color: "#ead8ff" },
              { href: "/chat", icon: "chat" as HomeIconName, label: t({ en: "Chat", zh: "聊天" }), color: "#dff2e1" }
            ].map((item) => (
              <a key={item.href} href={item.href} className="pet-dashboard-tile pet-clickable grid min-h-[88px] place-items-center text-center" style={{ background: item.color }}>
                <span className="pet-icon-bubble h-12 w-12">
                  <Icon name={item.icon} className="h-7 w-7" />
                </span>
                <span className="text-[11px] font-black leading-tight text-villa-text-primary">{item.label}</span>
              </a>
            ))}
          </nav>

          <section className="pet-dashboard-card overflow-hidden">
            <div className="pet-banner-live min-h-[210px]">
              <img src="/petvilla-dashboard-banner.webp" alt="The Pet Villa cozy small dog care" className="absolute inset-0 h-full w-full object-cover object-[34%_52%]" />
              <div className="absolute inset-y-0 right-0 z-10 flex w-[43%] flex-col justify-center p-4">
                <p className="text-[11px] font-black uppercase leading-tight text-[#6c4aba]">{t({ en: "Good Morning", zh: "早安" })}</p>
                <h2 className="mt-1 font-title text-[24px] font-black leading-[1.02] text-villa-text-primary">{t({ en: "Ready for a cozy stay?", zh: "准备好温馨入住了吗？" })}</h2>
                <a href="/booking" className="home-hero-cta pet-primary-cta mt-4 inline-flex min-h-[44px] items-center justify-center px-4 text-[12px] font-black">{t({ en: "Book Now", zh: "立即预约" })}</a>
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-title text-[24px] font-black text-villa-text-primary">{t({ en: "Services", zh: "服务" })}</h2>
              <a href="/services" className="pet-mini-link pet-clickable">{t({ en: "See all", zh: "查看全部" })}</a>
            </div>
            <div className="grid gap-3">
              {services.map((service, index) => (
                <a key={service.id} href={service.href} className="pet-service-row pet-clickable grid grid-cols-[58px_1fr_auto] items-center gap-3">
                  <span className="pet-icon-bubble h-14 w-14" style={{ background: index === 0 ? "#fff0d5" : "#f2e7ff" }}>
                    <Icon name={service.icon} className="h-9 w-9" />
                  </span>
                  <span>
                    <strong className="block text-[15px] font-black leading-tight text-villa-text-primary">{t(service.title)}</strong>
                    <span className="mt-1 block text-[12px] font-bold text-villa-text-secondary">{index === 0 ? t({ en: "No cages, same-room sleeping", zh: "不关笼，同房陪睡" }) : t({ en: "Daytime care, 9am - 8pm", zh: "日间照顾，9am - 8pm" })}</span>
                  </span>
                  <span className="text-right">
                    <strong className="block text-[18px] font-black leading-none text-[#d97867]">{servicePrice(service.id)}</strong>
                    <span className="mt-2 inline-flex rounded-full bg-[#f2e7ff] px-2 py-1 text-[10px] font-black text-[#8d65da] shadow-[inset_0_-3px_6px_rgba(183,142,255,0.18)]">{t({ en: "Book", zh: "预约" })}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-title text-[24px] font-black text-villa-text-primary">{t({ en: "This Week", zh: "本周" })}</h2>
              {availabilityStatus === "error" ? (
                <button type="button" className="pet-mini-link pet-clickable" onClick={() => setAvailabilityRefreshKey((current) => current + 1)}>
                  {t({ en: "Retry", zh: "重试" })}
                </button>
              ) : (
                <a href="/booking" className="pet-mini-link pet-clickable">{t({ en: "Calendar", zh: "日历" })}</a>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {today ? availabilityDays.map((date) => {
                const off = isHostOffDay(localDateKey(date), offDays);
                return (
                  <a
                    key={date.toISOString()}
                    href={availabilityKnown ? (off ? "/booking" : `/booking?date=${localDateKey(date)}`) : undefined}
                    aria-disabled={!availabilityKnown}
                    className={`pet-dashboard-tile min-w-[82px] bg-white/90 text-center ${availabilityKnown ? "pet-clickable" : "pointer-events-none opacity-70"}`}
                  >
                    <span className="text-[10px] font-black text-villa-text-muted">{formatDay(date, lang)}</span>
                    <strong className={`mt-2 block text-[12px] font-black ${!availabilityKnown ? "text-villa-text-secondary" : off ? "text-red-500" : "text-villa-accent-green"}`}>{slotLabel(date)}</strong>
                  </a>
                );
              }) : Array.from({ length: 7 }, (_, index) => (
                <div key={`availability-placeholder-${index}`} className="pet-dashboard-tile min-w-[82px] animate-pulse bg-white/90" aria-hidden="true" />
              ))}
            </div>
            {availabilityStatus === "stale" ? <p className="m-0 text-[11px] font-bold text-villa-text-secondary">{t({ en: "Unable to refresh — showing last known availability.", zh: "暂时无法刷新，正在显示上次同步的预约状态。" })}</p> : null}
            {availabilityStatus === "error" ? <p className="m-0 text-[11px] font-bold text-red-600" role="alert">{t({ en: "Availability is temporarily unavailable. Please retry before booking.", zh: "预约状态暂时无法读取，请重试后再预约。" })}</p> : null}
          </section>

          <section className="pet-dashboard-card overflow-hidden bg-[#fffaf4] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-title text-[24px] font-black text-villa-text-primary">{t({ en: "Pet Owner Reviews", zh: "宠主评价" })}</h2>
              <button type="button" className="pet-mini-link pet-clickable disabled:cursor-not-allowed disabled:opacity-45" disabled={!displayReviews.length} onClick={() => setReviewsOpen(true)}>{t({ en: "View", zh: "查看" })}</button>
            </div>
            <div
              className="mt-3 rounded-[26px] bg-[#f2e7ff] p-4 shadow-[inset_0_-8px_14px_rgba(255,255,255,0.28)]"
              onTouchStart={(event) => setReviewTouchStart(event.touches[0]?.clientX ?? null)}
              onTouchEnd={(event) => {
                if (reviewTouchStart === null) return;
                handleSwipe(reviewTouchStart, event.changedTouches[0]?.clientX ?? reviewTouchStart, moveReview);
                setReviewTouchStart(null);
              }}
            >
              {activeReview ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={activeReview.rating} />
                    {displayReviews.length > 1 ? (
                      <div className="flex gap-2">
                        <button type="button" className="pet-review-arrow" onClick={() => moveReview(-1)} aria-label="Previous review">‹</button>
                        <button type="button" className="pet-review-arrow" onClick={() => moveReview(1)} aria-label="Next review">›</button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[13px] font-black leading-relaxed text-villa-text-primary">“{t(activeReview.quote)}”</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-[17px] bg-white shadow-[0_9px_18px_rgba(61,31,13,0.10)]">
                      {activeReview.photo ? <img src={activeReview.photo} alt={activeReview.dogName || activeReview.pet} className="h-full w-full object-cover" /> : <DogPortrait breed={activeReview.breed || activeReview.pet} color="#f0b46e" />}
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-[12px] font-black text-[#8d65da]">{activeReview.name} · {activeReview.dogName || activeReview.pet}</strong>
                      <span className="block truncate text-[10px] font-bold text-villa-text-secondary">{activeReview.breed || activeReview.pet} · {formatReviewDate(activeReview.date, lang)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <strong className="block text-[13px] font-black text-villa-text-primary">{reviewsLoading ? t({ en: "Loading guest reviews...", zh: "正在载入宠主评价..." }) : t({ en: "No published reviews yet", zh: "暂时没有已发布评价" })}</strong>
                  <span className="mt-1 block text-[11px] font-bold text-villa-text-secondary">{t({ en: "Verified guest reviews will appear here.", zh: "真实顾客评价会显示在这里。" })}</span>
                </div>
              )}
            </div>
          </section>
        </section>

        <div className="hidden lg:block">
        <section className="px-4 pb-6 pt-6 sm:px-6 lg:px-10">
          <div className="pet-clay-panel villa-container grid gap-5 overflow-hidden rounded-[42px] p-6 pet-rise">
            <header className="flex items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <a href="/" className="pet-logo-badge h-24 w-24" aria-label="The Pet Villa home">
                  <img src="/petvilla-app-badge.webp" alt="The Pet Villa" className="h-full w-full object-cover" />
                </a>
                <div>
                  <p className="text-[15px] font-black text-[#8d65da]">{t({ en: "Hello", zh: "欢迎" })}, {dashboardName}</p>
                  <h1 className="m-0 font-title text-[48px] font-black leading-none text-villa-text-primary">The Pet Villa</h1>
                  <div className="pet-language-pill mt-3 w-fit" aria-label="Language">
                    <button type="button" data-active={lang === "en"} onClick={() => setLang("en")}>EN</button>
                    <button type="button" data-active={lang === "zh"} onClick={() => setLang("zh")}>中文</button>
                  </div>
                </div>
              </div>
              {isHomeLoggedIn ? (
                <div className="flex items-center gap-3">
                  <a href="/diary" className="pet-round-action h-16 w-16 pet-clickable text-[#8d65da]" aria-label="Pet Diary">
                    <Icon name="camera" className="h-8 w-8" />
                  </a>
                  <a href="/orders" className="pet-round-action h-16 w-16 pet-clickable text-[#8d65da]" aria-label="Orders">
                    <Icon name="orders" className="h-8 w-8" />
                  </a>
                  <a href="/account" className="pet-round-action h-16 w-16 pet-clickable overflow-hidden" aria-label="Account">
                    <img src={homeUserAvatar} alt="" className="h-full w-full object-cover" />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <a href="/booking" className="pet-primary-cta inline-flex min-h-[54px] items-center justify-center px-7 text-sm font-black">{t({ en: "Book Now", zh: "立即预约" })}</a>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[54px] items-center justify-center rounded-full border-2 border-[#b58cff] bg-white/90 px-7 text-sm font-black text-[#8d65da] shadow-[0_10px_22px_rgba(61,31,13,0.08)] transition active:translate-y-0.5 active:scale-[0.99]">WhatsApp</a>
                </div>
              )}
            </header>

            <a href="/booking" className="pet-clickable flex min-h-[66px] items-center gap-4 rounded-[30px] border border-white/90 bg-white/90 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_10px_0_rgba(183,142,255,0.08),0_24px_38px_rgba(61,31,13,0.10)]">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f2e7ff]">
                <Icon name="calendar" className="h-7 w-7" />
              </span>
              <span className="min-w-0 flex-1 text-[18px] font-black text-villa-text-muted">{t({ en: "Search dates, daycare, boarding...", zh: "搜索日期、日托、寄宿..." })}</span>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ffb84d] shadow-[0_10px_18px_rgba(255,184,77,0.28)]">
                <Icon name="paw" className="h-7 w-7" />
              </span>
            </a>

            <nav className="grid grid-cols-4 gap-4">
              {[
                { href: "/booking?service=overnight", icon: "moon" as HomeIconName, label: t({ en: "Boarding", zh: "寄宿" }), color: "#ffe1bd" },
                { href: "/booking?service=daycare", icon: "sun" as HomeIconName, label: t({ en: "Daycare", zh: "日托" }), color: "#fff0d5" },
                { href: "/pets", icon: "dog" as HomeIconName, label: t({ en: "My Pets", zh: "宠物" }), color: "#ead8ff" },
                { href: "/chat", icon: "chat" as HomeIconName, label: t({ en: "Chat", zh: "聊天" }), color: "#dff2e1" }
              ].map((item) => (
                <a key={item.href} href={item.href} className="pet-dashboard-tile pet-clickable grid min-h-[132px] place-items-center text-center" style={{ background: item.color }}>
                  <span className="pet-icon-bubble h-16 w-16">
                    <Icon name={item.icon} className="h-10 w-10" />
                  </span>
                  <span className="text-[17px] font-black leading-tight text-villa-text-primary">{item.label}</span>
                </a>
              ))}
            </nav>

            <div className="grid grid-cols-[1.45fr_0.55fr] gap-5">
              <section className="pet-dashboard-card h-full overflow-hidden">
                <div className="pet-banner-live h-full min-h-[500px]">
                  <img src="/petvilla-dashboard-banner.webp" alt="The Pet Villa cozy small dog care" className="absolute inset-0 h-full w-full object-cover object-[36%_52%]" />
                  <div className="absolute inset-y-0 right-0 z-10 flex w-[43%] flex-col justify-center p-8">
                    <p className="text-[15px] font-black uppercase leading-tight text-[#6c4aba]">{t({ en: "Good Morning", zh: "早安" })}</p>
                    <h2 className="mt-2 font-title text-[44px] font-black leading-[1.02] text-villa-text-primary">{t({ en: "Ready for a cozy stay?", zh: "准备好温馨入住了吗？" })}</h2>
                    <a href="/booking" className="home-hero-cta pet-primary-cta mt-7 inline-flex min-h-[58px] w-[240px] items-center justify-center px-7 text-base font-black">{t({ en: "Book Now", zh: "立即预约" })}</a>
                  </div>
                </div>
              </section>
            </div>

            <section className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-title text-[34px] font-black text-villa-text-primary">{t({ en: "Services", zh: "服务" })}</h2>
                <a href="/services" className="pet-mini-link pet-clickable">{t({ en: "See all", zh: "查看全部" })}</a>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {services.map((service, index) => (
                  <a key={service.id} href={service.href} className="pet-service-row pet-clickable grid grid-cols-[72px_1fr_auto] items-center gap-4">
                    <span className="pet-icon-bubble h-16 w-16" style={{ background: index === 0 ? "#fff0d5" : "#f2e7ff" }}>
                      <Icon name={service.icon} className="h-11 w-11" />
                    </span>
                    <span>
                      <strong className="block text-[20px] font-black leading-tight text-villa-text-primary">{t(service.title)}</strong>
                      <span className="mt-1 block text-[13px] font-bold text-villa-text-secondary">{index === 0 ? t({ en: "No cages, same-room sleeping", zh: "不关笼，同房陪睡" }) : t({ en: "Daytime care, 9am - 8pm", zh: "日间照顾，9am - 8pm" })}</span>
                    </span>
                    <span className="text-right">
                      <strong className="block text-[24px] font-black leading-none text-[#d97867]">{servicePrice(service.id)}</strong>
                      <span className="mt-3 inline-flex rounded-full bg-[#f2e7ff] px-3 py-1.5 text-[11px] font-black text-[#8d65da] shadow-[inset_0_-3px_6px_rgba(183,142,255,0.18)]">{t({ en: "Book", zh: "预约" })}</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </section>
        <section className="hidden px-4 pb-5 pt-4 sm:px-6 lg:px-10">
          <div className="pet-clay-panel villa-container overflow-hidden rounded-[36px] pet-rise">
            <div className="relative grid grid-cols-1 gap-0 lg:min-h-[610px] lg:grid-cols-[1fr_0.95fr]">
              <div className="relative z-10 order-2 px-5 pb-6 pt-5 sm:px-7 lg:order-1 lg:px-8 lg:py-14">
                <div className="inline-flex rounded-pill bg-[#ffe1bd] px-4 py-2 text-[10px] font-black uppercase text-villa-text-primary shadow-[inset_0_-4px_8px_rgba(255,184,77,0.22),0_8px_18px_rgba(61,31,13,0.08)]">
                  The Pet Villa · Ipoh · Pet Boarding
                </div>
                <h1 className="mt-4 max-w-[320px] font-title text-[34px] font-black leading-[1.02] text-villa-text-primary sm:text-[44px] lg:max-w-[560px] lg:text-[64px]">
                  {t({ en: "Cage Free · 24h Care", zh: "不关笼 · 24小时陪伴" })}
                  <span className="ml-1 inline-block align-middle text-[0.72em] font-normal leading-none text-villa-primary">♡</span>
                </h1>
                <p className="mt-3 max-w-[300px] text-[15px] font-black leading-snug text-villa-text-primary sm:text-lg">
                  {t({ en: "Premium small pet boarding in Ipoh", zh: "怡保精品小型宠物寄宿" })}
                </p>
                <ul className="mt-4 grid gap-2 text-[13px] font-bold leading-relaxed text-villa-text-primary sm:text-sm">
                  {[
                    { en: "Only 3 pets per day", zh: "一天只接待 3 只宠物" },
                    { en: "3-5 photo/video updates daily", zh: "每日 3-5 次照片视频更新" },
                    { en: "Only small pets from 1-12kg", zh: "仅接待 1-12kg 小型宠物" }
                  ].map((item) => (
                    <li key={item.en} className="flex items-center gap-2 rounded-full bg-white/70 px-2.5 py-1.5 shadow-[0_5px_14px_rgba(61,31,13,0.05)]">
                      <Icon name="paw" className="h-4 w-4 shrink-0" />
                      {t(item)}
                    </li>
                  ))}
                </ul>

                <div className="hidden">
                  {services.map((service) => (
                    <a
                      key={service.id}
                      href={service.href}
                      className="rounded-[18px] border border-villa-primary-light bg-white/90 p-2.5 shadow-[0_10px_30px_rgba(61,31,13,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Icon name={service.icon} className="h-11 w-11 shrink-0" />
                        <div className="min-w-0">
                          <h2 className="text-[11px] font-black text-villa-text-primary sm:text-sm">{t(service.title)}</h2>
                          <p className="mt-1 text-[18px] font-black leading-none text-villa-primary sm:text-[26px]">{servicePrice(service.id)}</p>
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
                      <span className="villa-button mt-3 min-h-[34px] w-full text-[10px] sm:min-h-[40px] sm:text-xs">{t(service.cta)}</span>
                    </a>
                  ))}
                </div>

                <div className="mt-5 hidden grid-cols-2 gap-3 lg:grid lg:max-w-[560px]">
                  <a className="pet-gradient-button inline-flex min-h-[54px] items-center justify-center rounded-pill px-5 text-sm font-black text-white transition active:translate-y-0.5 active:scale-[0.99]" href="/booking?service=overnight">
                    {t({ en: "Book Now", zh: "立即预约" })}
                  </a>
                  <a className="inline-flex min-h-[54px] items-center justify-center rounded-pill border-2 border-[#b58cff] bg-white/90 px-5 text-sm font-black text-[#8d65da] shadow-[0_10px_22px_rgba(61,31,13,0.08)] transition active:translate-y-0.5 active:scale-[0.99]" href={whatsappUrl} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </div>
              </div>

              <div className="relative order-1 mx-3 mt-3 min-h-[360px] overflow-hidden rounded-[34px] bg-[#ead8ff] shadow-[inset_0_-18px_34px_rgba(255,255,255,0.30),0_16px_34px_rgba(61,31,13,0.13)] sm:min-h-[430px] lg:order-2 lg:m-4 lg:min-h-full">
                <img src="/petvilla-3d-hero.webp" alt="3D small dogs at The Pet Villa" className="pet-float absolute inset-0 h-full w-full object-cover object-[50%_66%]" />
                <div className="absolute left-4 top-4 z-10 rounded-[22px] bg-white/90 px-3 py-2 text-[11px] font-black text-villa-text-primary shadow-[0_10px_24px_rgba(61,31,13,0.12)] backdrop-blur">
                  1-12kg only
                </div>
                <div className="absolute bottom-4 left-4 z-10 rounded-[24px] bg-white/90 px-4 py-3 shadow-[0_12px_28px_rgba(61,31,13,0.14)] backdrop-blur">
                  <span className="block text-[10px] font-black uppercase text-villa-primary">Today</span>
                  <strong className={`block text-xl font-black leading-tight ${todayAvailabilityTone}`}>{todayAvailabilityLabel()}</strong>
                  <span className="block text-[10px] font-bold text-villa-text-secondary">booking status</span>
                </div>
                <div className="absolute right-4 top-4 z-10 rounded-full bg-[#ffe1bd] px-3 py-2 text-[11px] font-black text-villa-text-primary shadow-[0_10px_24px_rgba(61,31,13,0.12)]">
                  3-5 updates
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,245,0)_0%,rgba(255,248,245,0)_60%,rgba(255,250,244,0.40)_100%)]" />
              </div>
            </div>
            <div className="grid gap-3 border-t border-white/80 bg-white/60 p-4 sm:grid-cols-2 lg:p-5">
              {services.map((service) => (
                <a
                  key={service.id}
                  href={service.href}
                  className="pet-pressable rounded-[28px] border border-white/90 bg-white/90 p-4 shadow-[0_14px_0_rgba(183,142,255,0.12),0_22px_34px_rgba(61,31,13,0.10)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="pet-icon-bubble h-14 w-14">
                      <Icon name={service.icon} className="h-10 w-10" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-villa-text-primary">{t(service.title)}</h2>
                      <p className="mt-1 text-[25px] font-black leading-none text-[#d97867]">{servicePrice(service.id)}</p>
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
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="pet-section-shell villa-container">
            <div className="grid gap-4 lg:grid-cols-[220px_1fr_128px] lg:items-center">
              <div className="flex items-center gap-3 rounded-[26px] bg-[#ead8ff]/70 p-3 shadow-[inset_0_-8px_16px_rgba(255,255,255,0.35)]">
                <div className="pet-icon-bubble h-16 w-16">
                  <Icon name="dog" className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="pet-section-heading text-[20px]">{t({ en: "Today Availability", zh: "今日名额" })}</h2>
                  <p className={`mt-1 text-[24px] font-black ${todayAvailabilityTone}`}>
                    {todayAvailabilityLabel()}
                  </p>
                </div>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {today ? availabilityDays.map((date) => {
                  const off = isHostOffDay(localDateKey(date), offDays);
                  return (
                    <a
                      key={date.toISOString()}
                      href={availabilityKnown ? (off ? "/booking" : `/booking?date=${localDateKey(date)}`) : undefined}
                      aria-disabled={!availabilityKnown}
                      className={`min-w-[92px] rounded-[24px] border border-white/90 bg-white/90 px-2 py-3 text-center shadow-[0_10px_0_rgba(232,146,124,0.09),0_18px_26px_rgba(61,31,13,0.08)] ${availabilityKnown ? "pet-pressable" : "pointer-events-none opacity-70"}`}
                    >
                      <span className="block text-[10px] font-black text-villa-text-primary">{formatDay(date, lang)}</span>
                      <strong className={`mt-2 block text-[12px] font-black ${!availabilityKnown ? "text-villa-text-secondary" : off ? "text-red-500" : "text-villa-accent-green"}`}>
                        {slotLabel(date)}
                      </strong>
                    </a>
                  );
                }) : Array.from({ length: 7 }, (_, index) => (
                  <div key={`desktop-availability-placeholder-${index}`} className="min-h-[62px] min-w-[92px] animate-pulse rounded-[24px] border border-white/90 bg-white/90" aria-hidden="true" />
                ))}
              </div>
              {availabilityStatus === "error" ? (
                <button type="button" className="pet-lavender-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-pill px-4 text-xs font-black text-white" onClick={() => setAvailabilityRefreshKey((current) => current + 1)}>
                  <Icon name="calendar" className="h-4 w-4" />
                  {t({ en: "Retry", zh: "重试" })}
                </button>
              ) : (
                <a className="pet-lavender-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-pill px-4 text-xs font-black text-white" href="/booking">
                  <Icon name="calendar" className="h-4 w-4" />
                  {t({ en: "Calendar", zh: "日历" })}
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="pet-section-shell villa-container">
            <h2 className="pet-section-heading mb-4">
              {t({ en: "Why Choose Pet Villa", zh: "为什么选择 Pet Villa" })}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {whyItems.map((item, index) => (
                <article
                  key={item.title.en}
                  className="pet-pressable min-h-[132px] rounded-[26px] border border-white/90 p-3 text-center shadow-[0_12px_0_rgba(183,142,255,0.08),0_20px_30px_rgba(61,31,13,0.08)]"
                  style={{ background: index % 3 === 0 ? "#fff0d5" : index % 3 === 1 ? "#ead8ff" : "#fffaf4" }}
                >
                  <div className="pet-icon-bubble mx-auto h-14 w-14">
                    <Icon name={item.icon} className="h-8 w-8" />
                  </div>
                  <h3 className="mt-3 text-[13px] font-black leading-tight text-villa-text-primary">{t(item.title)}</h3>
                  <p className="mt-1 text-[10px] font-bold leading-tight text-villa-text-secondary">{t(item.body)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 sm:px-6 lg:px-10">
          <div className="pet-section-shell villa-container">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="pet-section-heading">{t({ en: "Pet Owner Reviews", zh: "宠主评价" })}</h2>
              <button type="button" className="pet-mini-link disabled:cursor-not-allowed disabled:opacity-45" disabled={!displayReviews.length} onClick={() => setReviewsOpen(true)}>
                {t({ en: "View All", zh: "查看全部" })} →
              </button>
            </div>
            <div
              className="rounded-[28px] border border-white/90 bg-[#ead8ff]/65 p-4 shadow-[inset_0_-10px_18px_rgba(255,255,255,0.25),0_16px_32px_rgba(61,31,13,0.08)]"
              onTouchStart={(event) => setReviewTouchStart(event.touches[0]?.clientX ?? null)}
              onTouchEnd={(event) => {
                if (reviewTouchStart === null) return;
                handleSwipe(reviewTouchStart, event.changedTouches[0]?.clientX ?? reviewTouchStart, moveReview);
                setReviewTouchStart(null);
              }}
            >
              {activeReview ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex rounded-full bg-white/90 px-3 py-1 shadow-sm"><Stars rating={activeReview.rating} /></div>
                    {displayReviews.length > 1 ? (
                      <div className="flex gap-2">
                        <button type="button" className="pet-review-arrow" onClick={() => moveReview(-1)} aria-label="Previous review">‹</button>
                        <button type="button" className="pet-review-arrow" onClick={() => moveReview(1)} aria-label="Next review">›</button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-4 text-[15px] font-black leading-relaxed text-villa-text-primary">“{t(activeReview.quote)}”</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[18px] bg-white shadow-[0_10px_20px_rgba(61,31,13,0.10)]">
                        {activeReview.photo ? <img src={activeReview.photo} alt={activeReview.dogName || activeReview.pet} className="h-full w-full object-cover" /> : <DogPortrait breed={activeReview.breed || activeReview.pet} color="#f0b46e" />}
                      </div>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-black">{activeReview.name} · {activeReview.dogName || activeReview.pet}</strong>
                        <span className="block truncate text-xs font-bold text-villa-text-secondary">{activeReview.breed || activeReview.pet} · {formatReviewDate(activeReview.date, lang)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {displayReviews.map((review, index) => (
                        <button key={review.id} type="button" className={`h-2.5 rounded-full transition-all ${index === reviewIndex ? "w-6 bg-[#8d65da]" : "w-2.5 bg-white/80"}`} onClick={() => setReviewIndex(index)} aria-label={`Show review ${index + 1}`} />
                      ))}
                    </div>
                  </div>
                  {displayReviews.length > 1 ? <p className="mt-3 text-center text-[11px] font-bold text-villa-text-secondary/80">{t({ en: "Swipe or use the arrows to view more", zh: "左右滑动或按箭头查看更多" })}</p> : null}
                </>
              ) : (
                <div className="py-10 text-center">
                  <strong className="block text-[15px] font-black text-villa-text-primary">{reviewsLoading ? t({ en: "Loading guest reviews...", zh: "正在载入宠主评价..." }) : t({ en: "No published reviews yet", zh: "暂时没有已发布评价" })}</strong>
                  <span className="mt-2 block text-[12px] font-bold text-villa-text-secondary">{t({ en: "Verified guest reviews will appear here.", zh: "真实顾客评价会显示在这里。" })}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        </div>

        <section className="px-4 pb-2 pt-4 sm:px-6 lg:px-10" aria-labelledby="pet-villa-public-purpose">
          <aside className="villa-container relative overflow-hidden rounded-[30px] border border-white/85 bg-[linear-gradient(115deg,rgba(255,239,213,0.92),rgba(245,235,255,0.88)_52%,rgba(224,244,231,0.82))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_26px_rgba(61,31,13,0.07)] sm:px-6 sm:py-5">
            <span className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,#ffbd67_0%,#b58cff_52%,#8fc9a1_100%)]" aria-hidden="true" />
            <div className="flex items-start gap-3 pl-1">
              <span className="pet-icon-bubble grid h-10 w-10 shrink-0 place-items-center bg-white/82 shadow-[0_8px_16px_rgba(61,31,13,0.08)]">
                <Icon name="paw" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#6c4aba]">The Pet Villa</p>
                <h2 id="pet-villa-public-purpose" className="mt-0.5 font-title text-[21px] font-black leading-tight text-villa-text-primary sm:text-[24px]">
                  {t({ en: "Small-dog care in Ipoh", zh: "怡保小型犬照护" })}
                </h2>
              </div>
            </div>
            <p className="mt-3 max-w-5xl pl-1 text-[12px] font-bold leading-relaxed text-villa-text-secondary sm:mt-3.5 sm:text-[13px]">
              {t({
                en: "Small-dog boarding and daycare in Ipoh. Our Customer Portal lets customers manage pets and bookings, view orders, communicate with Pet Villa, and receive private pet-care updates. Customers can access their account securely with Email + Password and, when available, optional Google Sign-In.",
                zh: "怡保小型犬寄宿与日托服务。客户可通过 Customer Portal 管理宠物与预订、查看订单、联系 Pet Villa，并接收私人宠物照护更新。客户可使用 Email + Password 安全登录，并可在提供后选择 Google Sign-In。"
              })}
            </p>
          </aside>
        </section>
      </main>

      <footer className="hidden bg-[linear-gradient(180deg,#ead8ff_0%,#6c4aba_100%)] px-4 pb-28 pt-6 text-white sm:px-6 lg:block lg:pb-6 lg:px-10">
        <div className="villa-container grid gap-5 text-xs font-semibold sm:grid-cols-4">
          <div className="rounded-[26px] bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <h2 className="font-title text-lg font-black text-white">The Pet Villa</h2>
            <p className="mt-1 text-white/80">{t({ en: "Premium small pet boarding in Ipoh", zh: "怡保精品小型宠物寄宿" })}</p>
          </div>
          <div className="rounded-[26px] bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <h3 className="text-sm font-black text-white">{t({ en: "Contact Us", zh: "联系我们" })}</h3>
            <a className="mt-1 block hover:text-white" href={`tel:${phone}`}>{phone}</a>
            <a className="block hover:text-white" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="block hover:text-white" href="mailto:PetVillaIpoh@gmail.com">PetVillaIpoh@gmail.com</a>
            <p className="m-0">Ipoh, Perak</p>
          </div>
          <div className="rounded-[26px] bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <h3 className="text-sm font-black text-white">{t({ en: "Hours", zh: "营业时间" })}</h3>
            <p className="mt-1">Check-in: 9:00am - 8:00pm</p>
            <p className="m-0">Check-out: before 12:00pm</p>
          </div>
          <div className="rounded-[26px] bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <h3 className="text-sm font-black text-white">{t({ en: "Follow Us", zh: "关注我们" })}</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(socialLinks).map(([key, href]) => (
                <a key={key} href={href} target="_blank" rel="noreferrer" className="pet-pressable flex min-h-[42px] items-center gap-2 rounded-[18px] bg-white/18 px-3 shadow-[0_8px_18px_rgba(61,31,13,0.12)]" aria-label={key}>
                  <Icon name={key as HomeIconName} className="h-6 w-6" />
                  <span className="text-[11px] font-black capitalize text-white">{key === "xhs" ? "Xiaohongshu" : key}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="villa-container mt-5 flex items-center justify-center gap-3 border-t border-white/20 pt-4 text-xs font-bold text-white/85">
          <a href="/privacy" className="hover:text-white">{t({ en: "Privacy Policy", zh: "隐私政策" })}</a>
          <span aria-hidden="true">•</span>
          <a href="/terms" className="hover:text-white">{t({ en: "Terms of Service", zh: "服务条款" })}</a>
        </div>
      </footer>

      <div className="px-4 pb-24 pt-1 text-center text-[11px] font-bold text-villa-text-secondary lg:hidden">
        <a href="/privacy" className="text-[#6c4aba]">{t({ en: "Privacy Policy", zh: "隐私政策" })}</a>
        <span className="mx-2 text-villa-text-secondary/60" aria-hidden="true">•</span>
        <a href="/terms" className="text-[#6c4aba]">{t({ en: "Terms of Service", zh: "服务条款" })}</a>
      </div>

      <nav className="pet-tabbar">
        {[
          { href: "/", icon: "paw" as HomeIconName, label: t({ en: "Home", zh: "首页" }), active: true },
          { href: "/pets", icon: "dog" as HomeIconName, label: t({ en: "Pets", zh: "宠物" }), active: false },
          { href: "/booking", icon: "calendar" as HomeIconName, label: t({ en: "Book", zh: "预约" }), active: false },
          { href: "/orders", icon: "orders" as HomeIconName, label: t({ en: "Orders", zh: "订单" }), active: false },
          { href: "/diary", icon: "camera" as HomeIconName, label: t({ en: "Diary", zh: "日记" }), active: false },
          { href: "/account", icon: "heart" as HomeIconName, label: t({ en: "Me", zh: "我的" }), active: false }
        ].map((item) => (
          <a key={item.href} href={item.href} className="pet-tab-item" data-active={item.active} aria-current={item.active ? "page" : undefined}>
            <span className="pet-tab-icon">
              <Icon name={item.icon} className="h-5 w-5" />
            </span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {reviewsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-villa-text-primary/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[86vh] w-full max-w-lg overflow-auto rounded-[24px] border border-villa-primary-light bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-title text-xl font-black">{t({ en: "All Reviews", zh: "全部评价" })}</h2>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-villa-primary-light font-black" onClick={() => setReviewsOpen(false)}>×</button>
            </div>
            <div className="grid gap-3">
              {displayReviews.map((review) => (
                <article key={review.id} className="rounded-[18px] bg-villa-primary-bg p-4">
                  <Stars rating={review.rating} />
                  <p className="mt-2 text-sm font-bold leading-relaxed">“{t(review.quote)}”</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[15px] bg-white shadow-sm">
                      {review.photo ? <img src={review.photo} alt={review.dogName || review.pet} className="h-full w-full object-cover" /> : <DogPortrait breed={review.breed || review.pet} color="#f0b46e" />}
                    </div>
                    <p className="text-xs font-black">{review.name} · {review.dogName || review.pet}<span className="mt-1 block font-bold text-villa-text-secondary">{review.breed || review.pet} · {formatReviewDate(review.date, lang)}</span></p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
