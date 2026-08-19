"use client";

import { useLanguage } from "./LanguageProvider";

type Copy = { en: string; zh: string };
type LegalSection = {
  title: Copy;
  paragraphs?: Copy[];
  bullets?: Copy[];
};

const updated = { en: "Last updated: 17 August 2026", zh: "最后更新：2026年8月17日" };

const privacySections: LegalSection[] = [
  {
    title: { en: "1. Who This Policy Applies To", zh: "1. 本政策适用对象" },
    paragraphs: [{
      en: "This Privacy Policy explains how Pet Villa collects and uses personal information when you use the Pet Villa website, create or use a Customer account, make or manage a booking, communicate with Pet Villa, or receive pet-care or Private Diary updates.",
      zh: "本隐私政策说明当你使用 Pet Villa 网站、创建或使用顾客账号、创建或管理预约、与 Pet Villa 沟通，或接收宠物照护及私人日记更新时，Pet Villa 如何收集和使用个人资料。"
    }]
  },
  {
    title: { en: "2. Information Pet Villa Collects", zh: "2. Pet Villa 收集的资料" },
    paragraphs: [{
      en: "Pet Villa may collect information required to provide its services, including:",
      zh: "Pet Villa 可能收集提供服务所需的资料，包括："
    }],
    bullets: [
      { en: "Name, email address, phone or contact number, and Customer account information", zh: "姓名、邮箱、电话号码或联络号码，以及顾客账号资料" },
      { en: "Pet profiles, care instructions, feeding information, allergies, medication, special needs, and pet photos", zh: "宠物资料、照顾说明、喂食资料、过敏、药物、特殊需求及宠物照片" },
      { en: "Booking and stay information, selected services, dates, times, requests, and order or payment-related business records", zh: "预约及入住资料、所选服务、日期、时间、要求，以及订单或付款相关营业记录" },
      { en: "Customer messages or chat, Private Diary care information, and Private Diary photos, videos, or other media", zh: "顾客讯息或聊天、私人日记照护资料，以及私人日记照片、视频或其他媒体" },
      { en: "Authentication and account identifiers necessary for secure account access", zh: "安全账号访问所需的认证及账号识别资料" }
    ]
  },
  {
    title: { en: "3. How Pet Villa Uses Information", zh: "3. Pet Villa 如何使用资料" },
    paragraphs: [
      {
        en: "Pet Villa uses Customer information only for Pet Villa service and operational purposes, including:",
        zh: "Pet Villa 只会将顾客资料用于 Pet Villa 服务及营运用途，包括："
      },
      {
        en: "Pet Villa does not sell personal information and does not currently use Customer information for marketing or promotional campaigns.",
        zh: "Pet Villa 不会出售个人资料，目前也不会将顾客资料用于营销或促销活动。"
      }
    ],
    bullets: [
      { en: "Creating and maintaining Customer accounts", zh: "创建及维护顾客账号" },
      { en: "Arranging boarding or daycare services and managing bookings and stays", zh: "安排寄宿或日托服务，以及管理预约和入住" },
      { en: "Pet-care, service, payment-related, support, and other necessary operational communication", zh: "宠物照护、服务、付款相关、客服及其他必要的营运沟通" },
      { en: "Maintaining legitimate booking and business records", zh: "维护正当的预约及营业记录" },
      { en: "Customer messaging, Private Diary updates, and account, security, and Customer-isolation functions", zh: "顾客聊天、私人日记更新，以及账号、安全与顾客资料隔离功能" }
    ]
  },
  {
    title: { en: "4. Account and Authentication", zh: "4. 账号与认证" },
    paragraphs: [{
      en: "Pet Villa uses Supabase Auth for secure Customer account authentication, including Email + Password login, password recovery, optional Google Sign-In, authenticated Customer identity, secure session handling, and supported identity linking. Pet Villa uses the authenticated account identity to provide access to the correct Customer profile and Customer-only information.",
      zh: "Pet Villa 使用 Supabase Auth 提供安全的顾客账号认证，包括邮箱及密码登录、密码重设、可选的 Google 登录、已认证的顾客身份、安全会话处理及支持的身份链接。Pet Villa 会使用已认证的账号身份，让顾客访问正确的个人资料及仅属于该顾客的资料。"
    }]
  },
  {
    title: { en: "5. Google Sign-In", zh: "5. Google 登录" },
    paragraphs: [
      {
        en: "If you choose Continue with Google, Pet Villa uses Google Sign-In through Supabase Auth. For this sign-in function, Pet Villa may receive and use your verified Google email address, your Google account display or full name when available, and provider or account identity information required to authenticate or link the account.",
        zh: "如你选择使用 Google 继续，Pet Villa 会通过 Supabase Auth 使用 Google 登录。为了此登录功能，Pet Villa 可能接收及使用你的已验证 Google 邮箱、可用时的 Google 账号显示名称或全名，以及认证或链接账号所需的服务提供者或账号身份资料。"
      },
      {
        en: "This Google Sign-In flow does not access Gmail, Google Drive, Google Contacts, Google Calendar, or other Google APIs beyond authentication. Phone remains contact information only. It is not a Google identity, authentication identity, OTP identity, or CRM ownership proof. Normal Google Sign-In does not automatically claim Host-created Customer records.",
        zh: "此 Google 登录流程不会访问 Gmail、Google Drive、Google Contacts、Google Calendar 或认证以外的其他 Google API。电话号码仅作为联络资料，不是 Google 身份、认证身份、OTP 身份或 CRM 归属证明。一般 Google 登录不会自动认领由 Host 建立的顾客记录。"
      }
    ]
  },
  {
    title: { en: "6. Pet, Booking, and Service Information", zh: "6. 宠物、预约及服务资料" },
    paragraphs: [{
      en: "Pet Villa uses Customer information, pet information, booking and stay information, order or payment-related business records, messages, and Private Diary information or media to provide requested Pet Villa services and communicate with the Customer.",
      zh: "Pet Villa 会使用顾客资料、宠物资料、预约及入住资料、订单或付款相关营业记录、讯息及私人日记资料或媒体，以提供所要求的 Pet Villa 服务并与顾客沟通。"
    }]
  },
  {
    title: { en: "7. Service Providers and Operational Tools", zh: "7. 服务提供者及营运工具" },
    bullets: [
      { en: "Supabase: authentication, database and application records, and storage used by Pet Villa.", zh: "Supabase：Pet Villa 使用的认证、数据库及应用记录与储存服务。" },
      { en: "Google: optional Google Sign-In authentication only when you choose it.", zh: "Google：仅在你选择时提供可选的 Google 登录认证。" },
      { en: "Vercel: hosting the Pet Villa website and application.", zh: "Vercel：托管 Pet Villa 网站及应用。" },
      { en: "WhatsApp: Customer service and necessary operational communication where Pet Villa and the Customer communicate through WhatsApp.", zh: "WhatsApp：当 Pet Villa 与顾客通过 WhatsApp 沟通时，用于顾客服务及必要的营运沟通。" }
    ]
  },
  {
    title: { en: "8. Data Security", zh: "8. 资料安全" },
    paragraphs: [{
      en: "Pet Villa uses authenticated account access, Customer-isolation controls, and secure session handling within the application to help protect Customer information. No method of electronic storage or transmission can be guaranteed to be completely secure.",
      zh: "Pet Villa 在应用内使用已认证账号访问、顾客资料隔离控制及安全会话处理，以协助保护顾客资料。任何电子储存或传输方式都无法保证完全安全。"
    }]
  },
  {
    title: { en: "9. Data Retention", zh: "9. 资料保留" },
    paragraphs: [{
      en: "Pet Villa does not apply a single fixed retention period to all Customer information. Information is retained only for as long as reasonably necessary to provide Pet Villa services, maintain legitimate booking and business records, meet applicable accounting or legal requirements, and resolve operational matters. When information is no longer reasonably required for those purposes, Pet Villa may delete or otherwise appropriately dispose of it where applicable.",
      zh: "Pet Villa 不会对所有顾客资料采用单一固定保留期限。资料仅会在为提供 Pet Villa 服务、维护正当预约及营业记录、符合适用会计或法律要求，以及处理营运事项所合理需要的期间内保留。当资料不再为这些目的所合理需要时，Pet Villa 可在适用情况下删除或以其他适当方式处理。"
    }]
  },
  {
    title: { en: "10. Customer Privacy Requests", zh: "10. 顾客隐私请求" },
    paragraphs: [{
      en: "Customers may contact Pet Villa regarding access to, correction of, or other privacy requests concerning their personal information at kahyee199@gmail.com. Some information may need to be retained where reasonably necessary for legitimate booking or business records, accounting, operational matters, or applicable legal requirements.",
      zh: "顾客可通过 kahyee199@gmail.com 联系 Pet Villa，提出有关其个人资料的查阅、更正或其他隐私请求。部分资料可能因维护正当预约或营业记录、会计、营运事项或适用法律要求而需要在合理必要范围内继续保留。"
    }]
  },
  {
    title: { en: "11. Policy Updates", zh: "11. 政策更新" },
    paragraphs: [{
      en: "Pet Villa may update this Privacy Policy when its services or data-handling practices change. The current version and update date will be published on this page.",
      zh: "当 Pet Villa 的服务或资料处理方式发生变化时，Pet Villa 可能更新本隐私政策。最新版本及更新日期将公布于本页面。"
    }]
  }
];

