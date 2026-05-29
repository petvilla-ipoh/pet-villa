"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

const entries = [
  { time: "Morning", zhTime: "早", text: { en: "Mochi finished breakfast and enjoyed calm indoor play.", zh: "Mochi 吃完早餐，也进行了安静的室内活动。" }, photos: 3 },
  { time: "Afternoon", zhTime: "午", text: { en: "Cooling nap under AC. Mood is relaxed and playful.", zh: "下午在冷气房小睡，心情放松也愿意玩。" }, photos: 2 },
  { time: "Evening", zhTime: "晚", text: { en: "Dinner done. We are settling down for bedtime.", zh: "晚餐完成，准备休息睡觉。" }, photos: 1 }
];

export default function DiaryPage() {
  const { t } = useLanguage();
  const [pet, setPet] = useState("Mochi");
  const [date, setDate] = useState(4);
  const [liked, setLiked] = useState<number[]>([]);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <div className="rounded-[20px] bg-villa-accent-green p-4 text-sm font-bold text-white">
            {t({ en: "New update: Mochi just received an evening diary entry.", zh: "新更新：Mochi 刚收到一条晚间日记。" })}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <main>
              <h1 className="page-title">{t({ en: "Pet Diary", zh: "宠物日记" })}</h1>
              <div className="mt-5 flex gap-2">
                {["Mochi", "Boba"].map((name) => (
                  <button key={name} type="button" onClick={() => setPet(name)} className={pet === name ? "villa-button min-h-[42px]" : "villa-button-outline min-h-[42px]"}>{name}</button>
                ))}
              </div>
              <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <button key={day} type="button" onClick={() => setDate(day)} className={`relative min-w-[68px] rounded-[16px] border p-3 text-center text-xs font-bold ${date === day ? "border-villa-primary bg-villa-primary-light" : "border-villa-primary-light bg-white"}`}>
                    Jun<br />{day}
                    {[2, 4, 6].includes(day) ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-villa-accent-green" /> : null}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-4">
                {entries.map((entry, index) => (
                  <article key={entry.time} className="villa-card">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-pill bg-villa-primary-light px-3 py-1 text-xs font-bold">{t({ en: entry.time, zh: entry.zhTime })}</span>
                      <span className="rounded-pill bg-villa-primary-bg px-3 py-1 text-xs font-bold">Overnight</span>
                    </div>
                    <p className="body-copy mt-3">{t(entry.text)}</p>
                    <div className={`mt-3 grid gap-2 ${entry.photos === 1 ? "grid-cols-1" : entry.photos === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {Array.from({ length: entry.photos }).map((_, photoIndex) => <div key={photoIndex} className="photo-placeholder" />)}
                    </div>
                    <button type="button" onClick={() => setLiked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} className="mt-3 rounded-pill border border-villa-primary-light bg-white px-4 py-2 text-sm font-bold">
                      {liked.includes(index) ? "❤️" : "🤍"} {t({ en: "Love", zh: "喜欢" })}
                    </button>
                  </article>
                ))}
              </div>
            </main>
            <aside className="grid h-fit gap-4 xl:sticky xl:top-8">
              <div className="villa-card">
                <h2 className="section-title">{t({ en: "Today Summary", zh: "今日摘要" })}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Updates", "更新", "3"],
                    ["Photos", "照片", "6"],
                    ["Meals", "餐数", "2"],
                    ["Stay days", "住宿", "2"]
                  ].map(([en, zh, value]) => <div key={en} className="rounded-[16px] bg-villa-primary-bg p-3 text-sm font-bold">{t({ en, zh })}<br /><span className="text-xl">{value}</span></div>)}
                </div>
                <div className="mt-3 rounded-[16px] bg-villa-accent-green/15 p-3 text-sm font-bold">Mood: Happy</div>
              </div>
              <div className="villa-card overflow-hidden p-0">
                <div className="bg-villa-primary p-4 text-sm font-bold">{t({ en: "Chat", zh: "聊天" })}</div>
                <div className="grid gap-3 p-4">
                  <div className="rounded-[16px] bg-villa-primary-bg p-3 text-xs font-semibold">Host: Mochi is doing well!</div>
                  <input className="villa-input" placeholder={t({ en: "Type message...", zh: "输入消息..." })} />
                </div>
              </div>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
