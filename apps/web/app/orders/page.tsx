"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { useLanguage } from "../components/LanguageProvider";

type Filter = "all" | "active" | "balance" | "completed" | "cancelled";

const orders = [
  { id: 1, pet: "Mochi", service: "Overnight", date: "Jun 4-7", status: "balance", paid: 60, balance: 60, color: "border-orange-400", tag: "Balance Due" },
  { id: 2, pet: "Boba", service: "Daycare", date: "Jun 12", status: "active", paid: 25, balance: 25, color: "border-sky-400", tag: "Staying" },
  { id: 3, pet: "Luna", service: "Overnight", date: "Jun 18-20", status: "confirmed", paid: 40, balance: 40, color: "border-villa-green", tag: "Confirmed" },
  { id: 4, pet: "Nini", service: "Daycare", date: "May 28", status: "completed", paid: 45, balance: 0, color: "border-gray-300", tag: "Completed" }
];

export default function OrdersPage() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<number | null>(1);

  const filtered = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "balance") return order.status === "balance";
    if (filter === "active") return order.status === "active" || order.status === "confirmed";
    return order.status === filter;
  });

  return (
    <OwnerSidebar>
      <section className="p-5 sm:p-8 lg:p-10">
        <h1 className="font-title text-5xl font-black">{t({ en: "My Orders", zh: "我的订单" })}</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["all", "All", "全部"],
            ["active", "Active", "进行中"],
            ["balance", "Balance Due", "待付余款"],
            ["completed", "Completed", "已完成"],
            ["cancelled", "Cancelled", "已取消"]
          ].map(([id, en, zh]) => (
            <button key={id} type="button" onClick={() => setFilter(id as Filter)} className={filter === id ? "villa-button min-h-[44px]" : "villa-button-outline min-h-[44px]"}>
              {t({ en, zh })}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5">
          {filtered.map((order) => (
            <article key={order.id} className={`villa-card border-l-8 ${order.color} p-6`}>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-4xl">🐶</span>
                    <div>
                      <h2 className="font-title text-3xl font-black">{order.pet}</h2>
                      <p className="m-0 font-bold text-villa-text/60">{order.service} · {order.date}</p>
                    </div>
                    <span className="rounded-pill bg-villa-bg px-4 py-2 text-xs font-black">{order.tag}</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[18px] bg-villa-bg p-4 font-black">Paid<br /><span className="font-title text-3xl">RM{order.paid}</span></div>
                    <div className="rounded-[18px] bg-villa-bg p-4 font-black">Balance<br /><span className="font-title text-3xl">RM{order.balance}</span></div>
                    <div className="rounded-[18px] bg-villa-bg p-4 font-black">{t({ en: "Diary Preview", zh: "日记预览" })}<div className="mt-2 flex gap-1"><span className="h-10 w-10 rounded-lg bg-villa-peach" /><span className="h-10 w-10 rounded-lg bg-villa-green/30" /><span className="h-10 w-10 rounded-lg bg-villa-coral/40" /></div></div>
                  </div>
                </div>
                <div className="grid content-start gap-3">
                  {order.status === "balance" ? <button type="button" onClick={() => setExpanded(order.id)} className="villa-button">{t({ en: "Pay Balance", zh: "付余款" })}</button> : null}
                  {order.status === "active" ? <button type="button" onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="villa-button-outline">{t({ en: "Pay Early", zh: "提前付款" })}</button> : null}
                  {order.status === "confirmed" ? <button type="button" className="villa-button-outline">{t({ en: "Cancel Booking", zh: "取消预约" })}</button> : null}
                  {order.status === "completed" ? <button type="button" className="villa-button-outline">{t({ en: "Leave Review", zh: "留下评价" })}</button> : null}
                </div>
              </div>
              {expanded === order.id ? (
                <div className="mt-5 rounded-villa border border-villa-line bg-white/70 p-5">
                  <h3 className="font-title text-2xl font-black">{t({ en: "Quick Balance Payment", zh: "快速支付余款" })}</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["DuitNow", "FPX", "TNG", "GrabPay", "Visa"].map((method) => <button key={method} type="button" className="rounded-pill border border-villa-line bg-villa-bg px-4 py-2 text-sm font-black">{method}</button>)}
                  </div>
                  <button type="button" className="villa-button mt-4">{t({ en: `Pay RM${order.balance}`, zh: `支付 RM${order.balance}` })}</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </OwnerSidebar>
  );
}
