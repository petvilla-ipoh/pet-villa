"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { cancelCustomerOrder, loadOrders, writeOrders, type VillaOrder } from "../lib/orderFlow";
import { daysInclusive, formatDateRange, getOrderDateRange, startOfLocalDay } from "../lib/bookingCapacity";
import { restoreVoucherForOrder } from "../lib/vouchers";
import { saveCustomerOrderReview } from "../lib/reviews";
import { dogAvatarSrc, loadPetProfiles, type PetProfile } from "../lib/petProfiles";

type Filter = "all" | "active" | "balance" | "completed" | "cancelled";

const statusTone: Record<VillaOrder["status"], "gold" | "blue" | "green" | "purple" | "rose" | "neutral"> = {
  pending_verification: "purple",
  balance: "gold",
  active: "blue",
  confirmed: "green",
  staying: "blue",
  awaiting_checkout: "purple",
  ready_pickup: "rose",
  completed: "neutral",
  cancelled: "rose"
};

function DogIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0" aria-hidden="true">
      <circle cx="24" cy="25" r="14" fill="#f5c4b3" />
      <path d="M12 22c-5 2-6 9-3 13 3 4 9 3 11-1M36 22c5 2 6 9 3 13-3 4-9 3-11-1" fill="#c7824f" />
      <circle cx="19" cy="25" r="2" fill="#3d1f0d" />
      <circle cx="29" cy="25" r="2" fill="#3d1f0d" />
      <ellipse cx="24" cy="31" rx="4" ry="3" fill="#3d1f0d" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
      <rect x="7" y="9" width="26" height="25" rx="5" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.5" />
      <path d="M7 17h26M14 6v7M26 6v7" stroke="#e8927c" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <path d="M13 7h22l-2 4 2 4-2 4 2 4-2 4 2 4-2 4 2 6H13l2-6-2-4 2-4-2-4 2-4-2-4 2-4-2-4Z" fill="#fff7ef" stroke="#e8927c" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M20 17h9M20 25h11M20 33h7" stroke="#8d65da" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function formatOrderId(orderId: string) {
  return orderId.replace(/^order-/, "PV-");
}

