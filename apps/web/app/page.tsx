"use client";

import { AppNav } from "./components/AppNav";
import { useLanguage } from "./components/LanguageProvider";

const coral = "#e8927c";
const deep = "#3d1f0d";
const soft = "#f5c4b3";
const cream = "#fff8f5";
const green = "#7a9e7e";

type IconName =
  | "no"
  | "heart"
  | "dog"
  | "camera"
  | "home"
  | "owner"
  | "shield"
  | "moon"
  | "sun"
  | "calendar"
  | "profile"
  | "clipboard"
  | "wallet"
  | "vaccine"
  | "food"
  | "flea"
  | "vet";

const featureCards = [
  {
    icon: "no",
    title: { en: "Cage Free Home", zh: "不关笼家庭" },
    body: { en: "Your dog stays in a safe, comfortable home.", zh: "狗狗住在安全舒适的家庭环境。" }
  },
  {
    icon: "owner",
    title: { en: "24h Supervision By Owner", zh: "主人24小时陪伴" },
    body: { en: "We are always here with your dog, day and night.", zh: "白天夜晚都有人陪伴照顾。" }
  },
  {
    icon: "camera",
    title: { en: "3-5 Daily Photo Updates", zh: "每日3-5次照片更新" },
    body: { en: "Get daily photos and videos to see your dog's happiness.", zh: "每天收到照片视频，安心看到狗狗状态。" }
  },
  {
    icon: "shield",
    title: { en: "Safe, Clean & Loved", zh: "安全干净被爱护" },
    body: { en: "A clean, secure and loving space for your furry friend.", zh: "干净安全又有爱的寄宿空间。" }
  }
] satisfies { icon: IconName; title: { en: string; zh: string }; body: { en: string; zh: string } }[];

const serviceCards = [
  {
    icon: "no",
    title: { en: "No Cages", zh: "不关笼" },
    body: { en: "Your dog stays free in a calm home space.", zh: "狗狗在放松的家庭空间自由活动。" }
  },
  {
    icon: "heart",
    title: { en: "24h Care", zh: "24小时照顾" },
    body: { en: "Owner-supervised care, day and night.", zh: "白天晚上都有人看顾陪伴。" }
  },
  {
    icon: "dog",
    title: { en: "1-12kg Only", zh: "仅接1-12kg" },
    body: { en: "Small dogs only, with a gentle group setting.", zh: "只接小型犬，环境更安心。" }
  },
  {
    icon: "camera",
    title: { en: "3-5 Daily Photo Updates", zh: "每日3-5次照片更新" },
    body: { en: "Daily photos and videos so you can feel at ease.", zh: "每天收到照片视频，让你安心看到狗狗状态。" }
  }
] satisfies { icon: IconName; title: { en: string; zh: string }; body: { en: string; zh: string } }[];

const steps = [
  { icon: "profile", en: "Register", zh: "注册", body: { en: "Create account", zh: "创建账号" } },
  { icon: "dog", en: "Add Your Dog", zh: "添加狗狗", body: { en: "Dog profile", zh: "宠物档案" } },
  { icon: "calendar", en: "Choose Dates", zh: "选择日期", body: { en: "Pick check-in & check-out", zh: "选择入住日期" } },
  { icon: "clipboard", en: "Confirm Booking", zh: "确认预约", body: { en: "Review details", zh: "检查资料" } },
  { icon: "wallet", en: "Pay Deposit", zh: "付订金", body: { en: "Secure your dog's stay", zh: "确认名额" } }
] satisfies { icon: IconName; en: string; zh: string; body: { en: string; zh: string } }[];

const notices = [
  { icon: "vaccine", en: "Vaccinated", zh: "已打疫苗" },
  { icon: "food", en: "Bring Own Food", zh: "自备狗粮" },
  { icon: "dog", en: "Small Dogs (1-12kg)", zh: "小型犬 1-12kg" },
  { icon: "no", en: "No Aggressive Dogs", zh: "不接攻击性犬" },
  { icon: "flea", en: "Flea Free", zh: "无跳蚤" },
  { icon: "vet", en: "Emergency Vet Support", zh: "紧急兽医支援" }
] satisfies { icon: IconName; en: string; zh: string }[];