const termsSections: LegalSection[] = [
  {
    title: { en: "1. Pet Villa Services", zh: "1. Pet Villa 服务" },
    paragraphs: [{
      en: "Pet Villa provides small-dog boarding and daycare services through its website and Customer Portal.",
      zh: "Pet Villa 通过网站及顾客门户提供小型犬寄宿和日托服务。"
    }]
  },
  {
    title: { en: "2. Pet Eligibility and Safety", zh: "2. 宠物资格与安全" },
    paragraphs: [{
      en: "Pet Villa accepts small dogs from 1-12kg only. For safety, Pet Villa may refuse aggressive dogs, dogs with fleas, or dogs without basic health information.",
      zh: "Pet Villa 仅接待 1-12kg 的小型犬。为了安全，Pet Villa 可能拒绝攻击性犬只、有跳蚤或缺少基本健康资料的狗狗。"
    }]
  },
  {
    title: { en: "3. Booking Confirmation and Stay Times", zh: "3. 预约确认与入住时间" },
    paragraphs: [
      {
        en: "A booking is confirmed only after the required deposit or payment has been received and verified by Pet Villa. Submitting a payment or payment proof does not by itself mean that the payment has been verified or that the booking is confirmed.",
        zh: "只有在 Pet Villa 已收到并核实所需订金或付款后，预约才会被确认。提交付款或付款凭证本身并不代表付款已核实或预约已确认。"
      },
      {
        en: "Check-in is from 9:00am to 8:00pm. Check-out is before 12:00pm.",
        zh: "入住时间为上午 9:00 至晚上 8:00。退房时间为中午 12:00 前。"
      }
    ]
  },
  {
    title: { en: "4. Owner Responsibilities", zh: "4. 宠主责任" },
    paragraphs: [{
      en: "Before boarding where applicable, owners must provide food, care instructions, emergency contact information, and information about allergies, medication, or special needs.",
      zh: "在适用情况下，宠主须在寄宿前提供食物、照顾说明、紧急联络资料，以及过敏、药物或特殊需求资料。"
    }]
  },
  {
    title: { en: "5. Additional Business Rules", zh: "5. 其他营业规则" },
    paragraphs: [{
      en: "Pet Villa has not published additional cancellation, refund, emergency-care authority, liability, dispute, payment-penalty, automatic-forfeiture, or booking-deletion rules on this page.",
      zh: "Pet Villa 尚未在本页面公布额外的取消、退款、紧急照护授权、责任、争议、付款罚则、自动没收或预约删除规则。"
    }]
  },
  {
    title: { en: "6. Terms Updates", zh: "6. 条款更新" },
    paragraphs: [{
      en: "The current version of these Terms will be published on this page when Pet Villa updates them.",
      zh: "当 Pet Villa 更新本服务条款时，最新版本将公布于本页面。"
    }]
  }
];