function detailLabel(order: VillaOrder) {
  return `${order.serviceLabel} · ${order.dateLabel}`;
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<VillaOrder | null>(null);
  const [petProfiles, setPetProfiles] = useState<PetProfile[]>([]);

  useEffect(() => {
    document.body.dataset.petVillaSurface = "orders";
    return () => {
      delete document.body.dataset.petVillaSurface;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let hasLoadedOnce = false;
    async function syncOrders() {
      if (hasLoadedOnce) setRefreshingOrders(true);
      try {
        const nextOrders = await loadOrders();
        if (!active) return;
        setOrders(nextOrders);
        hasLoadedOnce = true;
        setHasLoadedOrders(true);
        setMessage("");
      } catch (error) {
        if (!active) return;
        setMessage(hasLoadedOnce
          ? t({ en: "Unable to refresh — showing last known orders.", zh: "暂时无法刷新，正在显示上次同步的订单。" })
          : error instanceof Error ? error.message : t({ en: "Your orders could not be loaded.", zh: "无法读取您的订单。" }));
      } finally {
        if (active) setRefreshingOrders(false);
      }
    }
    async function syncPets() {
      try {
        const nextPets = await loadPetProfiles();
        if (!active) return;
        setPetProfiles(nextPets);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : t({ en: "Your pets could not be loaded.", zh: "无法读取您的宠物资料。" }));
      }
    }
    function handleOrdersChanged() {
      void syncOrders();
    }
    function handlePetsChanged() {
      void syncPets();
    }
    function handleVisibleRefresh() {
      if (document.visibilityState === "visible") void syncOrders();
    }
    void syncOrders();
    void syncPets();
    window.addEventListener("pet-villa-orders", handleOrdersChanged);
    window.addEventListener("pet-villa-pets", handlePetsChanged);
    window.addEventListener("focus", handleVisibleRefresh);
    document.addEventListener("visibilitychange", handleVisibleRefresh);
    return () => {
      active = false;
      window.removeEventListener("pet-villa-orders", handleOrdersChanged);
      window.removeEventListener("pet-villa-pets", handlePetsChanged);
      window.removeEventListener("focus", handleVisibleRefresh);
      document.removeEventListener("visibilitychange", handleVisibleRefresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter = filter === "all"
        ? true
        : filter === "balance"
          ? order.balance > 0 && order.status !== "cancelled"
        : filter === "active"
            ? ["pending_verification", "active", "confirmed", "staying", "awaiting_checkout", "ready_pickup"].includes(order.status)
            : order.status === filter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        formatOrderId(order.orderId),
        order.serviceLabel,
        order.dateLabel,
        getStatusLabel(order),
        ...order.pets.map((pet) => `${pet.name} ${pet.breed || ""}`)
      ].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [filter, orders, query]);

  function payBalance(order: VillaOrder) {
    window.location.assign(`/payment?order=${encodeURIComponent(order.orderId)}&mode=balance`);
  }

  async function cancelOrder(order: VillaOrder) {
    try {
      const nextOrders = await cancelCustomerOrder(order);
      setOrders(nextOrders);
      try {
        await restoreVoucherForOrder(order.orderId);
        setMessage(t({ en: "Booking cancelled.", zh: "预约已取消。" }));
      } catch {
        setMessage(t({ en: "Booking cancelled, but the voucher could not be restored. Please contact Pet Villa.", zh: "预约已取消，但优惠券无法恢复，请联系 Pet Villa。" }));
      }
      setCancelTarget(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t({ en: "Booking cancellation failed. Please try again.", zh: "取消预约失败，请重试。" }));
    }
  }

  function openReview(order: VillaOrder) {
    if (order.status !== "completed" || order.review) return;
    setReviewing(order.orderId);
    setReviewStars(0);
    setReviewBody("");
  }

  function closeReview() {
    setReviewing(null);
    setReviewStars(0);
    setReviewBody("");
  }

  async function saveReview(order: VillaOrder) {
    if (reviewSaving) return;
    if (order.status !== "completed") {
      setMessage(t({ en: "Reviews are available after the stay is completed.", zh: "完成寄宿后才可以提交评价。" }));
      return;
    }
    if (order.review) {
      setMessage(t({ en: "A review has already been submitted for this order.", zh: "这张订单已经提交过评价。" }));
      return;
    }
    if (reviewStars < 1) {
      setMessage(t({ en: "Please choose a star rating first.", zh: "请先选择星级评分。" }));
      return;
    }
    if (reviewBody.trim().length < 3) {
      setMessage(t({ en: "Please write a short review before saving.", zh: "保存前请写下简短评价。" }));
      return;
    }
    const createdAt = new Date().toISOString();
    setReviewSaving(true);
    try {
      const updatedOrder: VillaOrder = {
        ...order,
        review: { stars: reviewStars, body: reviewBody.trim(), createdAt }
      };
      await saveCustomerOrderReview(updatedOrder);
      const nextOrders = orders.map((item) => item.orderId === order.orderId ? updatedOrder : item);
      writeOrders(nextOrders);
      setOrders(nextOrders);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t({ en: "Your review could not be saved. Please try again.", zh: "评价无法保存，请重试。" }));
      setReviewSaving(false);
      return;
    }
    window.dispatchEvent(new Event("pet-villa-reviews"));
    closeReview();
    setMessage(t({ en: "Review saved. Thank you!", zh: "评价已保存，谢谢你！" }));
    setReviewSaving(false);
  }

  function getStatusLabel(order: VillaOrder) {
    if (order.status === "pending_verification") return t({ en: "Verifying Payment", zh: "付款核对中" });
    if (order.status === "balance") return t({ en: "Balance Due", zh: "待付尾款" });
    if (order.status === "active" || order.status === "staying") return t({ en: "Staying", zh: "寄宿中" });
    if (order.status === "confirmed") return t({ en: "Confirmed", zh: "已确认" });
    if (order.status === "ready_pickup") return t({ en: "Ready Pickup", zh: "可接回" });
    if (order.status === "awaiting_checkout") return t({ en: "Awaiting Checkout", zh: "待退房" });
    if (order.status === "completed") return t({ en: "Completed", zh: "已完成" });
    return t({ en: "Cancelled", zh: "已取消" });
  }

  function getOrderAvatars(order: VillaOrder) {
    return order.pets.map((pet) => {
      const profile = petProfiles.find((item) => item.id === pet.id)
        || petProfiles.find((item) => item.name.trim().toLowerCase() === pet.name.trim().toLowerCase());
      return { id: pet.id, name: pet.name, src: dogAvatarSrc(profile?.photoDataUrl || pet.photoDataUrl) };
    });
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
        <section className="orders-page">
          <header className="orders-compact-header">
            <div className="orders-title-row">
              <span><ReceiptIcon /></span>
              <div>
                <p>{t({ en: "Pet Villa Orders", zh: "Pet Villa 订单" })}</p>
                <h1>{t({ en: "My Orders", zh: "我的订单" })}</h1>
              </div>
              <b>{hasLoadedOrders ? orders.length : "—"}</b>
            </div>
            <label className="orders-search">
              <CalendarIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t({ en: "Search pet, order, date...", zh: "搜索宠物、订单、日期..." })}
              />
            </label>
            <div className="orders-filter-rail">
              {[
                ["all", "All", "全部"],
                ["active", "Current", "当前"],
                ["balance", "Balance", "尾款"],
                ["completed", "Past", "历史"],
                ["cancelled", "Cancel", "取消"]
              ].map(([id, en, zh]) => (
                <button key={id} type="button" onClick={() => setFilter(id as Filter)} data-active={filter === id}>
                  {t({ en, zh })}
                </button>
              ))}
            </div>
          </header>

          <span className="sr-only" aria-live="polite">{refreshingOrders ? t({ en: "Refreshing orders", zh: "正在同步订单" }) : ""}</span>
          {message ? <p className="orders-message">{message}</p> : null}

          {!hasLoadedOrders && !message ? (
            <section className="orders-empty-card orders-empty-card-compact" aria-busy="true">
              <span><ReceiptIcon /></span>
              <h2>{t({ en: "Loading your orders", zh: "正在读取订单" })}</h2>
              <p>{t({ en: "Securely syncing your latest booking history.", zh: "正在安全同步最新预约记录。" })}</p>
            </section>
          ) : null}

          {hasLoadedOrders && orders.length === 0 ? (
            <section className="orders-empty-card">
              <span><ReceiptIcon /></span>
              <h2>{t({ en: "No orders yet", zh: "还没有订单" })}</h2>
              <p>{t({ en: "Create a booking and pay the deposit to keep your receipt here.", zh: "创建预约并支付订金后，收据会保存在这里。" })}</p>
              <a href="/booking" className="orders-primary-action">{t({ en: "Book a Stay", zh: "立即预约" })}</a>
            </section>
          ) : null}

          {hasLoadedOrders && orders.length > 0 && filtered.length === 0 ? (
            <section className="orders-empty-card orders-empty-card-compact">
              <span><ReceiptIcon /></span>
              <h2>{t({ en: "No matching orders", zh: "找不到订单" })}</h2>
              <p>{t({ en: "Try another pet name, order number, service or date.", zh: "可以换宠物名、订单编号、服务或日期搜索。" })}</p>
            </section>
          ) : null}

          <div className="orders-list">
            {filtered.map((order) => {
              const petNames = order.pets.map((pet) => pet.name).join(", ");
              const open = expanded === order.orderId;
              const avatars = getOrderAvatars(order);
              return (
                <article key={order.orderId} className="orders-card" data-open={open}>
                  <button type="button" onClick={() => setExpanded(open ? null : order.orderId)} className="orders-card-main">
                    <span className="orders-card-avatar" data-stack={avatars.length > 1 || undefined}>
                      {avatars.length ? avatars.slice(0, 3).map((avatar) => <img key={avatar.id} src={avatar.src} alt={avatar.name} />) : <DogIcon />}
                      {avatars.length > 3 ? <b>+{avatars.length - 3}</b> : null}
                    </span>
                    <span className="orders-card-copy">
                      <span className="orders-card-topline">
                        <strong>{petNames || t({ en: "Selected pets", zh: "已选宠物" })}</strong>
                        <b data-tone={statusTone[order.status]}>{getStatusLabel(order)}</b>
                      </span>
                      <span>{detailLabel(order)}</span>
                      <small>{getTimeStatus(order)}</small>
                    </span>
                  </button>

                  <div className="orders-money-row">
                    <div data-tone="total">
                      <span>{t({ en: "Total", zh: "总额" })}</span>
                      <strong>RM{order.total}</strong>
                    </div>
                    <div data-tone="paid">
                      <span>{t({ en: "Paid", zh: "已付" })}</span>
                      <strong>RM{order.paid}</strong>
                    </div>
                    <div data-tone={order.balance > 0 ? "balance-due" : "balance-clear"}>
                      <span>{t({ en: "Balance", zh: "尾款" })}</span>
                      <strong>RM{order.balance}</strong>
                    </div>
                  </div>

                  <div className="orders-action-row">
                    {order.balance > 0 && order.status !== "pending_verification" && order.status !== "cancelled" && order.status !== "completed" ? (
                      <button type="button" onClick={() => payBalance(order)} className="orders-primary-action orders-action-small">{t({ en: "Pay Balance", zh: "付尾款" })}</button>
                    ) : null}
                    {order.status === "confirmed" || order.status === "pending_verification" ? (
                      <button type="button" onClick={() => setCancelTarget(order)} className="orders-soft-action">{t({ en: "Cancel", zh: "取消" })}</button>
                    ) : null}
                    {order.status === "completed" ? (
                      <button type="button" disabled={Boolean(order.review)} onClick={() => openReview(order)} className="orders-soft-action disabled:cursor-default disabled:opacity-60">{order.review ? t({ en: "Reviewed", zh: "已评价" }) : t({ en: "Leave Review", zh: "留下评价" })}</button>
                    ) : null}
                    <button type="button" onClick={() => setExpanded(open ? null : order.orderId)} className="orders-soft-action">
                      {open ? t({ en: "Hide Details", zh: "收起详情" }) : t({ en: "View Details", zh: "查看详情" })}
                    </button>
                  </div>

                  {reviewing === order.orderId ? (
                    <section className="orders-review-card">
                      <div className="orders-star-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" aria-label={`${star} stars`} onClick={() => setReviewStars(star)} data-active={star <= reviewStars}>
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea className="villa-input mt-2 h-20 py-3" value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder={t({ en: "Share your review...", zh: "写下你的评价..." })} />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={closeReview} className="orders-soft-action w-full">{t({ en: "Cancel", zh: "取消" })}</button>
                        <button type="button" disabled={reviewSaving} onClick={() => void saveReview(order)} className="orders-primary-action w-full">{reviewSaving ? t({ en: "Saving...", zh: "保存中..." }) : t({ en: "Save Review", zh: "保存评价" })}</button>
                      </div>
                    </section>
                  ) : null}

                  {open ? (
                    <section className="orders-detail-card">
                      <button type="button" onClick={() => { window.location.href = "/diary"; }} className="orders-diary-link">
                        <span>{order.photosAvailable ? `${order.photosAvailable} ${t({ en: "Photos Available", zh: "张照片可查看" })}` : t({ en: "No diary photos yet", zh: "还没有日记照片" })}</span>
                        <b>›</b>
                      </button>
                      <div className="orders-detail-grid">
                        <p><span>{t({ en: "Order ID", zh: "订单编号" })}</span><strong>{formatOrderId(order.orderId)}</strong></p>
                        <p><span>{t({ en: "Booking Total", zh: "预约总额" })}</span><strong>RM{order.total}</strong></p>
                        <p><span>{t({ en: "Paid", zh: "已付" })}</span><strong>RM{order.paid}</strong></p>
                        <p><span>{t({ en: "Balance", zh: "尾款" })}</span><strong>RM{order.balance}</strong></p>
                      </div>
                      <div className="orders-note-card">
                        <strong>{order.serviceLabel}</strong>
                        <span>{order.dateLabel}</span>
                        <p>{order.specialRequest || t({ en: "No special request.", zh: "没有特别要求。" })}</p>
                      </div>
                      {order.review ? (
                        <div className="orders-note-card">
                          <strong>{t({ en: "Your Review", zh: "你的评价" })}</strong>
                          <span>{"★".repeat(order.review.stars)}{"☆".repeat(5 - order.review.stars)}</span>
                          <p>{order.review.body}</p>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
        {cancelTarget ? (
          <div className="orders-modal-backdrop">
            <div className="orders-modal">
              <h2>{t({ en: "Cancel Booking?", zh: "取消预约？" })}</h2>
              <p>
                {t({
                  en: "This will release the reserved capacity and restore any used voucher when eligible.",
                  zh: "取消后会释放名额；符合条件的优惠券会恢复可用。"
                })}
              </p>
              <div>
                <button type="button" className="orders-soft-action" onClick={() => setCancelTarget(null)}>{t({ en: "Keep Booking", zh: "保留预约" })}</button>
                <button type="button" className="orders-primary-action" onClick={() => cancelOrder(cancelTarget)}>{t({ en: "Cancel Booking", zh: "确认取消" })}</button>
              </div>
            </div>
          </div>
        ) : null}
      </OwnerSidebar>
    </ProtectedPage>
  );
}
