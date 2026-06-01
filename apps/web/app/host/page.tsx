"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppNav } from "../components/AppNav";
import { useLanguage } from "../components/LanguageProvider";
import { availableSlotsForDate, buildCapacityMap, MAX_DOGS_PER_DAY, toDateKey } from "../lib/bookingCapacity";
import { readGuestPhotos, saveGuestPhoto, deleteGuestPhoto, type GuestPhoto } from "../lib/gallery";
import { readMessages, sendMessage, type VillaMessage } from "../lib/messages";
import { readOrders, type VillaOrder } from "../lib/orderFlow";
import { deleteHostReview, readHostReviews, saveHostReview, type HostReview } from "../lib/reviews";
import { readHostOffDays, writeHostOffDays } from "../lib/hostAvailability";

const hostPhotoPlaceholder = "/hero-dogs.png";

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function countRegisteredUsers() {
  if (typeof window === "undefined") return 0;
  const keys = Object.keys(window.localStorage);
  const petOwners = keys.filter((key) => key.startsWith("pet-villa-pets:")).length;
  return Math.max(petOwners, window.localStorage.getItem("pet-villa-session") ? 1 : 0);
}

function countOrderCustomers(orders: VillaOrder[]) {
  return new Set(orders.flatMap((order) => order.pets.map((pet) => pet.name))).size;
}