const reviews = [
  { name: "林美玲", dog: "Mochi (Poodle)", quote: { en: "Mochi looked loved, calm, and safe every day.", zh: "Mochi 每天都很安心，也被照顾得很好。" }, pos: "35% 78%" },
  { name: "陈嘉欣", dog: "Boba (Frenchie)", quote: { en: "The updates were professional, warm, and always on time.", zh: "照片更新温暖准时，很专业。" }, pos: "68% 72%" },
  { name: "王俊伟", dog: "Luna (Maltese)", quote: { en: "Simple booking and very careful small-dog care.", zh: "预约简单，小型犬照顾很细心。" }, pos: "50% 65%" }
];

function Icon({ name, className = "h-8 w-8" }: { name: IconName; className?: string }) {
  const strokeProps = { fill: "none", stroke: deep, strokeWidth: "3", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (name === "no") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="20" fill="#fff3ef" stroke={coral} strokeWidth="5" />
        <path d="M19 19 45 45" stroke={coral} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="27" fill="#fff3ef" />
        <path d="M32 47S17 38 17 27c0-7 9-10 15 0 6-10 15-7 15 0 0 11-15 20-15 20Z" fill={coral} stroke={coral} strokeWidth="2" />
      </svg>
    );
  }

  if (name === "dog") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="34" r="18" fill="#fff8f5" stroke={deep} strokeWidth="3" />
        <path d="M17 28c-7 1-10 9-7 15 3 6 11 5 13 0M47 28c7 1 10 9 7 15-3 6-11 5-13 0" fill="#d99864" />
        <circle cx="25" cy="34" r="2.5" fill={deep} />
        <circle cx="39" cy="34" r="2.5" fill={deep} />
        <ellipse cx="32" cy="41" rx="5" ry="3.5" fill={deep} />
        <path d="M27 47c3 3 7 3 10 0" {...strokeProps} strokeWidth="2" />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="27" fill="#fff3ef" />
        <path d="M17 25h9l3-5h9l3 5h6a6 6 0 0 1 6 6v15a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6V31a6 6 0 0 1 6-6Z" fill="#fff" stroke={deep} strokeWidth="3" />
        <circle cx="32" cy="38" r="9" fill={soft} stroke={coral} strokeWidth="3" />
        <circle cx="47" cy="31" r="2.5" fill={coral} />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
        <path d="M12 36 36 15l24 21" fill="none" stroke={deep} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 33v25h34V33" fill={cream} stroke={deep} strokeWidth="3" />
        <path d="M26 45c0-5 4-8 10-8s10 3 10 8c0 8-10 13-10 13s-10-5-10-13Z" fill={coral} opacity="0.9" />
        <path d="M9 56c7-1 11-5 14-11M63 56c-7-1-11-5-14-11" fill="none" stroke={green} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "owner") {
    return (
      <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
        <circle cx="30" cy="23" r="10" fill="#f2b27f" stroke={deep} strokeWidth="2.5" />
        <path d="M15 62c2-16 27-16 30 0" fill="#fff3ef" stroke={deep} strokeWidth="3" />
        <circle cx="47" cy="43" r="9" fill="#fff8f5" stroke={deep} strokeWidth="2.5" />
        <path d="M39 45c3 7 13 7 17 0" fill="none" stroke={deep} strokeWidth="2.3" strokeLinecap="round" />
        <path d="M20 40c6 8 18 10 31 6" fill="none" stroke={coral} strokeWidth="4" strokeLinecap="round" />
        <path d="M55 16c3-5 10-2 8 4-1 4-8 8-8 8s-7-4-8-8c-2-6 5-9 8-4Z" fill={coral} />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
        <path d="M36 10 57 18v17c0 17-10 27-21 33-11-6-21-16-21-33V18l21-8Z" fill="#fff8f5" stroke={deep} strokeWidth="4" />
        <path d="m26 35 7 7 15-17" fill="none" stroke={coral} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 58c7-1 11-5 14-11M63 58c-7-1-11-5-14-11" fill="none" stroke={green} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "moon" || name === "sun") {
    return name === "moon" ? (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M42 45A20 20 0 0 1 25 13a23 23 0 1 0 26 26 20 20 0 0 1-9 6Z" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
        <path d="M47 13v8M43 17h8M17 48v6M14 51h6" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="12" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
        <path d="M32 6v9M32 49v9M6 32h9M49 32h9M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <rect x="13" y="15" width="38" height="38" rx="7" fill="#fff8f5" stroke={deep} strokeWidth="3" />
        <path d="M13 26h38M23 10v10M41 10v10" stroke={coral} strokeWidth="4" strokeLinecap="round" />
        <path d="M23 35h5M36 35h5M23 44h5M36 44h5" stroke={green} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="24" r="11" fill="#f2b27f" stroke={deep} strokeWidth="3" />
        <path d="M14 55c3-13 14-19 18-19s15 6 18 19" fill="#fff3ef" stroke={deep} strokeWidth="3" />
      </svg>
    );
  }

  if (name === "clipboard") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <rect x="17" y="13" width="30" height="42" rx="6" fill="#fff8f5" stroke={deep} strokeWidth="3" />
        <path d="M25 13c1-5 13-5 14 0v5H25v-5Z" fill={soft} stroke={deep} strokeWidth="3" />
        <path d="m24 36 6 6 12-14" fill="none" stroke={coral} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <rect x="12" y="20" width="42" height="29" rx="7" fill="#fff8f5" stroke={deep} strokeWidth="3" />
        <path d="M44 29h10v11H44c-4 0-6-2-6-5s2-6 6-6Z" fill={soft} stroke={deep} strokeWidth="3" />
        <circle cx="45" cy="35" r="2" fill={deep} />
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

  return null;
}