export function PublicLegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { lang, toggleLang, t } = useLanguage();
  const isPrivacy = kind === "privacy";
  const title = isPrivacy
    ? { en: "Pet Villa Privacy Policy", zh: "Pet Villa 隐私政策" }
    : { en: "Pet Villa Terms of Service", zh: "Pet Villa 服务条款" };
  const eyebrow = isPrivacy
    ? { en: "Customer information", zh: "顾客资料" }
    : { en: "Customer service terms", zh: "顾客服务条款" };
  const sections = isPrivacy ? privacySections : termsSections;
  const otherHref = isPrivacy ? "/terms" : "/privacy";
  const otherLabel = isPrivacy
    ? { en: "Terms of Service", zh: "服务条款" }
    : { en: "Privacy Policy", zh: "隐私政策" };

  return (
    <main className="pet-dream-bg min-h-screen px-4 py-6 text-villa-text-primary sm:px-6 sm:py-10 lg:px-10">
      <div className="villa-container mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="The Pet Villa home">
            <img src="/petvilla-app-badge.webp" alt="The Pet Villa" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
            <span className="min-w-0">
              <strong className="block truncate font-title text-xl font-black text-[#3d1f0d] sm:text-2xl">The Pet Villa</strong>
              <span className="block text-[11px] font-bold text-villa-text-secondary">{t({ en: "Ipoh Pet Boarding", zh: "怡保宠物寄宿" })}</span>
            </span>
          </a>
          <button type="button" onClick={toggleLang} className="pet-pressable grid h-11 min-w-11 place-items-center rounded-full border border-white/80 bg-white/90 px-3 text-xs font-black text-[#8d65da] shadow-md">
            {lang === "en" ? "中文" : "EN"}
          </button>
        </header>

        <section className="pet-clay-panel rounded-[30px] p-5 sm:rounded-[36px] sm:p-8 lg:p-10">
          <span className="inline-flex rounded-pill bg-[#efe7ff] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#7655c4]">{t(eyebrow)}</span>
          <h1 className="mt-4 font-title text-3xl font-black leading-tight text-[#3d1f0d] sm:text-4xl">{t(title)}</h1>
          <p className="mt-2 text-sm font-semibold text-villa-text-secondary">{t(updated)}</p>

          <div className="mt-7 grid gap-6 sm:mt-9 sm:gap-8">
            {sections.map((section) => (
              <section key={section.title.en} className="rounded-[24px] border border-white/90 bg-white/80 p-4 shadow-[0_12px_28px_rgba(61,31,13,0.07)] sm:p-5">
                <h2 className="font-title text-xl font-black text-[#3d1f0d]">{t(section.title)}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph.en} className="mt-3 text-sm font-semibold leading-7 text-villa-text-secondary">{t(paragraph)}</p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-villa-text-secondary">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.en} className="flex gap-2">
                        <span className="mt-1 text-villa-primary" aria-hidden="true">•</span>
                        <span>{t(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#ead8ff] pt-5 text-sm font-black">
            <a href="/" className="text-[#6c4aba] hover:text-[#3d1f0d]">{t({ en: "Back to Pet Villa", zh: "返回 Pet Villa" })}</a>
            <a href={otherHref} className="text-[#6c4aba] hover:text-[#3d1f0d]">{t(otherLabel)}</a>
          </nav>
        </section>
      </div>
    </main>
  );
}
