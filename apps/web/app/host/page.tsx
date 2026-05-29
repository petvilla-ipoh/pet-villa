"use client";

import { useState } from "react";
import { AppNav } from "../components/AppNav";
import { useLanguage } from "../components/LanguageProvider";

const dogs = ["Mochi", "Boba"];
const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);

export default function HostPage() {
  const { t } = useLanguage();
  const [requestStatus, setRequestStatus] = useState<"pending" | "accepted" | "rejected">("pending");

  return (
    <div className="min-h-screen bg-villa-brown text-villa-peach">
      <AppNav host />
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="bg-villa-sidebar p-5 lg:min-h-[calc(100vh-81px)]">
          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {[
              ["Dashboard", "仪表盘"],
              ["Bookings", "预约"],
              ["Calendar", "日历"],
              ["Diary", "日记"],
              ["Messages", "消息"],
              ["Income", "收入"]
            ].map(([en, zh], index) => (
              <a key={en} href="#" className={`rounded-[18px] px-4 py-3 text-sm font-black ${index === 0 ? "bg-villa-coral text-villa-text" : "text-villa-peach/80 hover:bg-white/5"}`}>
                {t({ en, zh })}
              </a>
            ))}
          </nav>
        </aside>

        <main className="bg-villa-bg p-5 text-villa-text sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">HOST PANEL</span>
              <h1 className="mt-4 font-title text-5xl font-black">{t({ en: "Villa Dashboard", zh: "寄宿主后台" })}</h1>
            </div>
            <button type="button" className="villa-button">{t({ en: "Manage Availability", zh: "管理档期" })}</button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Today's dogs", "今日入住", "2/3"],
              ["New requests", "新申请", "4"],
              ["This week income", "本周收入", "RM480"],
              ["Balance due", "待收余款", "RM120"]
            ].map(([en, zh, value]) => (
              <div key={en} className="villa-card p-5">
                <p className="m-0 text-sm font-black text-villa-text/55">{t({ en, zh })}</p>
                <div className="mt-2 font-title text-4xl font-black">{value}</div>
              </div>
            ))}
          </div>

          <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-6">
              <div className="villa-card p-6">
                <h2 className="font-title text-3xl font-black">{t({ en: "Today's Dogs", zh: "今日狗狗" })}</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {dogs.map((dog) => (
                    <article key={dog} className="rounded-villa border border-villa-line bg-white/70 p-5">
                      <div className="text-4xl">🐶</div>
                      <h3 className="font-title text-3xl font-black">{dog}</h3>
                      <p className="font-bold text-villa-text/60">Overnight · happy</p>
                      <div className="mt-4 flex gap-2">
                        <button type="button" className="villa-button min-h-[42px] px-4">{t({ en: "Post Diary", zh: "发日记" })}</button>
                        <button type="button" className="villa-button-outline min-h-[42px] px-4">{t({ en: "Chat", zh: "聊天" })}</button>
                      </div>
                    </article>
                  ))}
                  <article className="grid min-h-[210px] place-items-center rounded-villa border-2 border-dashed border-villa-green/50 bg-white/40 p-5 text-center font-black text-villa-text/50">
                    {t({ en: "1 spot available", zh: "还有 1 个空位" })}
                  </article>
                </div>
              </div>

              <div className="villa-card p-6">
                <h2 className="font-title text-3xl font-black">{t({ en: "New Booking Request", zh: "新预约申请" })}</h2>
                <div className="mt-5 rounded-villa border border-villa-line bg-white/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-title text-3xl font-black">Lulu · 5.4kg</h3>
                      <p className="m-0 font-bold text-villa-text/60">Vaccinated · calm · Jun 16-18</p>
                    </div>
                    <span className="rounded-pill bg-villa-bg px-4 py-2 text-sm font-black">{requestStatus}</span>
                  </div>
                  {requestStatus === "pending" ? (
                    <div className="mt-5 flex gap-3">
                      <button type="button" onClick={() => setRequestStatus("accepted")} className="villa-button">{t({ en: "Accept", zh: "接受" })}</button>
                      <button type="button" onClick={() => setRequestStatus("rejected")} className="villa-button-outline">{t({ en: "Reject", zh: "拒绝" })}</button>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-[18px] bg-villa-green/15 p-4 font-black">{t({ en: "Customer notification sent.", zh: "已通知客户。" })}</p>
                  )}
                </div>
              </div>

              <div className="villa-card p-6">
                <h2 className="font-title text-3xl font-black">{t({ en: "June Calendar", zh: "六月日历" })}</h2>
                <div className="mt-5 grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const booked = [4, 5, 6, 12, 13, 18, 19, 22].includes(day);
                    const full = [7, 8, 20].includes(day);
                    const today = day === 29;
                    return (
                      <div key={day} className={`grid min-h-[48px] place-items-center rounded-[14px] border text-sm font-black ${full ? "bg-pink-200" : booked ? "bg-villa-peach/70" : "bg-white/70"} ${today ? "border-2 border-villa-coral" : "border-villa-line"}`}>
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="grid h-fit gap-6 xl:sticky xl:top-8">
              <div className="villa-card p-6">
                <h2 className="font-title text-3xl font-black">{t({ en: "Income Summary", zh: "收入摘要" })}</h2>
                <div className="mt-5 font-title text-5xl font-black">RM2,680</div>
                <p className="font-bold text-villa-text/60">{t({ en: "Estimated this month", zh: "本月预计收入" })}</p>
                <div className="mt-5 h-4 overflow-hidden rounded-full bg-villa-bg">
                  <div className="h-full w-[72%] rounded-full bg-villa-green" />
                </div>
                <p className="mt-2 text-sm font-black text-villa-text/55">{t({ en: "Monthly usage rate 72%", zh: "本月使用率 72%" })}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Post Diary", "发日记"],
                  ["Messages", "消息"],
                  ["Report Issue", "报告问题"],
                  ["Manage Slots", "管理档期"]
                ].map(([en, zh]) => (
                  <button key={en} type="button" className="min-h-[88px] rounded-villa bg-villa-coral p-4 font-black text-villa-text shadow-soft">
                    {t({ en, zh })}
                  </button>
                ))}
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