function MiniDogArt({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden="true">
      <path d="M22 92c8-19 29-27 50-19 8 3 14 9 18 16 6-10 19-16 35-12 13 4 21 13 23 25H18c1-4 2-7 4-10Z" fill="#fff8f5" />
      <path d="M38 96c-9-24 3-48 27-51 24 3 36 27 27 51H38Z" fill="#f2b27f" stroke={deep} strokeWidth="2" />
      <circle cx="65" cy="70" r="25" fill="#f4c18d" />
      <path d="M41 65c-7 2-11 9-10 17 1 9 8 14 15 12M89 65c7 2 11 9 10 17-1 9-8 14-15 12" fill="#d99864" />
      <circle cx="55" cy="70" r="3" fill={deep} />
      <circle cx="75" cy="70" r="3" fill={deep} />
      <ellipse cx="65" cy="78" rx="5" ry="4" fill={deep} />
      <path d="M59 84c4 4 9 4 13 0" fill="none" stroke={deep} strokeWidth="2" strokeLinecap="round" />
      <path d="M14 94c7-1 12-5 16-13M134 96c-7-1-12-5-15-13" fill="none" stroke={green} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CartoonPetArt({ variant, className = "h-full w-full" }: { variant: "boarding" | "daycare" | "food" | "camera"; className?: string }) {
  if (variant === "daycare") {
    return (
      <svg viewBox="0 0 180 150" className={className} aria-hidden="true">
        <rect x="0" y="0" width="180" height="150" rx="28" fill="#fff3ef" />
        <circle cx="136" cy="34" r="18" fill="#ffd45b" stroke="#d9922e" strokeWidth="4" />
        <path d="M136 4v14M136 50v14M106 34h14M152 34h14M114 12l10 10M148 46l10 10M158 12l-10 10M124 46l-10 10" stroke="#d9922e" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="90" cy="123" rx="58" ry="14" fill="#f5c4b3" opacity="0.45" />
        <circle cx="92" cy="74" r="36" fill="#fff8f5" stroke={deep} strokeWidth="3" />
        <path d="M58 66c-11 2-16 13-12 24 4 10 16 10 22 2M126 66c11 2 16 13 12 24-4 10-16 10-22 2" fill="#d99864" />
        <circle cx="80" cy="75" r="4" fill={deep} />
        <circle cx="104" cy="75" r="4" fill={deep} />
        <ellipse cx="92" cy="88" rx="8" ry="6" fill={deep} />
        <path d="M82 98c7 7 14 7 21 0" fill="none" stroke={deep} strokeWidth="3" strokeLinecap="round" />
        <circle cx="48" cy="112" r="15" fill="#f2b27f" stroke={coral} strokeWidth="3" />
        <path d="M40 112h16M48 104v16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "food") {
    return (
      <svg viewBox="0 0 180 150" className={className} aria-hidden="true">
        <rect width="180" height="150" rx="28" fill="#fff8f5" />
        <path d="M38 74c8-24 27-38 52-38s44 14 52 38" fill="#f5c4b3" opacity="0.5" />
        <path d="M47 95h86l-9 30H56L47 95Z" fill="#f2b27f" stroke={deep} strokeWidth="4" strokeLinejoin="round" />
        <path d="M60 95c2-12 14-20 30-20s28 8 30 20" fill="#fff3ef" stroke={deep} strokeWidth="4" />
        <circle cx="76" cy="88" r="4" fill={deep} />
        <circle cx="104" cy="88" r="4" fill={deep} />
        <ellipse cx="90" cy="99" rx="7" ry="5" fill={deep} />
        <path d="M75 120h30" stroke="#fff8f5" strokeWidth="7" strokeLinecap="round" />
        <path d="M32 46c6-10 20-4 14 7-4 7-16 13-16 13s-5-13 2-20ZM142 48c8-9 20-1 12 9-5 6-18 10-18 10s-3-14 6-19Z" fill={coral} opacity="0.85" />
      </svg>
    );
  }

  if (variant === "camera") {
    return (
      <svg viewBox="0 0 180 150" className={className} aria-hidden="true">
        <rect width="180" height="150" rx="28" fill="#fff3ef" />
        <rect x="34" y="50" width="76" height="56" rx="14" fill="#fff" stroke={deep} strokeWidth="4" />
        <path d="M49 50l8-12h31l8 12" fill="#f5c4b3" stroke={deep} strokeWidth="4" strokeLinejoin="round" />
        <circle cx="72" cy="78" r="17" fill="#f5c4b3" stroke={coral} strokeWidth="4" />
        <circle cx="98" cy="62" r="4" fill={coral} />
        <rect x="82" y="35" width="64" height="48" rx="12" fill="#fff8f5" stroke={deep} strokeWidth="4" transform="rotate(10 114 59)" />
        <circle cx="114" cy="59" r="13" fill="#f5c4b3" stroke={coral} strokeWidth="4" />
        <path d="M132 29c4-7 14-3 12 5-2 6-11 11-11 11s-7-8-1-16ZM42 119c5-8 16-2 12 7-3 6-14 10-14 10s-5-10 2-17Z" fill={coral} opacity="0.82" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 150" className={className} aria-hidden="true">
      <rect width="180" height="150" rx="28" fill="#fff3ef" />
      <ellipse cx="90" cy="124" rx="62" ry="13" fill="#f5c4b3" opacity="0.45" />
      <path d="M31 110c5-29 29-48 59-48s54 19 59 48" fill="#fff8f5" />
      <circle cx="79" cy="72" r="34" fill="#f4c18d" stroke={deep} strokeWidth="3" />
      <circle cx="121" cy="76" r="31" fill="#fff" stroke={deep} strokeWidth="3" />
      <path d="M49 67c-10 2-15 12-12 23s15 12 21 3M105 68c-9 2-13 11-10 20s13 10 18 3" fill="#d99864" />
      <path d="M136 67c9 2 13 11 10 20s-13 10-18 3" fill="#d99864" />
      <circle cx="69" cy="74" r="4" fill={deep} />
      <circle cx="89" cy="74" r="4" fill={deep} />
      <circle cx="112" cy="78" r="3.5" fill={deep} />
      <circle cx="130" cy="78" r="3.5" fill={deep} />
      <ellipse cx="79" cy="87" rx="7" ry="5" fill={deep} />
      <ellipse cx="121" cy="90" rx="7" ry="5" fill={deep} />
      <path d="M69 97c6 6 13 6 20 0M112 100c6 5 12 5 18 0" fill="none" stroke={deep} strokeWidth="3" strokeLinecap="round" />
      <path d="M25 43c8-14 28-5 20 10-5 10-23 18-23 18s-7-18 3-28Z" fill={coral} opacity="0.85" />
    </svg>
  );
}

function PawIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <ellipse cx="16" cy="21" rx="7" ry="5.5" fill={deep} />
      <ellipse cx="8" cy="13" rx="3.2" ry="4.4" fill={deep} />
      <ellipse cx="14" cy="8" rx="3" ry="4.4" fill={deep} />
      <ellipse cx="20" cy="8" rx="3" ry="4.4" fill={deep} />
      <ellipse cx="25" cy="13" rx="3.2" ry="4.4" fill={deep} />
    </svg>
  );
}

function StarRating() {
  return (
    <div className="flex gap-1" aria-label="5 star rating">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg key={index} viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="m12 2 3 6 7 .9-5 4.8 1.2 6.9L12 17.2l-6.2 3.4L7 13.7 2 8.9 9 8l3-6Z" fill="#f5a623" />
        </svg>
      ))}
    </div>
  );
}

