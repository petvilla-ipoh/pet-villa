"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { readOrders, updateOrder, type VillaOrder } from "../lib/orderFlow";
import { daysInclusive, formatDateRange, getOrderDateRange, startOfLocalDay } from "../lib/bookingCapacity";

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
  if (order.service === "overnight") return `${order.serviceLabel} Â· ${order.dateLabel}`;
  return `${order.serviceLabel} Â· ${order.dateLabel}`;
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
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
    setMessage(t({ en: "Demo Payment Success. Balance paid successfully.", zh: "æµ‹è¯•ä»˜æ¬¾æˆåŠŸã€‚å°¾æ¬¾å·²æˆåŠŸæ”¯ä»˜ã€‚" }));
  }

  function cancelOrder(order: VillaOrder) {
    const nextOrders = updateOrder(order.orderId, (current) => ({ ...current, status: "cancelled", cancelledAt: new Date().toISOString() }));
    setOrders(nextOrders);
    setMessage(t({ en: "Booking cancelled.", zh: "é¢„çº¦å·²å–æ¶ˆã€‚" }));
  }

  function openReview(order: VillaOrder) {
    setReviewing(order.orderId);
    setReviewStars(order.review?.stars || 0);
    setReviewBody(order.review?.body || "");
  }

  function closeReview() {
    setReviewing(null);
    setReviewStars(0);
    setReviewBody("");
  }

  function saveReview(order: VillaOrder) {
    if (reviewStars < 1) {
      setMessage(t({ en: "Please choose a star rating first.", zh: "è¯·å…ˆé€‰æ‹©æ˜Ÿçº§è¯„åˆ†ã€‚" }));
      return;
    }
    const nextOrders = updateOrder(order.orderId, (current) => ({
      ...current,
      review: { stars: reviewStars, body: reviewBody || "Loved by Pet Villa.", createdAt: new Date().toISOString() }
    }));
    setOrders(nextOrders);
    closeReview();
    setMessage(t({ en: "Review saved. Thank you!", zh: "è¯„ä»·å·²ä¿å­˜ï¼Œè°¢è°¢ä½ ï¼" }));
  }

  function getTimeStatus(order: VillaOrder) {
    const today = startOfLocalDay(new Date());
    const range = getOrderDateRange(order);
    if (order.status === "cancelled") {
      const cancelled = order.cancelledAt ? new Date(order.cancelledAt) : null;
      return cancelled && !Number.isNaN(cancelled.getTime())
        ? t({ en: `Cancelled on ${formatDateRange(cancelled, cancelled)}`, zh: `已于 ${formatDateRange(cancelled, cancelled)} 取消` })
        : t({ en: "Cancelled", zh: "已取消" });
    }
    if (!range) return t({ en: "Date pending", zh: "日期待确认" });
    const checkIn = startOfLocalDay(range.start);
    const checkOut = startOfLocalDay(range.end);
    if (order.status === "completed") {
      if (today <= checkOut) return t({ en: "Completed status needs checkout confirmation", zh: "完成状态需确认退房日期" });
      const daysAgo = Math.max(1, daysInclusive(checkOut, today) - 1);
      return t({ en: `Completed ${daysAgo} Day${daysAgo === 1 ? "" : "s"} Ago`, zh: `已完成 ${daysAgo} 天` });
    }
    if (today < checkIn) {
      const daysToGo = Math.max(1, daysInclusive(today, checkIn) - 1);
      return t({ en: `Upcoming · Check-in in ${daysToGo} Day${daysToGo === 1 ? "" : "s"}`, zh: `即将入住 · ${daysToGo} 天后入住` });
    }
    if (today >= checkIn && today <= checkOut) {
      const dayNumber = Math.max(1, daysInclusive(checkIn, today));
      const totalDays = Math.max(1, daysInclusive(checkIn, checkOut));
      return t({ en: `Currently Staying · Day ${dayNumber} of ${totalDays}`, zh: `寄宿中 · 第 ${dayNumber}/${totalDays} 天` });
    }
    const daysAgo = Math.max(1, daysInclusive(checkOut, today) - 1);
    return t({ en: `Completed ${daysAgo} Day${daysAgo === 1 ? "" : "s"} Ago`, zh: `已完成 ${daysAgo} 天` });
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "My Orders", zh: "æˆ‘çš„è®¢å•" })}</h1>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {[
              ["all", "All", "å…¨éƒ¨"],
              ["active", "Active", "è¿›è¡Œä¸­"],
              ["balance", "Balance Due", "å¾…ä»˜å°¾æ¬¾"],
              ["completed", "Completed", "å·²å®Œæˆ"],
              ["cancelled", "Cancelled", "å·²å–æ¶ˆ"]
            ].map(([id, en, zh]) => (
              <button key={id} type="button" onClick={() => setFilter(id as Filter)} className={`${filter === id ? "villa-button" : "villa-button-outline"} min-h-[38px] min-w-fit px-4 py-2 text-xs`}>
                {t({ en, zh })}
              </button>
            ))}
          </div>

          {message ? <p className="mt-3 rounded-[14px] bg-villa-primary-bg p-3 text-xs font-black text-villa-primary">{message}</p> : null}

          {orders.length === 0 ? (
            <div className="villa-card mt-5 text-center">
              <h2 className="card-title">{t({ en: "No orders yet", zh: "è¿˜æ²¡æœ‰è®¢å•" })}</h2>
              <p className="body-copy mt-2">{t({ en: "Create a booking and pay the deposit to see it here.", zh: "åˆ›å»ºé¢„çº¦å¹¶æ”¯ä»˜è®¢é‡‘åŽï¼Œè®¢å•ä¼šæ˜¾ç¤ºåœ¨è¿™é‡Œã€‚" })}</p>
              <a href="/booking" className="villa-button mt-4 w-full">{t({ en: "Book a Stay", zh: "ç«‹å³é¢„çº¦" })}</a>
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
                        <p className="mt-2 text-[11px] font-black text-villa-primary">{getTimeStatus(order)}</p>
                      </div>
                    </div>
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black text-villa-text-secondary">
                    <div className="rounded-[14px] bg-villa-primary-bg p-3">{t({ en: "Paid", zh: "å·²ä»˜" })}<br /><span className="text-lg text-villa-text-primary">RM{order.paid}</span></div>
                    <div className="rounded-[14px] bg-villa-primary-bg p-3">{t({ en: "Balance", zh: "å°¾æ¬¾" })}<br /><span className="text-lg text-villa-text-primary">RM{order.balance}</span></div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.status === "balance" ? <button type="button" onClick={() => payBalance(order)} className="villa-button min-h-[38px] flex-1 px-4 py-2 text-xs">{t({ en: "Pay Balance", zh: "ä»˜å°¾æ¬¾" })}</button> : null}
                    {order.status === "active" ? <button type="button" onClick={() => payBalance(order)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">{t({ en: "Pay Early", zh: "æå‰ä»˜æ¬¾" })}</button> : null}
                    {order.status === "confirmed" ? <button type="button" onClick={() => cancelOrder(order)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">{t({ en: "Cancel", zh: "å–æ¶ˆ" })}</button> : null}
                    {order.status === "completed" ? <button type="button" onClick={() => openReview(order)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">{order.review ? t({ en: "Reviewed", zh: "å·²è¯„ä»·" }) : `â˜…â˜…â˜…â˜…â˜… ${t({ en: "Leave Review", zh: "ç•™ä¸‹è¯„ä»·" })}`}</button> : null}
                    <button type="button" onClick={() => setExpanded(open ? null : order.orderId)} className="villa-button-outline min-h-[38px] flex-1 px-4 py-2 text-xs">{open ? t({ en: "Hide Details", zh: "æ”¶èµ·è¯¦æƒ…" }) : t({ en: "Order Details", zh: "è®¢å•è¯¦æƒ…" })}</button>
                  </div>

                  {reviewing === order.orderId ? (
                    <div className="mt-3 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-3">
                      <div className="flex gap-1 text-2xl text-villa-primary">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" aria-label={`${star} stars`} onClick={() => setReviewStars(star)} className="leading-none">
                            {star <= reviewStars ? "â˜…" : "â˜†"}
                          </button>
                        ))}
                      </div>
                      <textarea className="villa-input mt-2 h-20 py-3" value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder={t({ en: "Share your review...", zh: "å†™ä¸‹ä½ çš„è¯„ä»·..." })} />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={closeReview} className="villa-button-outline w-full">{t({ en: "Cancel", zh: "å–æ¶ˆ" })}</button>
                        <button type="button" onClick={() => saveReview(order)} className="villa-button w-full">{t({ en: "Save Review", zh: "ä¿å­˜è¯„ä»·" })}</button>
                      </div>
                    </div>
                  ) : null}

                  {open ? (
                    <div className="mt-3 grid gap-3 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-3">
                      <button type="button" onClick={() => window.location.href = "/diary"} className="flex items-center justify-between rounded-[14px] bg-white p-3 text-left text-sm font-black text-villa-text-primary">
                        <span>{order.photosAvailable ? `${order.photosAvailable} ${t({ en: "Photos Available", zh: "å¼ ç…§ç‰‡å¯æŸ¥çœ‹" })}` : t({ en: "No diary photos yet", zh: "è¿˜æ²¡æœ‰æ—¥è®°ç…§ç‰‡" })}</span>
                        <span>â€º</span>
                      </button>
                      <div className="rounded-[14px] bg-white p-3 text-xs font-bold text-villa-text-secondary">
                        <div className="flex justify-between"><span>{t({ en: "Booking Total", zh: "é¢„çº¦æ€»é¢" })}</span><strong>RM{order.total}</strong></div>
                        <div className="mt-2 flex justify-between"><span>{t({ en: "Paid", zh: "å·²ä»˜" })}</span><strong>RM{order.paid}</strong></div>
                        <div className="mt-2 flex justify-between"><span>{t({ en: "Balance", zh: "å°¾æ¬¾" })}</span><strong>RM{order.balance}</strong></div>
                      </div>
                      <div className="rounded-[14px] bg-white p-3 text-xs font-bold text-villa-text-secondary">
                        <p className="m-0">{order.serviceLabel}</p>
                        <p className="m-0 mt-1">{order.dateLabel}</p>
                        <p className="m-0 mt-1">{order.specialRequest || t({ en: "No special request.", zh: "æ²¡æœ‰ç‰¹åˆ«è¦æ±‚ã€‚" })}</p>
                      </div>
                      {order.review ? <p className="rounded-[14px] bg-white p-3 text-xs font-bold text-villa-text-secondary">{"â˜…".repeat(order.review.stars)}{"â˜†".repeat(5 - order.review.stars)} {order.review.body}</p> : null}
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
