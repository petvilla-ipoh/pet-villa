"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { readOrders, updateOrder, type VillaOrder } from "../lib/orderFlow";

type Filter = "all" | "active" | "balance" | "completed" | "cancelled";

const statusStyles: Record<VillaOrder["status"], string> = {
  balance: "bg-orange-50 text-orange-600",
  active: "bg-sky-50 text-sky-600",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600"
};

function DogIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 shrink-0" aria-hidden="true">
      <circle cx="24" cy="25" r="14" fill="#f5c4b3" />
      <path d="M12 22c-5 2-6 9-3 13 3 4 9 3 11-1M36 22c5 2 6 9 3 13-3 4-9 3-11-1" fill="#c7824f" />
      <circle cx="19" cy="25" r="2" fill="#3d1f0d" />
      <circle cx="29" cy="25" r="2" fill="#3d1f0d" />
      <ellipse cx="24" cy="31" rx="4" ry="3" fill="#3d1f0d" />
    </svg>
  );
}

function detailLabel(order: VillaOrder) {
  if (order.service === "overnight") return `${order.serviceLabel} · ${order.dateLabel}`;
  return `${order.serviceLabel} · ${order.dateLabel}`;
}

function timeStatus(order: VillaOrder) {
  if (order.status === "balance") return "Upcoming · Check-in in 2 Days";
  if (order.status === "active") return `Currently Staying · Day 2 of ${Math.max(1, order.nights || 1)}`;
  if (order.status === "completed") return "Completed 12 Days Ago";
  if (order.status === "cancelled") return "Cancelled on Jun 2";
  return "Upcoming";
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewBody, setReviewBody] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    function syncOrders() {
      setOrders(readOrders());
    }
    syncOrders();
    window.addEventListener("pet-villa-orders", syncOrders);
    return () => window.removeEventListener("pet-villa-orders", syncOrders);
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (filter === "all") return true;
      if (filter === "balance") return order.status === "balance";
      if (filter === "active") return order.status === "active" || order.status === "confirmed";
      return order.status === filter;
    });
  }, [filter, orders]);

  function payBalance(order: VillaOrder) {
    const nextOrders = updateOrder(order.orderId, (current) => ({
      ...current,
      paid: current.total,
      balance: 0,
      status: "completed"
    }));
    setOrders(nextOrders);
    setMessage(t({ en: "Demo Payment Success. Balance paid successfully.", zh: "测试付款成功。尾款已成功支付。" }));
  }

  function cancelOrder(order: VillaOrder) {
    const nextOrders = updateOrder(order.orderId, (current) => ({ ...current, status: "cancelled" }));
    setOrders(nextOrders);
    setMessage(t({ en: "Booking cancelled.", zh: "预约已取消。" }));
  }

  function saveReview(order: VillaOrder) {
    const nextOrders = updateOrder(order.orderId, (current) => ({
      ...current,
      review: { stars: 5, body: reviewBody || "Loved by Pet Villa.", createdAt: new Date().toISOString() }
    }));
    setOrders(nextOrders);
    setReviewing(null);
    setReviewBody("");
    setMessage(t({ en: "Review saved. Thank you!", zh: "评价已保存，谢谢你！" }));
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "My Orders", zh: "我的订单" })}</h1>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {[
              ["all", "All", "全部"],
              ["active", "Active", "进行中"],
              ["balance", "Balance Due", "待付尾款"],
              ["completed", "Completed", "已完成"],
              ["cancelled", "Cancelled", "已取消"]
            ].map(([id, en, zh]) => (
              <button key={id} type="button" onClick={() => setFilter(id as Filter)} className={`${filter === id ? "villa-button" : "villa-button-outline"} min-h-[38px] min-w-fit px-4 py-2 text-xs`}>
                {t({ en, zh })}
              </button>
            ))}
          </div>

          {message ? <p className="mt-3 rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{message}</p> : null}

          {orders.length === 0 ? (
            <div className="villa-card mt-5 text-center">
              <h2 className="card-title">{t({ en: "No orders yet", zh: "还没有订单" })}</h2>
              <p className="body-copy mt-2">{t({ en: "Create a booking and pay the deposit to see it here.", zh: "创建预约并支付订金后，订单会显示在这里。" })}</p>
              <a href="/booking" className="villa-button mt-4 w-full">{t({ en: "Book a Stay", zh: "立即预约" })}</a>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            {filtered.map((order) => {
              const petNames = order.pets.map((pet) => pet.name).join(", ");
              const open = expanded === order.orderId;
              const statusLabel = order.status === "balance"
                ? "Balance Due"
                : order.status === "active"
                  ? "Staying"
                  : order.status.charAt(0).toUpperCase() + order.status.slice(1);
              return (
                <article key={order.orderId} className="villa-card p-4">
                  <button type="button" onClick={() => setExpanded(open ? null : order.orderId)} className="w-full text-left">
                    <div className="flex items-start gap-3">
                      <DogIcon />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="card-title text-[18px]">{petNames}</h2>
                            <p className="muted-copy m-0 text-xs">{detailLabel(order)}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusStyles[order.status]}`}>{statusLabel}</span>
                        </div>
                        <p className="mt-2 text-[11px] font-black text-villa-primary">{timeStatus(order)}</p>
                      </div>
                    </div>
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black text-villa-text-secondary">
                    <div className="rounded-[14px] bg-villa-primary-bg p-3">{t({ en: "Paid", zh: "已付" })}<br /><span className="text-lg text-villa-text-primary">RM{order.paid}</span></div>
                    <div className="rounded-[14px] bg-villa-primary-bg p-3">{t({ en: "Balance", zh: "尾款" })}<br /><span className="text-lg text-villa-text-primary">RM{order.balance}</span></div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.status === "balance" ? <button type="button" onClick={() => payBalance(order)} className="villa-button min-h-[38px] flex-1 px-4 py-2 text-xs">{t({ en: "Pay Balance", zh: "付尾款" })}</button> : null}
                    {order.status === "active" ? <button type="button" onClick={() => payBalance(order)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">{t({ en: "Pay Early", zh: "提前付款" })}</button> : null}
                    {order.status === "confirmed" ? <button type="button" onClick={() => cancelOrder(order)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">{t({ en: "Cancel", zh: "取消" })}</button> : null}
                    {order.status === "completed" ? <button type="button" onClick={() => setReviewing(order.orderId)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">★★★★★ {t({ en: "Leave Review", zh: "留下评价" })}</button> : null}
                    <button type="button" onClick={() => setExpanded(open ? null : order.orderId)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">{open ? t({ en: "Hide Details", zh: "收起详情" }) : t({ en: "Order Details", zh: "订单详情" })}</button>
                  </div>

                  {reviewing === order.orderId ? (
                    <div className="mt-3 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-3">
                      <div className="text-lg text-villa-primary">★★★★★</div>
                      <textarea className="villa-input mt-2 h-20 py-3" value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder={t({ en: "Share your review...", zh: "写下你的评价..." })} />
                      <button type="button" onClick={() => saveReview(order)} className="villa-button mt-3 w-full">{t({ en: "Save Review", zh: "保存评价" })}</button>
                    </div>
                  ) : null}

                  {open ? (
                    <div className="mt-3 grid gap-3 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-3">
                      <button type="button" onClick={() => window.location.href = "/diary"} className="flex items-center justify-between rounded-[14px] bg-white p-3 text-left text-sm font-black text-villa-text-primary">
                        <span>{order.photosAvailable ? `${order.photosAvailable} ${t({ en: "Photos Available", zh: "张照片可查看" })}` : t({ en: "No diary photos yet", zh: "还没有日记照片" })}</span>
                        <span>›</span>
                      </button>
                      <div className="rounded-[14px] bg-white p-3 text-xs font-bold text-villa-text-secondary">
                        <div className="flex justify-between"><span>{t({ en: "Booking Total", zh: "预约总额" })}</span><strong>RM{order.total}</strong></div>
                        <div className="mt-2 flex justify-between"><span>{t({ en: "Paid", zh: "已付" })}</span><strong>RM{order.paid}</strong></div>
                        <div className="mt-2 flex justify-between"><span>{t({ en: "Balance", zh: "尾款" })}</span><strong>RM{order.balance}</strong></div>
                      </div>
                      <div className="rounded-[14px] bg-white p-3 text-xs font-bold text-villa-text-secondary">
                        <p className="m-0">{order.serviceLabel}</p>
                        <p className="m-0 mt-1">{order.dateLabel}</p>
                        <p className="m-0 mt-1">{order.specialRequest || t({ en: "No special request.", zh: "没有特别要求。" })}</p>
                      </div>
                      {order.review ? <p className="rounded-[14px] bg-white p-3 text-xs font-bold text-villa-text-secondary">★★★★★ {order.review.body}</p> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