export default function HostPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [reviews, setReviews] = useState<HostReview[]>([]);
  const [messages, setMessages] = useState<VillaMessage[]>([]);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const [photoForm, setPhotoForm] = useState({ petName: "", breed: "", caption: "", imageUrl: "" });
  const [reviewForm, setReviewForm] = useState({ name: "", pet: "", rating: 5, en: "", zh: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => {
      setOrders(readOrders());
      setPhotos(readGuestPhotos());
      setReviews(readHostReviews());
      setMessages(readMessages());
      setOffDays(readHostOffDays());
    };
    sync();
    window.addEventListener("pet-villa-orders", sync);
    window.addEventListener("pet-villa-gallery", sync);
    window.addEventListener("pet-villa-reviews", sync);
    window.addEventListener("pet-villa-messages", sync);
    window.addEventListener("pet-villa-availability", sync);
    return () => {
      window.removeEventListener("pet-villa-orders", sync);
      window.removeEventListener("pet-villa-gallery", sync);
      window.removeEventListener("pet-villa-reviews", sync);
      window.removeEventListener("pet-villa-messages", sync);
      window.removeEventListener("pet-villa-availability", sync);
    };
  }, []);

  const capacityMap = useMemo(() => buildCapacityMap(orders), [orders]);
  const nextDays = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(todayLocal(), index)), []);
  const activeOrders = orders.filter((order) => !["cancelled", "completed"].includes(order.status));
  const balanceDue = orders.reduce((sum, order) => sum + Math.max(0, order.balance || 0), 0);

  function toggleOffDay(date: Date) {
    const key = toDateKey(date);
    const next = offDays.includes(key) ? offDays.filter((day) => day !== key) : [...offDays, key];
    setOffDays(next);
    writeHostOffDays(next);
  }

  function handlePhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoForm((current) => ({ ...current, imageUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  function publishPhoto() {
    if (!photoForm.petName.trim()) {
      setNotice(t({ en: "Please add a pet name before publishing.", zh: "发布前请填写宠物名字。" }));
      return;
    }
    saveGuestPhoto({
      petName: photoForm.petName,
      breed: photoForm.breed || "Small dog",
      caption: photoForm.caption || "Happy guest at Pet Villa.",
      imageUrl: photoForm.imageUrl || hostPhotoPlaceholder,
      visibleOnHome: true,
      color: "#f0b46e"
    });
    setPhotoForm({ petName: "", breed: "", caption: "", imageUrl: "" });
    setNotice(t({ en: "Happy Guest photo published to Home.", zh: "Happy Guests 照片已同步到首页。" }));
  }

  function publishReview() {
    if (!reviewForm.name.trim() || !reviewForm.en.trim()) {
      setNotice(t({ en: "Please add reviewer name and review text.", zh: "请填写顾客名字和评价内容。" }));
      return;
    }
    saveHostReview({
      name: reviewForm.name,
      pet: reviewForm.pet || "Small dog",
      rating: reviewForm.rating,
      quote: {
        en: reviewForm.en,
        zh: reviewForm.zh || reviewForm.en
      }
    });
    setReviewForm({ name: "", pet: "", rating: 5, en: "", zh: "" });
    setNotice(t({ en: "Review published to Home.", zh: "评价已同步到首页。" }));
  }

  function sendHostReply() {
    if (!reply.trim()) return;
    sendMessage("host", reply);
    setReply("");
    setMessages(readMessages());
  }

  return (
    <div className="min-h-screen bg-[#3d1f0d] text-[#f5c4b3]">
      <AppNav host />
      <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="bg-[#2a1508] p-4 lg:min-h-[calc(100vh-81px)]">
          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {[
              ["Dashboard", "仪表盘"],
              ["Calendar", "档期"],
              ["Happy Guests", "客人照片"],
              ["Reviews", "评价"],
              ["Messages", "消息"],
              ["Orders", "订单"]
            ].map(([en, zh], index) => (
              <a key={en} href={`#${en.toLowerCase().replaceAll(" ", "-")}`} className={`rounded-[16px] px-4 py-3 text-sm font-bold ${index === 0 ? "bg-[rgba(232,146,124,0.2)] text-[#f5c4b3]" : "text-[rgba(245,196,179,0.8)] hover:bg-white/5"}`}>
                {t({ en, zh })}
              </a>
            ))}
          </nav>
        </aside>

        <main className="host-paw-bg p-4 text-villa-text-primary lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">HOST PANEL</span>
              <h1 className="page-title mt-4">{t({ en: "Pet Villa Backoffice", zh: "Pet Villa 后台" })}</h1>
              <p className="body-copy mt-1">{t({ en: "Simple daily controls for bookings, capacity, reviews, gallery, and customer chat.", zh: "管理预约、名额、评价、照片和顾客聊天。" })}</p>
            </div>
            <a href="/booking" className="villa-button">{t({ en: "Open Booking", zh: "打开预约页" })}</a>
          </div>

          {notice ? <p className="mt-4 rounded-[16px] bg-villa-primary-bg p-3 text-sm font-black text-villa-primary">{notice}</p> : null}

          <div id="dashboard" className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              [t({ en: "Registered owners", zh: "注册宠主" }), String(countRegisteredUsers())],
              [t({ en: "Customers with orders", zh: "下单顾客" }), String(countOrderCustomers(orders))],
              [t({ en: "Active bookings", zh: "进行中订单" }), String(activeOrders.length)],
              [t({ en: "Balance due", zh: "待收尾款" }), `RM${balanceDue}`]
            ].map(([label, value]) => (
              <div key={label} className="villa-card p-5">
                <p className="m-0 text-sm font-black text-villa-text-secondary">{label}</p>
                <div className="mt-2 text-[28px] font-extrabold text-villa-text-primary">{value}</div>
              </div>
            ))}
          </div>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-6">
              <div id="calendar" className="villa-card p-5">
                <h2 className="section-title">{t({ en: "Calendar Capacity", zh: "日历名额" })}</h2>
                <p className="body-copy mt-1">{t({ en: "System counts dogs, not orders. Tap a day to mark or release an off day.", zh: "系统按狗狗数量计算名额，不按订单数。点击日期可设置或取消休息日。" })}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {nextDays.map((date) => {
                    const key = toDateKey(date);
                    const slots = availableSlotsForDate(date, capacityMap);
                    const off = offDays.includes(key);
                    const full = slots <= 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleOffDay(date)}
                        className={`rounded-[18px] border p-3 text-left text-xs font-black transition hover:-translate-y-px ${
                          off ? "border-villa-text-primary bg-villa-text-primary text-white" : full ? "border-red-200 bg-red-50 text-red-600" : "border-villa-primary-light bg-white text-villa-text-primary"
                        }`}
                      >
                        <span className="block">{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <strong className="mt-2 block text-sm">{off ? "Off Day" : full ? "Full" : `${slots}/${MAX_DOGS_PER_DAY} slots`}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div id="happy-guests" className="villa-card p-5">
                <h2 className="section-title">{t({ en: "Happy Guests Gallery", zh: "Happy Guests 照片" })}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                  <div className="grid gap-3">
                    <label className="grid h-40 cursor-pointer place-items-center overflow-hidden rounded-[18px] border-2 border-dashed border-villa-primary-light bg-villa-primary-bg text-center text-sm font-black text-villa-primary">
                      {photoForm.imageUrl ? <img src={photoForm.imageUrl} alt="" className="h-full w-full object-cover" /> : t({ en: "Upload photo", zh: "上传照片" })}
                      <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoFile} />
                    </label>
                    <input className="villa-input" value={photoForm.petName} onChange={(event) => setPhotoForm({ ...photoForm, petName: event.target.value })} placeholder={t({ en: "Pet name", zh: "宠物名字" })} />
                    <input className="villa-input" value={photoForm.breed} onChange={(event) => setPhotoForm({ ...photoForm, breed: event.target.value })} placeholder={t({ en: "Breed", zh: "品种" })} />
                    <input className="villa-input" value={photoForm.caption} onChange={(event) => setPhotoForm({ ...photoForm, caption: event.target.value })} placeholder={t({ en: "Caption", zh: "说明" })} />
                    <button type="button" className="villa-button" onClick={publishPhoto}>{t({ en: "Publish to Home", zh: "发布到首页" })}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.slice(0, 6).map((photo) => (
                      <article key={photo.id} className="overflow-hidden rounded-[18px] border border-villa-primary-light bg-white">
                        <img src={photo.imageUrl || hostPhotoPlaceholder} alt={photo.petName} className="h-24 w-full object-cover" />
                        <div className="p-3">
                          <strong className="block text-sm">{photo.petName}</strong>
                          <span className="text-xs font-bold text-villa-text-secondary">{photo.breed}</span>
                          {!photo.id.startsWith("guest-") ? <button type="button" className="mt-2 text-xs font-black text-villa-primary" onClick={() => deleteGuestPhoto(photo.id)}>{t({ en: "Delete", zh: "删除" })}</button> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <div id="reviews" className="villa-card p-5">
                <h2 className="section-title">{t({ en: "Pet Owner Reviews", zh: "宠主评价" })}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="grid gap-3">
                    <input className="villa-input" value={reviewForm.name} onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })} placeholder={t({ en: "Owner name", zh: "宠主名字" })} />
                    <input className="villa-input" value={reviewForm.pet} onChange={(event) => setReviewForm({ ...reviewForm, pet: event.target.value })} placeholder={t({ en: "Pet / breed", zh: "宠物 / 品种" })} />
                    <select className="villa-input" value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}>
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <textarea className="villa-input h-24 py-3" value={reviewForm.en} onChange={(event) => setReviewForm({ ...reviewForm, en: event.target.value })} placeholder="English review" />
                    <textarea className="villa-input h-24 py-3" value={reviewForm.zh} onChange={(event) => setReviewForm({ ...reviewForm, zh: event.target.value })} placeholder="中文评价（可选）" />
                    <button type="button" className="villa-button" onClick={publishReview}>{t({ en: "Publish Review", zh: "发布评价" })}</button>
                  </div>
                  <div className="grid content-start gap-3">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-3">
                        <div className="text-sm font-black text-[#f5a623]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                        <p className="mt-2 text-sm font-bold text-villa-text-primary">{review.quote.en}</p>
                        <p className="mt-2 text-xs font-black text-villa-text-secondary">{review.name} · {review.pet}</p>
                        <button type="button" className="mt-2 text-xs font-black text-villa-primary" onClick={() => deleteHostReview(review.id)}>{t({ en: "Delete", zh: "删除" })}</button>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="grid h-fit gap-6 xl:sticky xl:top-8">
              <div id="messages" className="villa-card p-5">
                <h2 className="section-title">{t({ en: "Customer Chat", zh: "顾客聊天" })}</h2>
                <div className="mt-4 grid max-h-[360px] gap-3 overflow-auto rounded-[18px] bg-villa-primary-bg p-3">
                  {messages.map((message) => (
                    <div key={message.id} className={`max-w-[86%] rounded-[18px] p-3 text-sm font-bold ${message.from === "host" ? "justify-self-end bg-villa-primary text-white" : "bg-white text-villa-text-primary"}`}>
                      {message.text}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input className="villa-input" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={t({ en: "Reply as host...", zh: "以寄宿主身份回复..." })} />
                  <button type="button" className="villa-button px-5" onClick={sendHostReply}>{t({ en: "Send", zh: "发送" })}</button>
                </div>
              </div>

              <div id="orders" className="villa-card p-5">
                <h2 className="section-title">{t({ en: "Recent Orders", zh: "最近订单" })}</h2>
                <div className="mt-4 grid gap-3">
                  {orders.slice(0, 5).map((order) => (
                    <article key={order.orderId} className="rounded-[18px] border border-villa-primary-light bg-white p-3 text-sm">
                      <strong className="block text-villa-text-primary">{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</strong>
                      <span className="text-xs font-bold text-villa-text-secondary">{order.serviceLabel} · {order.dateLabel}</span>
                      <div className="mt-2 flex justify-between text-xs font-black">
                        <span>{order.status}</span>
                        <span>RM{order.total}</span>
                      </div>
                    </article>
                  ))}
                  {orders.length === 0 ? <p className="body-copy">{t({ en: "No orders yet.", zh: "还没有订单。" })}</p> : null}
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
