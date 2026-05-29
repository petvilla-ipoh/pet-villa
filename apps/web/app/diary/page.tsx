"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
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
    <OwnerSidebar>
      <section className="p-5 sm:p-8 lg:p-10">
        <div className="rounded-villa bg-villa-green p-4 font-black text-white">
          {t({ en: "New update: Mochi just received an evening diary entry.", zh: "新更新：Mochi 刚收到一条晚间日记。" })}
        </div>
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main>
            <h1 className="font-title text-5xl font-black">{t({ en: "Pet Diary", zh: "宠物日记" })}</h1>
            <div className="mt-6 flex gap-2">
              {["Mochi", "Boba"].map((name) => (
                <button key={name} type="button" onClick={() => setPet(name)} className={pet === name ? "villa-button min-h-[44px]" : "villa-button-outline min-h-[44px]"}>{name}</button>
              ))}
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button key={day} type="button" onClick={() => setDate(day)} className={`relative min-w-[76px] rounded-[18px] border p-3 text-center font-black ${date === day ? "border-villa-coral bg-villa-peach" : "border-villa-line bg-white/70"}`}>
                  Jun<br />{day}
                  {[2, 4, 6].includes(day) ? <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-villa-green" /> : null}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-5">
              {entries.map((entry, index) => (
                <article key={entry.time} className="villa-card p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-pill bg-villa-peach px-4 py-2 text-sm font-black">{t({ en: entry.time, zh: entry.zhTime })}</span>
                    <span className="rounded-pill bg-villa-bg px-4 py-2 text-sm font-black">Overnight</span>
                  </div>
                  <p className="mt-4 text-lg font-bold text-villa-text/70">{t(entry.text)}</p>
                  <div className={`mt-4 grid gap-3 ${entry.photos === 1 ? "grid-cols-1" : entry.photos === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {Array.from({ length: entry.photos }).map((_, photoIndex) => (
                      <div key={photoIndex} className="grid min-h-[130px] place-items-center rounded-[20px] bg-villa-peach/55 font-black">Photo</div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLiked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}
                    className="mt-4 rounded-pill border border-villa-line bg-white px-4 py-2 font-black"
                  >
                    {liked.includes(index) ? "❤️" : "🤍"} {t({ en: "Love this update", zh: "喜欢这条更新" })}
                  </button>
                </article>
              ))}
            </div>
          </main>

          <aside className="grid h-fit gap-5 xl:sticky xl:top-8">
            <div className="villa-card p-6">
              <h2 className="font-title text-3xl font-black">{t({ en: "Today Summary", zh: "今日摘要" })}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ["Updates", "更新", "3"],
                  ["Photos", "照片", "6"],
                  ["Meals", "餐数", "2"],
                  ["Stay days", "住宿天数", "2"]
                ].map(([en, zh, value]) => (
                  <div key={en} className="rounded-[18px] bg-villa-bg p-4 font-black">{t({ en, zh })}<br /><span className="font-title text-3xl">{value}</span></div>
                ))}
              </div>
              <div className="mt-4 rounded-[18px] bg-villa-green/15 p-4 font-black text-villa-text">Mood: Happy & relaxed</div>
            </div>
            <div className="villa-card overflow-hidden">
              <div className="bg-villa-coral p-4 font-title text-2xl font-black">{t({ en: "Chat", zh: "聊天" })}</div>
              <div className="grid gap-3 p-4">
                <div className="rounded-[18px] bg-villa-bg p-3 text-sm font-bold">Host: Mochi is doing well!</div>
                <input className="villa-input" placeholder={t({ en: "Type message...", zh: "输入消息..." })} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </OwnerSidebar>
  );
}