function DogPhoto({ className = "", position = "center 68%" }: { className?: string; position?: string }) {
  return <img src="/hero-dogs.png" alt="" className={`h-full w-full object-cover ${className}`} style={{ objectPosition: position }} />;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="villa-shell paw-bg">
      <AppNav />

      <main className="overflow-hidden">
        <section id="about" className="relative min-h-[455px] overflow-hidden px-4 pb-7 pt-7 sm:px-6 lg:min-h-[520px] lg:px-16">
          <div className="absolute right-[-48px] top-[70px] h-[318px] w-[112%] overflow-hidden opacity-88 sm:right-[-24px] sm:w-[96%] lg:inset-y-0 lg:right-0 lg:top-0 lg:h-full lg:w-[58%] lg:opacity-95">
            <DogPhoto position="44% 60%" className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#faf6f2_0%,rgba(250,246,242,0.88)_30%,rgba(250,246,242,0.42)_54%,rgba(250,246,242,0.06)_82%)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-villa-background to-transparent" />
          </div>

          <div className="villa-container relative z-10">
            <div className="max-w-[365px] lg:max-w-[560px]">
              <span className="inline-flex rounded-pill bg-villa-primary-light px-4 py-2 text-[11px] font-black uppercase text-villa-text-primary shadow-sm sm:text-xs">
                The Pet Villa · Ipoh · Pet Boarding
              </span>
              <h1 className="page-title mt-5 max-w-[330px] lg:max-w-[520px]">
                A Home Away From Home <span className="text-villa-primary">♡</span>
              </h1>
              <p className="mt-4 max-w-[330px] text-[15px] font-semibold leading-relaxed text-villa-text-secondary lg:max-w-[480px]">
                {t({
                  en: "Premium small dog boarding in Ipoh",
                  zh: "怡保精品小型犬寄宿"
                })}
                <br />
                <span className="inline-flex items-center gap-2">
                  <Icon name="home" className="h-4 w-4" /> No cages · 24h companionship
                </span>
                <br />
                {t({ en: "Thoughtful daily updates", zh: "每日温馨照片更新" })}
              </p>

              <div className="mt-5 grid max-w-[248px] gap-3 sm:max-w-[300px]">
                <a className="villa-button min-h-[48px] w-full gap-2 text-sm sm:min-h-[58px] sm:gap-3 sm:text-base" href="/booking">
                  <Icon name="calendar" className="h-5 w-5 sm:h-6 sm:w-6" />
                  {t({ en: "Book a Stay", zh: "预约寄宿" })}
                </a>
                <a className="villa-button-outline min-h-[46px] w-full bg-white/55 text-sm backdrop-blur sm:min-h-[54px] sm:text-base" href="#how-it-works">
                  {t({ en: "Learn More", zh: "了解更多" })}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="px-4 pb-8 sm:px-6 lg:px-16">
          <div className="villa-container grid grid-cols-2 overflow-hidden rounded-[24px] border border-villa-primary-light bg-white/88 shadow-[0_12px_36px_rgba(61,31,13,0.10)] lg:grid-cols-4">
            {serviceCards.map((feature, index) => (
              <article
                key={feature.title.en}
                className={`grid min-h-[168px] place-items-center border-b border-villa-primary-light/75 p-4 text-center lg:border-b-0 lg:border-r ${
                  index % 2 === 0 ? "border-r" : ""
                } ${index > 1 ? "border-b-0" : ""} ${index === serviceCards.length - 1 ? "lg:border-r-0" : ""}`}
              >
                <div className="grid h-16 w-16 place-items-center rounded-[18px] bg-villa-primary-bg shadow-[0_8px_22px_rgba(61,31,13,0.08)]">
                  <Icon name={feature.icon} className="h-11 w-11" />
                </div>
                <div>
                  <h2 className="mt-3 font-title text-[16px] font-black leading-tight text-villa-text-primary">{t(feature.title)}</h2>
                  <p className="mt-2 text-[11px] font-semibold leading-relaxed text-villa-text-secondary">{t(feature.body)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-16">
          <div className="villa-container">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="section-title">{t({ en: "Simple Pricing", zh: "清晰价格" })}</h2>
              <PawIcon className="h-5 w-5" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="relative overflow-hidden rounded-[24px] border border-villa-primary-light bg-white/88 p-5 shadow-[0_12px_36px_rgba(61,31,13,0.10)]">
                <span className="absolute right-4 top-4 rounded-pill bg-villa-primary px-4 py-2 text-xs font-black text-white">Most Popular</span>
                <div className="grid gap-4">
                  <div>
                    <Icon name="moon" className="h-12 w-12" />
                    <h3 className="card-title mt-3">Overnight Boarding</h3>
                    <div className="price-number mt-3">RM40<span className="ml-1 text-sm text-villa-text-primary">/night</span></div>
                    <ul className="mt-4 grid gap-2 text-xs font-bold text-villa-text-primary">
                      {["No cages", "Same-room sleeping", "24h companionship", "Daily photo updates"].map((item) => (
                        <li key={item} className="flex items-center gap-2"><PawIcon className="h-4 w-4" /> {item}</li>
                      ))}
                    </ul>
                    <a className="villa-button mt-5 w-full justify-between" href="/booking">
                      <span className="flex-1 text-center">{t({ en: "Book Now", zh: "立即预约" })}</span>
                      <ArrowIcon />
                    </a>
                  </div>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-[24px] border border-villa-primary-light bg-white/88 p-5 shadow-[0_12px_36px_rgba(61,31,13,0.10)]">
                <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
                  <div>
                    <Icon name="sun" className="h-12 w-12" />
                    <h3 className="card-title mt-3">Daycare</h3>
                    <div className="price-number mt-3">RM5<span className="ml-1 text-sm text-villa-text-primary">/hour</span></div>
                    <ul className="mt-4 grid gap-2 text-xs font-bold text-villa-text-primary">
                      {["Flexible daytime care", "9:00am - 8:00pm", "Safe & supervised play"].map((item) => (
                        <li key={item} className="flex items-center gap-2"><PawIcon className="h-4 w-4" /> {item}</li>
                      ))}
                    </ul>
                    <a className="villa-button-outline mt-5 w-full justify-between" href="/booking">
                      <span className="flex-1 text-center">{t({ en: "Book Now", zh: "立即预约" })}</span>
                      <ArrowIcon />
                    </a>
                  </div>
                  <div className="hidden h-48 overflow-hidden rounded-[22px] bg-villa-primary-bg sm:block">
                    <CartoonPetArt variant="daycare" />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-4 pb-8 sm:px-6 lg:px-16">
          <div className="villa-container rounded-[24px] border border-villa-primary-light bg-white/88 p-5 shadow-[0_12px_36px_rgba(61,31,13,0.10)]">
            <div className="mb-4 flex items-center justify-center gap-2">
              <h2 className="section-title">{t({ en: "How It Works", zh: "预约流程" })}</h2>
              <PawIcon className="h-5 w-5" />
            </div>
            <div className="grid grid-cols-2 overflow-hidden rounded-[20px] border border-villa-primary-light sm:grid-cols-5">
              {steps.map((step, index) => (
                <article
                  key={step.en}
                  className={`relative grid min-h-[154px] place-items-center border-b border-villa-primary-light/75 bg-white/45 p-4 text-center sm:min-h-[142px] sm:border-b-0 sm:border-r ${
                    index % 2 === 0 ? "border-r" : ""
                  } ${index === 4 ? "col-span-2 border-b-0 sm:col-span-1 sm:border-r-0" : ""}`}
                >
                  <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-villa-primary text-xs font-black text-white shadow-[0_6px_16px_rgba(232,146,124,0.25)]">{index + 1}</span>
                  <div className="grid h-16 w-16 place-items-center rounded-[18px] bg-villa-primary-bg shadow-[0_8px_22px_rgba(61,31,13,0.08)]">
                    <Icon name={step.icon} className="h-11 w-11" />
                  </div>
                  <div>
                    <h3 className="mt-3 text-sm font-black leading-tight text-villa-text-primary">{t({ en: step.en, zh: step.zh })}</h3>
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-villa-text-secondary">{t(step.body)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-16">
          <div className="villa-container grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[24px] border border-villa-primary-light bg-white/88 p-5 shadow-[0_12px_36px_rgba(61,31,13,0.10)]">
              <div className="mb-4 flex items-center justify-center gap-2">
                <h2 className="section-title">{t({ en: "Before Boarding", zh: "入住前须知" })}</h2>
                <PawIcon className="h-5 w-5" />
              </div>
              <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-villa-primary-light">
                {notices.map((notice) => (
                  <div key={notice.en} className="grid min-h-[118px] place-items-center border-b border-r border-villa-primary-light/70 p-3 text-center last:border-r-0">
                    <Icon name={notice.icon} className="h-12 w-12" />
                    <strong className="text-[11px] font-black leading-tight text-villa-text-primary">{t({ en: notice.en, zh: notice.zh })}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article id="reviews" className="rounded-[24px] border border-villa-primary-light bg-white/88 p-5 shadow-[0_12px_36px_rgba(61,31,13,0.10)]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="section-title">{t({ en: "What Our Pet Parents Say", zh: "宠主评价" })}</h2>
                  <PawIcon className="h-5 w-5" />
                </div>
                <a href="#reviews" className="inline-flex items-center gap-1 text-xs font-black text-villa-primary">View All <ArrowIcon /></a>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {reviews.map((review) => (
                  <article key={review.name} className="rounded-[18px] bg-villa-primary-bg p-3">
                    <div className="h-28 overflow-hidden rounded-[16px] bg-white">
                      <DogPhoto position={review.pos} />
                    </div>
                    <div className="mt-3"><StarRating /></div>
                    <p className="mt-2 text-[11px] font-bold leading-snug text-villa-text-secondary">"{t(review.quote)}"</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-white"><DogPhoto position={review.pos} /></div>
                      <div>
                        <strong className="text-[11px]">{review.name}</strong>
                        <p className="m-0 text-[10px] font-semibold text-villa-text-muted">{review.dog}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-16">
          <div className="villa-container">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="section-title">{t({ en: "Happy Guests", zh: "快乐小客人" })}</h2>
              <PawIcon className="h-5 w-5" />
            </div>
            <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(7,minmax(0,1fr))]">
              {["34% 76%", "70% 72%", "50% 68%", "62% 64%", "39% 72%", "72% 68%", "32% 69%"].map((position, index) => (
                <div key={position} className="h-20 overflow-hidden rounded-[16px] bg-white shadow-[0_8px_22px_rgba(61,31,13,0.10)] sm:h-24">
                  <DogPhoto position={position} />
                </div>
              ))}
              <a href="#reviews" className="grid h-20 place-items-center rounded-[16px] bg-villa-primary p-3 text-center text-sm font-black text-white shadow-[0_10px_28px_rgba(232,146,124,0.28)] sm:h-24">
                View Gallery
              </a>
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
