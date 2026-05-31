"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { readOrders, type VillaOrder } from "../lib/orderFlow";

const whatsappUrl = "https://wa.me/60123456789?text=Hi%20Pet%20Villa%2C%20I%20would%20like%20to%20ask%20about%20my%20dog%27s%20stay.";

export default function DiaryPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [date, setDate] = useState(4);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const nextOrders = readOrders();
    setOrders(nextOrders);
    setSelectedOrderId(nextOrders[0]?.orderId || "");
    function syncOrders() {
      const latest = readOrders();
      setOrders(latest);
      setSelectedOrderId((current) => current || latest[0]?.orderId || "");
    }
    window.addEventListener("pet-villa-orders", syncOrders);
    return () => window.removeEventListener("pet-villa-orders", syncOrders);
  }, []);

  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId);
  const hasDiary = Boolean(selectedOrder?.photosAvailable);
  const entries = useMemo(() => [
    {
      id: "morning",
      title: t({ en: "Morning", zh: "早上" }),
      body: t({ en: "Breakfast finished and calm indoor play.", zh: "早餐完成，也进行了安静的室内活动。" }),
      photos: 2
    },
    {
      id: "afternoon",
      title: t({ en: "Afternoon", zh: "下午" }),
      body: t({ en: "Cooling nap under AC.", zh: "在冷气房舒服午睡。" }),
      photos: 2
    },
    {
      id: "evening",
      title: t({ en: "Evening", zh: "晚上" }),
      body: t({ en: "Dinner done, settling down for bedtime.", zh: "晚餐完成，准备安心休息。" }),
      photos: 2
    }
  ], [t]);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <div className="rounded-[18px] bg-villa-accent-green p-3 text-xs font-black text-white">
            {hasDiary
              ? t({ en: "New diary updates are ready for you.", zh: "新的宠物日记已经更新。" })
              : t({ en: "Diary updates will appear here once the host posts them.", zh: "寄宿主发布日记后，会显示在这里。" })}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
            <main>
              <h1 className="page-title">{t({ en: "Pet Diary", zh: "宠物日记" })}</h1>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {orders.length ? orders.map((order) => (
                  <button
                    key={order.orderId}
                    type="button"
                    onClick={() => setSelectedOrderId(order.orderId)}
                    className={selectedOrderId === order.orderId ? "villa-button min-h-[38px] px-4 py-2 text-xs" : "villa-button-outline min-h-[38px] px-4 py-2 text-xs"}
                  >
                    {order.pets.map((pet) => pet.name).join(", ")}
                  </button>
                )) : (
                  <a href="/booking" className="villa-button min-h-[38px] px-4 py-2 text-xs">{t({ en: "Book a Stay", zh: "立即预约" })}</a>
                )}
              </div>

              <div className="mt-4 rounded-[20px] border border-villa-primary-light bg-white/90 p-4 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="card-title">{t({ en: "June 2026", zh: "2026年6月" })}</h2>
                  <span className="text-[11px] font-black text-villa-text-muted">{t({ en: "Green dot = updated", zh: "绿点代表有更新" })}</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDate(day)}
                      className={`relative grid h-10 place-items-center rounded-[14px] text-xs font-black ${date === day ? "bg-villa-primary text-white" : "bg-villa-primary-bg text-villa-text-secondary"}`}
                    >
                      {day}
                      {hasDiary && [2, 4, 6].includes(day) ? <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-villa-accent-green" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              {!orders.length ? (
                <div className="villa-card mt-4 text-center">
                  <h2 className="card-title">{t({ en: "No stays yet", zh: "还没有寄宿记录" })}</h2>
                  <p className="body-copy mt-2">{t({ en: "After a confirmed stay, diary updates will appear here.", zh: "确认寄宿后，日记更新会显示在这里。" })}</p>
                  <a href="/booking" className="villa-button mt-4 w-full">{t({ en: "Book a Stay", zh: "立即预约" })}</a>
                </div>
              ) : null}

              {orders.length && !hasDiary ? (
                <div className="villa-card mt-4 text-center">
                  <h2 className="card-title">{t({ en: "No diary updates yet", zh: "还没有日记更新" })}</h2>
                  <p className="body-copy mt-2">{t({ en: "The host will post photos and notes during the stay.", zh: "寄宿期间，寄宿主会发布照片和照顾记录。" })}</p>
                  <a href={whatsappUrl} className="villa-button mt-4 w-full">{t({ en: "WhatsApp Us", zh: "WhatsApp 联系我们" })}</a>
                </div>
              ) : null}

              {hasDiary ? (
                <div className="mt-4 grid gap-3">
                  {entries.map((entry) => {
                    const open = expanded === entry.id;
                    return (
                      <article key={entry.id} className="villa-card p-4">
                        <button type="button" onClick={() => setExpanded(open ? null : entry.id)} className="w-full text-left">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h2 className="card-title text-[18px]">{entry.title}</h2>
                              <p className="muted-copy m-0 text-xs">{entry.body}</p>
                              <p className="mt-2 text-xs font-black text-villa-primary">{entry.photos} {t({ en: "Photos", zh: "张照片" })}</p>
                            </div>
                            <span className="text-xl text-villa-primary">›</span>
                          </div>
                        </button>
                        {open ? (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {Array.from({ length: entry.photos }).map((_, index) => (
                              <div key={index} className="photo-placeholder h-24 rounded-[16px]" />
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </main>

            <aside className="grid h-fit gap-4 xl:sticky xl:top-8">
              <div className="villa-card">
                <h2 className="section-title">{t({ en: "Today Summary", zh: "今日摘要" })}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    [t({ en: "Updates", zh: "更新" }), hasDiary ? "3" : "0"],
                    [t({ en: "Photos", zh: "照片" }), hasDiary ? "6" : "0"],
                    [t({ en: "Meals", zh: "餐数" }), hasDiary ? "2" : "-"],
                    [t({ en: "Stay Days", zh: "住宿天数" }), selectedOrder?.nights ? String(selectedOrder.nights) : "-"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[16px] bg-villa-primary-bg p-3 text-xs font-black text-villa-text-secondary">
                      {label}<br /><span className="text-xl text-villa-text-primary">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-[16px] bg-villa-accent-green/15 p-3 text-xs font-black text-villa-accent-green">
                  {t({ en: "Mood updates appear after host posts diary.", zh: "寄宿主发布日记后会显示心情状态。" })}
                </div>
              </div>
              <div className="villa-card">
                <h2 className="section-title">{t({ en: "Message Host", zh: "联系寄宿主" })}</h2>
                <p className="body-copy mt-2">{t({ en: "Chat is not connected yet. Use WhatsApp for real support.", zh: "实时聊天尚未连接，请先使用 WhatsApp 联系我们。" })}</p>
                <a href={whatsappUrl} className="villa-button mt-4 w-full">{t({ en: "WhatsApp Us", zh: "WhatsApp 联系我们" })}</a>
              </div>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
