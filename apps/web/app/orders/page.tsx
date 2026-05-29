"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { PaymentLogo, paymentMethods } from "../components/PaymentLogo";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

type Filter = "all" | "active" | "balance" | "completed" | "cancelled";

const orders = [
  { id: 1, pet: "Mochi", service: "Overnight", date: "Jun 4-7", status: "balance", paid: 60, balance: 60, color: "border-orange-400", tag: "Balance Due" },
  { id: 2, pet: "Boba", service: "Daycare", date: "Jun 12", status: "active", paid: 25, balance: 25, color: "border-sky-400", tag: "Staying" },
  { id: 3, pet: "Luna", service: "Overnight", date: "Jun 18-20", status: "confirmed", paid: 40, balance: 40, color: "border-villa-accent-green", tag: "Confirmed" },
  { id: 4, pet: "Nini", service: "Daycare", date: "May 28", status: "completed", paid: 45, balance: 0, color: "border-gray-300", tag: "Completed" }
];

export default function OrdersPage() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<number | null>(1);
  const [method, setMethod] = useState("duitnow");

  const filtered = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "balance") return order.status === "balance";
    if (filter === "active") return order.status === "active" || order.status === "confirmed";
    return order.status === filter;
  });

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "My Orders", zh: "我的订单" })}</h1>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {[
              ["all", "All", "全部"],
              ["active", "Active", "进行中"],
              ["balance", "Balance Due", "待付余款"],
              ["completed", "Completed", "已完成"],
              ["cancelled", "Cancelled", "已取消"]
            ].map(([id, en, zh]) => (
              <button key={id} type="button" onClick={() => setFilter(id as Filter)} className={`${filter === id ? "villa-button" : "villa-button-outline"} min-w-fit min-h-[42px] px-4`}>
                {t({ en, zh })}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4">
            {filtered.map((order) => (
              <article key={order.id} className={`villa-card border-l-4 ${order.color}`}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🐶</span>
                      <div>
                        <h2 className="card-title">{order.pet}</h2>
                        <p className="muted-copy m-0">{order.service} · {order.date}</p>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex rounded-pill bg-villa-primary-bg px-3 py-1 text-xs font-bold">{order.tag}</span>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[16px] bg-villa-primary-bg p-3 text-sm font-bold">Paid<br /><span className="text-xl">RM{order.paid}</span></div>
                      <div className="rounded-[16px] bg-villa-primary-bg p-3 text-sm font-bold">Balance<br /><span className="text-xl">RM{order.balance}</span></div>
                      <div className="rounded-[16px] bg-villa-primary-bg p-3 text-sm font-bold">
                        Diary
                        <div className="mt-2 flex gap-1"><span className="photo-placeholder h-9 min-h-0 w-9 rounded-lg" /><span className="photo-placeholder h-9 min-h-0 w-9 rounded-lg" /><span className="photo-placeholder h-9 min-h-0 w-9 rounded-lg" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid content-start gap-2">
                    {order.status === "balance" ? <button type="button" onClick={() => setExpanded(order.id)} className="villa-button">{t({ en: "Pay Balance", zh: "付余款" })}</button> : null}
                    {order.status === "active" ? <button type="button" onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="villa-button-outline">{t({ en: "Pay Early", zh: "提前付款" })}</button> : null}
                    {order.status === "confirmed" ? <button type="button" className="villa-button-outline">{t({ en: "Cancel", zh: "取消" })}</button> : null}
                    {order.status === "completed" ? <button type="button" className="villa-button-outline">{t({ en: "Review", zh: "评价" })}</button> : null}
                  </div>
                </div>
                {expanded === order.id ? (
                  <div className="mt-4 rounded-[20px] border border-villa-primary-light bg-villa-primary-bg p-4">
                    <h3 className="card-title">{t({ en: "Pay Balance", zh: "支付余款" })}</h3>
                    <div className="mt-3 grid gap-3">
                      {paymentMethods.slice(0, 4).map((item) => <PaymentLogo key={item.id} method={item} selected={method === item.id} onClick={() => setMethod(item.id)} />)}
                    </div>
                    <button type="button" className="villa-button mt-4 w-full">{t({ en: `Pay RM${order.balance}`, zh: `支付 RM${order.balance}` })}</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
