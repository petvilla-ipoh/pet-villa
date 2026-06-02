"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppNav } from "../components/AppNav";
import { useLanguage } from "../components/LanguageProvider";
import {
  availableSlotsForDate,
  buildCapacityMap,
  formatDateRange,
  getOrderDateRange,
  MAX_DOGS_PER_DAY,
  toDateKey
} from "../lib/bookingCapacity";
import { deleteGuestPhoto, readGuestPhotos, saveGuestPhoto, updateGuestPhoto, type GuestPhoto } from "../lib/gallery";
import { readHostOffDays, writeHostOffDays } from "../lib/hostAvailability";
import { readChatThreads, readMessages, sendMessage, type ChatThread, type VillaMessage } from "../lib/messages";
import { type VillaOrder } from "../lib/orderFlow";
import { type PetProfile } from "../lib/petProfiles";
import { deleteReview, hideReview, readPublicReviews, saveHostReview, showReview, type PublicReview } from "../lib/reviews";

const hostPhotoPlaceholder = "/hero-dogs.png";

type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  dogs: PetProfile[];
  orders: VillaOrder[];
  lastStay: string;
  totalSpend: number;
};

type DogRecord = PetProfile & {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
};

type CapacityStatus = "available" | "partial" | "full" | "off";

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days: Date[] = [];
  for (let date = first; date.getMonth() === first.getMonth(); date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) {
    days.push(date);
  }
  return days;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readAllOrders(): VillaOrder[] {
  if (typeof window === "undefined") return [];
  const orders: VillaOrder[] = [];
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-orders:"))
    .forEach((key) => orders.push(...readJson<VillaOrder[]>(key, [])));
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function readAllPets(): DogRecord[] {
  if (typeof window === "undefined") return [];
  const currentUser = readJson<{ user?: { id?: string; name?: string; fullName?: string; phone?: string; email?: string } }>("pet-villa-session", {});
  const registered = readJson<{ id?: string; name?: string; fullName?: string; phone?: string; email?: string }>("pet-villa-registered-user", {});
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-pets:"))
    .flatMap((key) => {
      const ownerId = key.replace("pet-villa-pets:", "");
      const owner =
        ownerId === currentUser.user?.id
          ? currentUser.user
          : ownerId === registered.id
            ? registered
            : undefined;
      const ownerName = owner?.fullName || owner?.name || (ownerId === "guest" ? "Guest Owner" : "Pet Owner");
      const ownerPhone = owner?.phone || "";
      const ownerEmail = owner?.email || "";
      return readJson<PetProfile[]>(key, []).map((pet) => ({ ...pet, ownerId, ownerName, ownerPhone, ownerEmail }));
    });
}

function money(value: number) {
  return `RM${Math.round(value || 0)}`;
}

function shortDate(date?: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderRangeLabel(order: VillaOrder) {
  const range = getOrderDateRange(order);
  return range ? formatDateRange(range.start, range.end) : order.dateLabel;
}

function bookingStatus(order: VillaOrder) {
  const map: Record<VillaOrder["status"], string> = {
    balance: "Pending",
    active: "Checked In",
    confirmed: "Confirmed",
    staying: "Checked In",
    awaiting_checkout: "Checked Out",
    ready_pickup: "Checked Out",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  return map[order.status] || "Pending";
}

function paymentStatus(order: VillaOrder) {
  if (order.status === "cancelled") return order.paid > 0 ? "Refunded" : "Unpaid";
  if ((order.balance || 0) <= 0 && (order.paid || 0) >= (order.total || 0)) return "Full Payment";
  if ((order.paid || 0) > 0) return "Half Payment";
  return "Unpaid";
}

function capacityStatus(slots: number, off: boolean): CapacityStatus {
  if (off) return "off";
  if (slots <= 0) return "full";
  if (slots < MAX_DOGS_PER_DAY) return "partial";
  return "available";
}

function statusPill(status: string) {
  if (["Full Payment", "Confirmed", "Available", "Live"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["Half Payment", "Partially Booked", "Pending"].includes(status)) return "bg-amber-50 text-amber-700";
  if (["Full", "Cancelled", "Refunded", "Hidden"].includes(status)) return "bg-red-50 text-red-600";
  if (["Off Day", "Checked In", "Checked Out"].includes(status)) return "bg-villa-text-primary text-white";
  return "bg-villa-primary-bg text-villa-primary";
}

function ordersForDate(orders: VillaOrder[], date: Date) {
  const key = toDateKey(date);
  return orders.filter((order) => {
    const range = getOrderDateRange(order);
    if (!range) return false;
    return key >= toDateKey(range.start) && key <= toDateKey(range.end);
  });
}

export default function HostPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [dogs, setDogs] = useState<DogRecord[]>([]);
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<VillaMessage[]>([]);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(todayLocal());
  const [managedDay, setManagedDay] = useState<Date | null>(null);
  const [reply, setReply] = useState("");
  const [photoForm, setPhotoForm] = useState({ petName: "", breed: "", caption: "", imageUrl: "" });
  const [reviewForm, setReviewForm] = useState({ name: "", dogName: "", breed: "", rating: 5, en: "", zh: "", date: new Date().toISOString().slice(0, 10), photo: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => {
      const nextThreads = readChatThreads();
      const nextSelected = selectedThreadId || nextThreads[0]?.id || "";
      setOrders(readAllOrders());
      setDogs(readAllPets());
      setPhotos(readGuestPhotos());
      setReviews(readPublicReviews({ includeHidden: true }));
      setThreads(nextThreads);
      setSelectedThreadId(nextSelected);
      setMessages(nextSelected ? readMessages(nextSelected) : []);
      setOffDays(readHostOffDays());
    };
    sync();
    window.addEventListener("pet-villa-orders", sync);
    window.addEventListener("pet-villa-pets", sync);
    window.addEventListener("pet-villa-gallery", sync);
    window.addEventListener("pet-villa-reviews", sync);
    window.addEventListener("pet-villa-messages", sync);
    window.addEventListener("pet-villa-availability", sync);
    return () => {
      window.removeEventListener("pet-villa-orders", sync);
      window.removeEventListener("pet-villa-pets", sync);
      window.removeEventListener("pet-villa-gallery", sync);
      window.removeEventListener("pet-villa-reviews", sync);
      window.removeEventListener("pet-villa-messages", sync);
      window.removeEventListener("pet-villa-availability", sync);
    };
  }, [selectedThreadId]);

  useEffect(() => {
    setMessages(selectedThreadId ? readMessages(selectedThreadId) : []);
  }, [selectedThreadId]);

  const capacityMap = useMemo(() => buildCapacityMap(orders), [orders]);
  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth]);
  const todayKey = toDateKey(todayLocal());
  const activeOrders = orders.filter((order) => !["cancelled", "completed"].includes(order.status));
  const todayCheckIns = orders.filter((order) => order.startDateISO === todayKey);
  const todayCheckOuts = orders.filter((order) => order.endDateISO === todayKey);
  const balanceDue = orders.reduce((sum, order) => sum + Math.max(0, order.balance || 0), 0);
  const monthRevenue = orders
    .filter((order) => new Date(order.createdAt).getMonth() === visibleMonth.getMonth() && new Date(order.createdAt).getFullYear() === visibleMonth.getFullYear())
    .reduce((sum, order) => sum + Math.max(0, order.paid || 0), 0);
  const allDogNames = new Set([...dogs.map((dog) => dog.id || dog.name), ...orders.flatMap((order) => order.pets.map((pet) => pet.id || pet.name))]);
  const unreadThreads = threads.filter((thread) => thread.messages.at(-1)?.from === "owner");
  const customers = useMemo<CustomerRecord[]>(() => {
    const records = new Map<string, CustomerRecord>();
    dogs.forEach((dog) => {
      records.set(dog.ownerId, {
        id: dog.ownerId,
        name: dog.ownerName,
        phone: dog.ownerPhone,
        email: dog.ownerEmail,
        dogs: [...(records.get(dog.ownerId)?.dogs || []), dog],
        orders: records.get(dog.ownerId)?.orders || [],
        lastStay: records.get(dog.ownerId)?.lastStay || "-",
        totalSpend: records.get(dog.ownerId)?.totalSpend || 0
      });
    });
    orders.forEach((order) => {
      const ownerId = order.orderId.split("-")[0] || "customer";
      const existing = records.get(ownerId);
      const range = getOrderDateRange(order);
      records.set(ownerId, {
        id: ownerId,
        name: existing?.name || "Pet Owner",
        phone: existing?.phone || "",
        email: existing?.email || "",
        dogs: existing?.dogs || [],
        orders: [...(existing?.orders || []), order],
        lastStay: range ? shortDate(range.end) : existing?.lastStay || "-",
        totalSpend: (existing?.totalSpend || 0) + (order.paid || 0)
      });
    });
    return Array.from(records.values());
  }, [dogs, orders]);

  const statusOverview = [
    ["Pending", orders.filter((order) => bookingStatus(order) === "Pending").length],
    ["Confirmed", orders.filter((order) => bookingStatus(order) === "Confirmed").length],
    ["Checked In", orders.filter((order) => bookingStatus(order) === "Checked In").length],
    ["Checked Out", orders.filter((order) => bookingStatus(order) === "Checked Out").length],
    ["Completed", orders.filter((order) => bookingStatus(order) === "Completed").length],
    ["Cancelled", orders.filter((order) => bookingStatus(order) === "Cancelled").length]
  ];

  function setOffDay(date: Date, shouldBlock: boolean) {
    const key = toDateKey(date);
    const next = shouldBlock ? Array.from(new Set([...offDays, key])) : offDays.filter((day) => day !== key);
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

  function handleReviewPhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReviewForm((current) => ({ ...current, photo: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  function publishPhoto() {
    if (!photoForm.petName.trim()) {
      setNotice(t({ en: "Please add a pet name before publishing.", zh: "发布前请填写宠物名字。" }));
      return;
    }
    saveGuestPhoto({
      petName: photoForm.petName.trim(),
      breed: photoForm.breed.trim() || "Small dog",
      caption: photoForm.caption.trim() || "Happy guest at Pet Villa.",
      imageUrl: photoForm.imageUrl || hostPhotoPlaceholder,
      visibleOnHome: true,
      color: "#f0b46e"
    });
    setPhotoForm({ petName: "", breed: "", caption: "", imageUrl: "" });
    setNotice(t({ en: "Happy Guest photo published to Home.", zh: "Happy Guests 照片已发布到首页。" }));
  }

  function publishReview() {
    if (!reviewForm.name.trim() || !reviewForm.en.trim()) {
      setNotice(t({ en: "Please add reviewer name and review text.", zh: "请填写顾客名字和评价内容。" }));
      return;
    }
    saveHostReview({
      name: reviewForm.name.trim(),
      pet: [reviewForm.dogName, reviewForm.breed].filter(Boolean).join(" · ") || "Small dog",
      dogName: reviewForm.dogName.trim() || "Pet",
      breed: reviewForm.breed.trim() || "Small dog",
      date: reviewForm.date,
      rating: reviewForm.rating,
      photo: reviewForm.photo,
      quote: { en: reviewForm.en.trim(), zh: reviewForm.zh.trim() || reviewForm.en.trim() }
    });
    setReviewForm({ name: "", dogName: "", breed: "", rating: 5, en: "", zh: "", date: new Date().toISOString().slice(0, 10), photo: "" });
    setReviews(readPublicReviews({ includeHidden: true }));
    setNotice(t({ en: "Review published to Home.", zh: "评价已发布到首页。" }));
  }

  function toggleReviewVisibility(review: PublicReview) {
    review.hidden ? showReview(review.id) : hideReview(review.id);
    setReviews(readPublicReviews({ includeHidden: true }));
    setNotice(review.hidden ? t({ en: "Review is visible on Home again.", zh: "评价已重新显示在首页。" }) : t({ en: "Review hidden from Home.", zh: "评价已从首页隐藏。" }));
  }

  function removeReview(review: PublicReview) {
    deleteReview(review);
    setReviews(readPublicReviews({ includeHidden: true }));
    setNotice(t({ en: "Review deleted.", zh: "评价已删除。" }));
  }

  function sendHostReply() {
    if (!reply.trim() || !selectedThreadId) return;
    sendMessage("host", reply, selectedThreadId);
    setReply("");
    setMessages(readMessages(selectedThreadId));
    setThreads(readChatThreads());
  }

  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const managedOrders = managedDay ? ordersForDate(orders, managedDay) : [];
  const managedSlots = managedDay ? availableSlotsForDate(managedDay, capacityMap) : MAX_DOGS_PER_DAY;
  const managedKey = managedDay ? toDateKey(managedDay) : "";
  const managedOff = managedDay ? offDays.includes(managedKey) : false;

  return (
    <div className="min-h-screen bg-[#3d1f0d] text-[#f5c4b3]">
      <AppNav host />
      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="bg-[#2a1508] p-4 lg:min-h-[calc(100vh-81px)] lg:sticky lg:top-0">
          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {[
              ["dashboard", "Dashboard", "仪表盘"],
              ["customers", "Customers", "顾客"],
              ["dogs", "Dogs", "狗狗"],
              ["booking-center", "Booking Center", "预约中心"],
              ["calendar-capacity", "Calendar Capacity", "档期名额"],
              ["messages", "Messages", "消息"],
              ["payments", "Payments", "付款"],
              ["reviews", "Reviews", "评价"],
              ["gallery", "Gallery", "相册"],
              ["promotions", "Promotions", "优惠"],
              ["reports", "Reports", "报表"],
              ["settings", "Settings", "设置"]
            ].map(([id, en, zh], index) => (
              <a key={id} href={`#${id}`} className={`flex items-center justify-between rounded-[16px] px-4 py-3 text-sm font-bold ${index === 0 ? "bg-[rgba(232,146,124,0.24)] text-[#f5c4b3]" : "text-[rgba(245,196,179,0.82)] hover:bg-white/5"}`}>
                <span>{t({ en, zh })}</span>
                {id === "messages" && unreadThreads.length ? <span className="rounded-full bg-villa-primary px-2 py-0.5 text-[10px] text-white">{unreadThreads.length}</span> : null}
              </a>
            ))}
          </nav>
          <div className="mt-6 hidden rounded-[18px] border border-white/10 bg-white/5 p-4 text-sm font-bold text-[#f5c4b3] lg:block">
            <p className="text-xs uppercase opacity-75">Business Info</p>
            <p className="mt-3">Pet Villa</p>
            <p className="mt-2 opacity-80">+60 16-523 6409</p>
            <p className="opacity-80">Ipoh, Perak</p>
            <a href="/" className="mt-4 inline-flex rounded-full border border-[#f5c4b3]/40 px-4 py-2 text-xs">View Website</a>
          </div>
        </aside>

        <main className="host-paw-bg p-4 text-villa-text-primary lg:p-8">
          <header id="dashboard" className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">HOST PANEL</span>
              <h1 className="page-title mt-4">{t({ en: "Welcome back, Pet Villa!", zh: "欢迎回来，Pet Villa！" })}</h1>
              <p className="body-copy mt-1">{t({ en: "Here is what is happening with your pet boarding business today.", zh: "这里是今天寄宿业务的重点情况。" })}</p>
            </div>
            <button type="button" className="villa-button-outline bg-white" onClick={() => setVisibleMonth(todayLocal())}>{todayLocal().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</button>
          </header>

          {notice ? <p className="mt-4 rounded-[16px] bg-villa-primary-bg p-3 text-sm font-black text-villa-primary">{notice}</p> : null}

          <section className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            {[
              ["Registered Owners", "注册宠主", customers.length, "Total owners"],
              ["Total Dogs", "狗狗总数", allDogNames.size, "All dogs"],
              ["Active Bookings", "进行中预约", activeOrders.length, "Currently active"],
              ["Today Check-in", "今日入住", todayCheckIns.length, "Scheduled today"],
              ["Today Check-out", "今日离店", todayCheckOuts.length, "Scheduled today"],
              ["Pending Balance", "待收尾款", money(balanceDue), "Unpaid amount"],
              ["This Month Revenue", "本月收入", money(monthRevenue), monthLabel]
            ].map(([en, zh, value, sub]) => (
              <article key={en} className="villa-card flex min-h-[128px] flex-col justify-between p-4">
                <p className="m-0 text-xs font-black text-villa-text-secondary">{t({ en: String(en), zh: String(zh) })}</p>
                <strong className="text-2xl font-black text-villa-text-primary">{value}</strong>
                <span className="text-[11px] font-bold text-villa-text-muted">{sub}</span>
              </article>
            ))}
          </section>

          <section className="mt-5 villa-card p-4">
            <h2 className="card-title">Quick Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              {[
                ["/booking", "Add Booking"],
                ["#customers", "Add Customer"],
                ["#dogs", "Add Dog"],
                ["#messages", "Open Messages"],
                ["#calendar-capacity", "Block Off Day"],
                ["#gallery", "Publish Gallery"],
                ["#reviews", "Add Review"],
                ["#reports", "View Reports"]
              ].map(([href, label]) => (
                <a key={label} href={href} className="rounded-[16px] bg-villa-primary-bg p-4 text-center text-xs font-black text-villa-text-primary transition hover:-translate-y-0.5 hover:shadow-md">{label}</a>
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <article id="payments" className="villa-card p-5">
                  <h2 className="card-title">Sales Overview</h2>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["Completed Sales", money(orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + order.paid, 0)), "bg-emerald-500"],
                      ["Remaining Balance", money(balanceDue), "bg-blue-400"],
                      ["Pending Collection", money(orders.filter((order) => paymentStatus(order) === "Half Payment").reduce((sum, order) => sum + order.balance, 0)), "bg-amber-400"],
                      ["Cancelled Amount", money(orders.filter((order) => order.status === "cancelled").reduce((sum, order) => sum + order.total, 0)), "bg-red-400"]
                    ].map(([label, value, dot]) => (
                      <div key={label} className="flex items-center justify-between rounded-[14px] bg-villa-primary-bg px-3 py-2 text-sm font-bold">
                        <span className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="villa-card p-5">
                  <h2 className="card-title">Booking Status Overview</h2>
                  <div className="mt-4 grid gap-2">
                    {statusOverview.map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between rounded-[14px] border border-villa-primary-light bg-white px-3 py-2 text-sm font-bold">
                        <span>{label}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(String(label))}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <section id="customers" className="villa-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">Customers CRM</h2>
                    <p className="body-copy mt-1">Owner profile, dogs, order count, last stay, and total spend.</p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase text-villa-text-secondary">
                      <tr className="border-b border-villa-primary-light">
                        <th className="py-3">Customer</th><th>Phone</th><th>Email</th><th>Dogs</th><th>Orders</th><th>Last Stay</th><th>Total Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => (
                        <tr key={customer.id} className="border-b border-villa-primary-light/60 font-bold">
                          <td className="py-3"><a href={`#customer-${customer.id}`} className="text-villa-primary">{customer.name}</a></td>
                          <td>{customer.phone || "-"}</td>
                          <td>{customer.email || "-"}</td>
                          <td>{customer.dogs.map((dog) => dog.name).join(", ") || "-"}</td>
                          <td>{customer.orders.length}</td>
                          <td>{customer.lastStay}</td>
                          <td>{money(customer.totalSpend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {customers.length === 0 ? <p className="body-copy mt-4">No customer records yet.</p> : null}
                </div>
              </section>

              <section id="dogs" className="villa-card p-5">
                <h2 className="section-title">Dogs Profile</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {dogs.map((dog) => (
                    <article key={`${dog.ownerId}-${dog.id}`} className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                      <div className="flex gap-3">
                        <img src={dog.photoDataUrl || "/avatar-poodle.png"} alt={dog.name} className="h-16 w-16 rounded-[16px] object-cover" />
                        <div>
                          <h3 className="card-title">{dog.name || "Unnamed dog"}</h3>
                          <p className="text-xs font-bold text-villa-text-secondary">{dog.breed || "-"} · {dog.weight || "-"}kg · {dog.age || "-"}</p>
                          <p className="mt-1 text-xs font-bold text-villa-text-muted">Owner: {dog.ownerName}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold">
                        <span className={dog.vaccinated ? "text-emerald-700" : "text-red-500"}>{dog.vaccinated ? "Vaccinated" : "Not vaccinated"}</span>
                        <span>{dog.allergies || "No allergies"}</span>
                        <span>{dog.medication || "No medication"}</span>
                        <span>{dog.specialNotes || "No notes"}</span>
                      </div>
                    </article>
                  ))}
                  {dogs.length === 0 ? <p className="body-copy">No dog profiles yet.</p> : null}
                </div>
              </section>

              <section id="booking-center" className="villa-card p-5">
                <h2 className="section-title">Booking Center</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="text-xs uppercase text-villa-text-secondary">
                      <tr className="border-b border-villa-primary-light">
                        <th className="py-3">Booking ID</th><th>Owner</th><th>Dog(s)</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Payment</th><th>Paid</th><th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const range = getOrderDateRange(order);
                        return (
                          <tr key={order.orderId} className="border-b border-villa-primary-light/60 font-bold">
                            <td className="py-3">{order.orderId}</td>
                            <td>Pet Owner</td>
                            <td>{order.pets.map((pet) => pet.name).join(", ") || "Pet"} ({order.pets.length})</td>
                            <td>{shortDate(range?.start)}</td>
                            <td>{shortDate(range?.end)}</td>
                            <td><span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(bookingStatus(order))}`}>{bookingStatus(order)}</span></td>
                            <td><span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(paymentStatus(order))}`}>{paymentStatus(order)}</span></td>
                            <td>{money(order.paid)}</td>
                            <td>{money(order.balance)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {orders.length === 0 ? <p className="body-copy mt-4">No bookings yet.</p> : null}
                </div>
              </section>

              <section id="calendar-capacity" className="villa-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">Calendar Capacity</h2>
                    <p className="body-copy mt-1">Off Day and Full are synced with the customer booking calendar.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>‹</button>
                    <strong className="min-w-[150px] text-center text-sm font-black">{monthLabel}</strong>
                    <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>›</button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                  {[
                    ["Available", "bg-white"],
                    ["Partially Booked", "bg-amber-50"],
                    ["Full", "bg-red-50"],
                    ["Off Day", "bg-villa-text-primary text-white"]
                  ].map(([label, cls]) => <span key={label} className={`rounded-full border border-villa-primary-light px-3 py-1 ${cls}`}>{label}</span>)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {days.map((date) => {
                    const key = toDateKey(date);
                    const slots = availableSlotsForDate(date, capacityMap);
                    const status = capacityStatus(slots, offDays.includes(key));
                    const label = status === "off" ? "Off Day" : status === "full" ? "Full" : status === "partial" ? `${slots}/${MAX_DOGS_PER_DAY} left` : `${MAX_DOGS_PER_DAY}/${MAX_DOGS_PER_DAY} slots`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setManagedDay(date)}
                        className={`rounded-[18px] border p-3 text-left text-xs font-black transition hover:-translate-y-px ${
                          status === "off" ? "border-villa-text-primary bg-villa-text-primary text-white" : status === "full" ? "border-red-200 bg-red-50 text-red-600" : status === "partial" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-villa-primary-light bg-white text-villa-text-primary"
                        }`}
                      >
                        <span className="block">{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <strong className="mt-2 block text-sm">{label}</strong>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section id="reviews" className="villa-card p-5">
                <h2 className="section-title">Reviews Management</h2>
                <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
                  <div className="grid gap-3">
                    <input className="villa-input" value={reviewForm.name} onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })} placeholder="Owner name" />
                    <input className="villa-input" value={reviewForm.dogName} onChange={(event) => setReviewForm({ ...reviewForm, dogName: event.target.value })} placeholder="Dog name" />
                    <input className="villa-input" value={reviewForm.breed} onChange={(event) => setReviewForm({ ...reviewForm, breed: event.target.value })} placeholder="Breed" />
                    <input className="villa-input" type="date" value={reviewForm.date} onChange={(event) => setReviewForm({ ...reviewForm, date: event.target.value })} />
                    <label className="grid cursor-pointer place-items-center rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-4 py-3 text-sm font-black text-villa-primary">
                      {reviewForm.photo ? "Change review photo" : "Optional photo"}
                      <input type="file" accept="image/*" className="sr-only" onChange={handleReviewPhotoFile} />
                    </label>
                    <select className="villa-input" value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}>
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <textarea className="villa-input h-24 py-3" value={reviewForm.en} onChange={(event) => setReviewForm({ ...reviewForm, en: event.target.value })} placeholder="English review" />
                    <textarea className="villa-input h-24 py-3" value={reviewForm.zh} onChange={(event) => setReviewForm({ ...reviewForm, zh: event.target.value })} placeholder="Chinese review (optional)" />
                    <button type="button" className="villa-button" onClick={publishReview}>Publish Review</button>
                  </div>
                  <div className="grid max-h-[610px] content-start gap-3 overflow-auto pr-1">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                        <div className="flex items-start gap-3">
                          {review.photo ? <img src={review.photo} alt={review.dogName || review.pet} className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-villa-primary-bg text-villa-primary">★</div>}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-[#f5a623]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                            <p className="mt-2 text-sm font-bold text-villa-text-primary">{review.quote.en}</p>
                            <p className="mt-2 text-xs font-black text-villa-text-secondary">{review.name} · {review.dogName || review.pet}{review.breed ? ` · ${review.breed}` : ""} · {review.date}</p>
                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(review.hidden ? "Hidden" : "Live")}`}>{review.hidden ? "Hidden" : "Live"}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => toggleReviewVisibility(review)}>{review.hidden ? "Show" : "Hide"}</button>
                          <button type="button" className="rounded-pill border border-red-200 px-3 py-1 text-xs font-black text-red-500" onClick={() => removeReview(review)}>Delete</button>
                        </div>
                      </article>
                    ))}
                    {reviews.length === 0 ? <p className="body-copy">No reviews yet.</p> : null}
                  </div>
                </div>
              </section>

              <section id="gallery" className="villa-card p-5">
                <h2 className="section-title">Happy Guests Gallery</h2>
                <p className="body-copy mt-1">Only Published photos appear on Home. Customers cannot upload here.</p>
                <div className="mt-4 grid gap-4 xl:grid-cols-[260px_1fr]">
                  <div className="grid gap-3">
                    <label className="grid h-40 cursor-pointer place-items-center overflow-hidden rounded-[18px] border-2 border-dashed border-villa-primary-light bg-villa-primary-bg text-center text-sm font-black text-villa-primary">
                      {photoForm.imageUrl ? <img src={photoForm.imageUrl} alt="" className="h-full w-full object-cover" /> : "Upload photo"}
                      <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoFile} />
                    </label>
                    <input className="villa-input" value={photoForm.petName} onChange={(event) => setPhotoForm({ ...photoForm, petName: event.target.value })} placeholder="Pet name" />
                    <input className="villa-input" value={photoForm.breed} onChange={(event) => setPhotoForm({ ...photoForm, breed: event.target.value })} placeholder="Breed" />
                    <input className="villa-input" value={photoForm.caption} onChange={(event) => setPhotoForm({ ...photoForm, caption: event.target.value })} placeholder="Caption" />
                    <button type="button" className="villa-button" onClick={publishPhoto}>Publish to Home</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.slice(0, 9).map((photo) => (
                      <article key={photo.id} className="overflow-hidden rounded-[18px] border border-villa-primary-light bg-white">
                        <img src={photo.imageUrl || hostPhotoPlaceholder} alt={photo.petName} className="h-28 w-full object-cover" />
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="block text-sm">{photo.petName}</strong>
                              <span className="text-xs font-bold text-villa-text-secondary">{photo.breed}</span>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusPill(photo.visibleOnHome ? "Live" : "Hidden")}`}>{photo.visibleOnHome ? "Published" : "Hidden"}</span>
                          </div>
                          {!photo.id.startsWith("guest-") ? (
                            <div className="mt-3 flex gap-2">
                              <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => updateGuestPhoto(photo.id, { visibleOnHome: !photo.visibleOnHome })}>{photo.visibleOnHome ? "Hide" : "Publish"}</button>
                              <button type="button" className="rounded-pill border border-red-200 px-3 py-1 text-xs font-black text-red-500" onClick={() => deleteGuestPhoto(photo.id)}>Delete</button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <aside className="grid h-fit gap-5 xl:sticky xl:top-8">
              <section className="villa-card p-5">
                <h2 className="card-title">Calendar Mini View</h2>
                <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-black">
                  {days.slice(0, 30).map((date) => {
                    const slots = availableSlotsForDate(date, capacityMap);
                    const off = offDays.includes(toDateKey(date));
                    return <button key={toDateKey(date)} type="button" onClick={() => setManagedDay(date)} className={`rounded-lg py-2 ${off ? "bg-villa-text-primary text-white" : slots <= 0 ? "bg-red-100 text-red-600" : slots < MAX_DOGS_PER_DAY ? "bg-amber-100 text-amber-700" : "bg-white"}`}>{date.getDate()}</button>;
                  })}
                </div>
              </section>

              <section id="messages" className="villa-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="card-title">Messages Inbox</h2>
                  {unreadThreads.length ? <span className="rounded-full bg-villa-primary px-2 py-1 text-xs font-black text-white">{unreadThreads.length} unread</span> : null}
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="grid max-h-[190px] content-start gap-2 overflow-auto">
                    {threads.map((thread) => (
                      <button key={thread.id} type="button" className={`rounded-[14px] border p-3 text-left text-xs font-black ${thread.id === selectedThreadId ? "border-villa-primary bg-villa-primary-bg text-villa-primary" : "border-villa-primary-light bg-white text-villa-text-primary"}`} onClick={() => setSelectedThreadId(thread.id)}>
                        <span className="flex items-center justify-between"><span>{thread.userName}</span>{thread.messages.at(-1)?.from === "owner" ? <span className="rounded-full bg-villa-primary px-2 py-0.5 text-[10px] text-white">1</span> : null}</span>
                        <span className="mt-1 block truncate text-[11px] text-villa-text-muted">{thread.messages.at(-1)?.text || "No message yet"}</span>
                      </button>
                    ))}
                    {threads.length === 0 ? <p className="body-copy">No customer chats yet.</p> : null}
                  </div>
                  <div className="grid max-h-[260px] gap-3 overflow-auto rounded-[18px] bg-villa-primary-bg p-3">
                    {messages.map((message) => (
                      <div key={message.id} className={`max-w-[86%] rounded-[18px] p-3 text-sm font-bold ${message.from === "host" ? "justify-self-end bg-villa-primary text-white" : "bg-white text-villa-text-primary"}`}>{message.text}</div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className="villa-input" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply as host..." />
                    <button type="button" className="villa-button px-5" onClick={sendHostReply}>Send</button>
                  </div>
                </div>
              </section>

              <section className="villa-card p-5">
                <h2 className="card-title">Recent Bookings</h2>
                <div className="mt-4 grid gap-3">
                  {orders.slice(0, 4).map((order) => (
                    <article key={order.orderId} className="rounded-[18px] border border-villa-primary-light bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="block text-villa-text-primary">{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</strong>
                          <span className="text-xs font-bold text-villa-text-secondary">{order.serviceLabel} · {orderRangeLabel(order)}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(bookingStatus(order))}`}>{bookingStatus(order)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs font-black">
                        <span>{paymentStatus(order)}</span>
                        <span>{money(order.total)}</span>
                      </div>
                    </article>
                  ))}
                  {orders.length === 0 ? <p className="body-copy">No orders yet.</p> : null}
                </div>
              </section>

              <section className="villa-card p-5">
                <h2 className="card-title">Recent Reviews</h2>
                <div className="mt-4 grid gap-3">
                  {reviews.slice(0, 3).map((review) => (
                    <article key={review.id} className="rounded-[18px] border border-villa-primary-light bg-white p-3">
                      <div className="text-sm font-black text-[#f5a623]">{"★".repeat(review.rating)}</div>
                      <p className="mt-2 line-clamp-2 text-sm font-bold">{review.quote.en}</p>
                      <p className="mt-2 text-xs font-black text-villa-text-secondary">{review.name} · {review.dogName || review.pet}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section id="promotions" className="villa-card p-5">
                <h2 className="card-title">Promotions</h2>
                <p className="body-copy mt-2">Voucher claiming and referral rewards are managed by the current frontend voucher flow.</p>
                <a href="/vouchers" className="villa-button-outline mt-4 bg-white">Open My Vouchers</a>
              </section>

              <section id="reports" className="villa-card p-5">
                <h2 className="card-title">Reports</h2>
                <p className="body-copy mt-2">Monthly revenue, booking status, and capacity views are shown on this dashboard.</p>
              </section>

              <section id="settings" className="villa-card p-5">
                <h2 className="card-title">Settings</h2>
                <p className="body-copy mt-2">Use Calendar Capacity to control Off Days. Full days are calculated automatically from dog count.</p>
              </section>
            </aside>
          </section>
        </main>
      </div>

      {managedDay ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="villa-card max-h-[90vh] w-full max-w-xl overflow-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">Manage Day</h2>
                <p className="body-copy mt-1">{managedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setManagedDay(null)}>Close</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] bg-villa-primary-bg p-4">
                <p className="text-xs font-black text-villa-text-secondary">Used Slots</p>
                <strong className="text-2xl font-black">{MAX_DOGS_PER_DAY - managedSlots}/{MAX_DOGS_PER_DAY}</strong>
              </div>
              <div className="rounded-[16px] bg-villa-primary-bg p-4">
                <p className="text-xs font-black text-villa-text-secondary">Available</p>
                <strong className="text-2xl font-black">{managedOff ? 0 : managedSlots}</strong>
              </div>
              <div className="rounded-[16px] bg-villa-primary-bg p-4">
                <p className="text-xs font-black text-villa-text-secondary">Status</p>
                <strong className="text-lg font-black">{managedOff ? "Off Day" : managedSlots <= 0 ? "Full" : managedSlots < MAX_DOGS_PER_DAY ? "Partially Booked" : "Available"}</strong>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" className={managedOff ? "villa-button-outline flex-1 bg-white" : "villa-button flex-1"} onClick={() => setOffDay(managedDay, !managedOff)}>{managedOff ? "Release Off Day" : "Block Off Day"}</button>
            </div>
            <h3 className="card-title mt-5">Bookings on this day</h3>
            <div className="mt-3 grid gap-3">
              {managedOrders.map((order) => (
                <article key={order.orderId} className="rounded-[16px] border border-villa-primary-light bg-white p-3 text-sm font-bold">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</strong>
                      <p className="mt-1 text-xs text-villa-text-secondary">{order.serviceLabel} · {orderRangeLabel(order)} · {order.pets.length} dog(s)</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(bookingStatus(order))}`}>{bookingStatus(order)}</span>
                  </div>
                </article>
              ))}
              {managedOrders.length === 0 ? <p className="body-copy">No bookings on this day.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
