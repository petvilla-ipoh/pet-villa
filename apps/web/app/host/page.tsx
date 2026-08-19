"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatDateRange,
  getOrderDateRange,
  toDateKey
} from "../lib/bookingCapacity";
import { loadGuestPhotos, saveGuestPhoto, updateGuestPhoto, type GuestPhoto } from "../lib/gallery";
import { checkPrivateDiaryConfiguration, deletePetDiaryUpdate, loadPetDiaryUpdatesForHost, savePetDiaryUpdate, updatePetDiaryUpdate, type PetDiaryUpdate } from "../lib/diaryUpdates";
import { loadHostOffDays, setHostOffDay } from "../lib/hostAvailability";
import { loadHostCrmData } from "../lib/hostData";
import { addOrderChargeAsHost, createCustomerAccountAsHost, createHostBookingAsHost, createHostCustomerAsHost, deletePetAsHost, loadBusinessExpensesAsHost, prepareHostPaymentSubmissionAsHost, recordBusinessExpenseAsHost, rejectHostPaymentAsHost, savePetAsHost, updateCustomerAsHost, updateHostOrderAsHost, verifyHostPaymentAsHost, type BusinessExpense, type BusinessExpenseCategory } from "../lib/hostOperations";
import { loadChatThreads, loadMessages, readChatThreads, readMessages, sendMessage, type ChatThread, type VillaMessage } from "../lib/messages";
import { loadAllOrdersForHost, type VillaOrder } from "../lib/orderFlow";
import { dogAvatarOptions, dogAvatarSrc, readPetProfiles, writePetProfiles, type PetProfile } from "../lib/petProfiles";
import { deleteReview, hideReview, loadPublicReviews, saveHostReview, showReview, updateReview, type PublicReview } from "../lib/reviews";
import { DEFAULT_BUSINESS_SETTINGS, loadBusinessSettings, saveBusinessSettings, uploadBusinessPaymentQr, type BusinessSettings } from "../lib/businessSettings";
import { calculateServiceSubtotal } from "../lib/pricing";
import { HostAccessGate } from "../components/HostAccessGate";
import { HostSecurityPanel } from "./HostSecurityPanel";
import { HOST_MAGIC_LINK_NOTICE_KEY } from "../lib/hostAuthErrors";
import { clearAuthPersistence, getSupabaseBrowserClient } from "../lib/supabase";
import { HostLanguageRuntime } from "../lib/hostI18n";
import { WORKSPACE_MANAGE_PERMISSIONS, WORKSPACE_VIEW_PERMISSIONS, hasStaffPermission, type StaffPermission, type StaffRole } from "../lib/staffAccess";
import {
  calculateAccountingMetrics,
  calculateExpenseMetrics,
  calculatePeriodBusinessReport,
  collectedAmount,
  discountAmount,
  getOrderPaymentDisplayStatus,
  isPaymentRetained,
  originalOrderAmount,
  ordersCheckedInInDateRange,
  ordersCompletedInDateRange,
  ordersInRecordedDateRange,
  outstandingAmount,
  paidOrderCollections
} from "../lib/businessAccounting";
import {
  SAFE_VOID_ACKNOWLEDGEMENT,
  SAFE_VOID_CONFIRMATION,
  SAFE_VOID_REASON_CODES,
  SAFE_VOID_REASON_LABELS,
  isBusinessOrder,
  isVoidedOrder,
  validateSafeVoidRequest,
  type SafeVoidReasonCode
} from "../lib/safeVoid";

const hostPhotoPlaceholder = "/hero-dogs.webp";
const PRIMARY_OWNER_EMAIL = "canyonfsp@gmail.com";
const DIARY_ELIGIBLE_STATUSES: VillaOrder["status"][] = ["balance", "confirmed", "active", "staying", "awaiting_checkout", "ready_pickup", "completed"];
const allowHostDevelopmentFallback = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true";

function orderSelectionKey(order: VillaOrder) {
  return order.orderRowId || `${order.customerId || "unknown-owner"}:${order.orderId}`;
}

type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  registerDate: string;
  dogs: PetProfile[];
  orders: VillaOrder[];
  lastStay: string;
  totalSpend: number;
  phoneVerified: boolean;
  emailVerified: boolean;
  isTemporary: boolean;
  customerSource: "auth" | "host";
};

type RegisteredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  registeredAt?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  isTemporary?: boolean;
  customerSource?: "auth" | "host";
};

type DogRecord = PetProfile & {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  customerSource?: "auth" | "host";
  medicalRecordName?: string;
  medicalRecordDataUrl?: string;
};

type HostWorkspace =
  | "dashboard"
  | "bookings"
  | "calendar"
  | "customers"
  | "payments"
  | "diary"
  | "messages"
  | "vouchers"
  | "reviews"
  | "notifications"
  | "settings";

type HostIconName =
  | "home"
  | "booking"
  | "calendar"
  | "customers"
  | "payments"
  | "diary"
  | "messages"
  | "vouchers"
  | "reviews"
  | "notifications"
  | "settings"
  | "staff"
  | "search"
  | "menu";

type HostLanguage = "en" | "zh";
type HostCopy = { en: string; zh: string };

const HOST_NAV_GROUPS: Array<{
  label: HostCopy;
  items: Array<{ id: HostWorkspace | "staff"; label: HostCopy; icon: HostIconName; href?: string }>;
}> = [
  {
    label: { en: "Operations", zh: "营业管理" },
    items: [
      { id: "dashboard", label: { en: "Dashboard", zh: "营业总览" }, icon: "home" },
      { id: "bookings", label: { en: "Booking Center", zh: "预约中心" }, icon: "booking" },
      { id: "calendar", label: { en: "Calendar", zh: "日历" }, icon: "calendar" }
    ]
  },
  {
    label: { en: "Customers", zh: "顾客" },
    items: [
      { id: "customers", label: { en: "CRM & Pets", zh: "顾客与宠物" }, icon: "customers" },
      { id: "messages", label: { en: "Inbox", zh: "消息" }, icon: "messages" },
      { id: "diary", label: { en: "Pet Diary", zh: "宠物日记" }, icon: "diary" }
    ]
  },
  {
    label: { en: "Finance & Growth", zh: "财务与营运" },
    items: [
      { id: "payments", label: { en: "Payments", zh: "付款" }, icon: "payments" },
      { id: "vouchers", label: { en: "Pricing", zh: "价格" }, icon: "vouchers" },
      { id: "reviews", label: { en: "Reviews", zh: "评价" }, icon: "reviews" }
    ]
  },
  {
    label: { en: "System", zh: "系统" },
    items: [
      { id: "notifications", label: { en: "Notifications", zh: "通知" }, icon: "notifications" },
      { id: "settings", label: { en: "Settings", zh: "设置" }, icon: "settings" },
      { id: "staff", label: { en: "Staff & Access", zh: "员工与权限" }, icon: "staff", href: "/host/staff" }
    ]
  }
];

const HOST_WORKSPACE_TITLES: Record<HostWorkspace, { title: HostCopy; description: HostCopy }> = {
  dashboard: { title: { en: "Good morning, Pet Villa", zh: "早安，Pet Villa" }, description: { en: "Your daily operations, payments, and guests at a glance.", zh: "一目了然掌握每日营业、付款与寄宿宠物。" } },
  bookings: { title: { en: "Booking Center", zh: "预约中心" }, description: { en: "Find, create, approve, update, and complete every stay.", zh: "查找、建立、批准、更新并完成每一笔寄宿。" } },
  calendar: { title: { en: "Calendar", zh: "日历" }, description: { en: "See confirmed pets by day and close dates when you are full.", zh: "查看每日已确认宠物，并在客满时关闭日期。" } },
  customers: { title: { en: "Customers & Pets", zh: "顾客与宠物" }, description: { en: "One searchable CRM for owner and pet information.", zh: "集中搜索和管理顾客及宠物资料。" } },
  payments: { title: { en: "Payments", zh: "付款" }, description: { en: "Track revenue, paid amounts, and outstanding balances.", zh: "追踪营业额、已付款与未结余额。" } },
  diary: { title: { en: "Pet Diary", zh: "宠物日记" }, description: { en: "Publish stay photos and updates to the right customer.", zh: "把寄宿照片和照顾动态发布给正确顾客。" } },
  messages: { title: { en: "Inbox", zh: "消息" }, description: { en: "Reply to website chats and continue customer conversations.", zh: "回复网页消息并继续顾客对话。" } },
  vouchers: { title: { en: "Pricing", zh: "价格" }, description: { en: "Manage normal and special-date rates shared by Customer and Host booking.", zh: "管理顾客与 Host 预约共用的普通和特别日期价格。" } },
  reviews: { title: { en: "Reviews", zh: "评价" }, description: { en: "Publish, hide, edit, or remove customer reviews.", zh: "发布、隐藏、编辑或删除顾客评价。" } },
  notifications: { title: { en: "Notifications", zh: "通知" }, description: { en: "Prepare customer messages and monitor delivery setup.", zh: "准备顾客通知并查看发送渠道设置。" } },
  settings: { title: { en: "Business Settings", zh: "营业设置" }, description: { en: "Manage operational contact and integration settings.", zh: "管理营业联系方式与系统设置。" } }
};

function HostIcon({ name }: { name: HostIconName }) {
  const paths: Record<HostIconName, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-6h5v6" /></>,
    booking: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M14 14h2" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 15c3.8-.4 5.8 1.3 6.5 4.5" /></>,
    payments: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M7 15h4" /></>,
    diary: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 3v18M12 8h4M12 12h4M12 16h3" /></>,
    messages: <><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9h8M8 12h5" /></>,
    vouchers: <><path d="M4 7.5A2.5 2.5 0 0 0 6.5 5h11A2.5 2.5 0 0 0 20 7.5v9a2.5 2.5 0 0 0-2.5 2.5h-11A2.5 2.5 0 0 0 4 16.5v-9Z" /><path d="M12 7v10" /></>,
    reviews: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
    notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    staff: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" /><path d="M17 8v6M14 11h6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function PetAvatarPicker({ value, onChange }: { value?: string; onChange: (avatar: string) => void }) {
  return (
    <div className="host-pet-avatar-picker">
      <span>Choose Pet Villa avatar</span>
      <div>
        {dogAvatarOptions.map((option) => {
          const avatar = dogAvatarSrc(option.id);
          const selected = dogAvatarSrc(value) === avatar;
          return (
            <button key={option.id} type="button" data-selected={selected || undefined} onClick={() => onChange(avatar)} title={option.en}>
              <img src={avatar} alt={option.en} />
              <small>{option.en}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type HostBookingForm = {
  requestId: string;
  mode: "existing" | "new";
  customerId: string;
  customerSource: "auth" | "host";
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  dogId: string;
  dogIds: string[];
  dogName: string;
  dogBreed: string;
  dogAvatar: string;
  service: "overnight" | "daycare";
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  discount: string;
  paid: string;
};

type HostOrderEditForm = {
  service: "overnight" | "daycare";
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  petIds: string[];
  specialRequest: string;
  manualDiscount: string;
};

type OrderChargeForm = {
  requestId: string;
  amount: string;
  reasonCode: "late_checkout";
  note: string;
};

type ExpenseForm = {
  requestId: string;
  expenseDate: string;
  amount: string;
  category: BusinessExpenseCategory;
  note: string;
};

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

function readRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return [];
  const list = readJson<RegisteredUser[]>("pet-villa-registered-users", []);
  const single = readJson<RegisteredUser | null>("pet-villa-registered-user", null);
  const current = readJson<{ user?: RegisteredUser }>("pet-villa-session", {});
  const records = new Map<string, RegisteredUser>();
  [...list, ...(single ? [single] : []), ...(current.user ? [current.user] : [])].forEach((user) => {
    const id = user.id || user.email || user.phone;
    if (!id) return;
    records.set(id, { ...records.get(id), ...user, id });
  });
  return Array.from(records.values());
}

function readAllPets(registeredUsers = readRegisteredUsers()): DogRecord[] {
  if (typeof window === "undefined") return [];
  const registeredMap = new Map(registeredUsers.map((user) => [user.id || user.email || user.phone || "", user]));
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-pets:"))
    .flatMap((key) => {
      const ownerId = key.replace("pet-villa-pets:", "");
      const owner = registeredMap.get(ownerId);
      const ownerName = owner?.fullName || owner?.name || (ownerId === "guest" ? "Guest Owner" : "Pet Owner");
      const ownerPhone = owner?.phone || "";
      const ownerEmail = owner?.email || "";
      return readJson<PetProfile[]>(key, []).map((pet) => ({ ...pet, ownerId, ownerName, ownerPhone, ownerEmail }));
    });
}

function money(value: number) {
  return `RM${Math.round(value || 0)}`;
}

function expenseMoney(value: number) {
  return `RM${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

function isValidExpenseAmount(value: string) {
  return /^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0 && Number(value) <= 999999.99;
}

function hostTimeHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, (endHour + endMinute / 60) - (startHour + startMinute / 60));
}

function hostTimeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes || 0).padStart(2, "0")}${suffix}`;
}

function hostBusinessDateLabel(value: string) {
  return new Date(`${value}T12:00:00+08:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur"
  });
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
    pending_verification: "Pending Verify",
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

function isCurrentlyAtVilla(order: VillaOrder) {
  return ["active", "staying"].includes(order.status);
}

function paymentStatus(order: VillaOrder) {
  return getOrderPaymentDisplayStatus(order).label;
}

function HostPaymentStatus({ order, showAmounts = true }: { order: VillaOrder; showAmounts?: boolean }) {
  const payment = getOrderPaymentDisplayStatus(order);
  return (
    <span className="host-payment-display" data-kind={payment.kind}>
      <strong>{payment.label}</strong>
      {showAmounts ? <small>Paid {money(payment.paid)} · Balance {money(payment.balance)}</small> : null}
    </span>
  );
}

function canMoveOrderTo(order: VillaOrder, nextStatus: VillaOrder["status"]) {
  if (order.status === "cancelled" || order.status === "completed") return false;
  if (nextStatus === "staying") {
    const range = getOrderDateRange(order);
    return ["confirmed", "balance"].includes(order.status)
      && Math.max(0, order.paid || 0) > 0
      && Boolean(range && toDateKey(todayLocal()) >= toDateKey(range.start));
  }
  if (nextStatus === "ready_pickup") return ["active", "staying"].includes(order.status);
  if (nextStatus === "completed") {
    return ["awaiting_checkout", "ready_pickup"].includes(order.status) && (order.balance || 0) <= 0;
  }
  if (nextStatus === "cancelled") return true;
  return false;
}

function statusPill(status: string) {
  if (["Fully Paid", "Confirmed", "Available", "Live"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["Partially Paid", "Partially Booked", "Pending", "Pending Verify", "Pending Verification"].includes(status)) return "bg-amber-50 text-amber-700";
  if (["Full", "Cancelled", "Payment Retained", "Hidden"].includes(status)) return "bg-red-50 text-red-600";
  if (["Off Day", "Checked In", "Checked Out"].includes(status)) return "bg-villa-text-primary text-white";
  return "bg-villa-primary-bg text-villa-primary";
}

function ordersForDate(orders: VillaOrder[], date: Date) {
  const key = toDateKey(date);
  return orders.filter((order) => {
    if (!isBusinessOrder(order)) return false;
    const range = getOrderDateRange(order);
    if (!range) return false;
    return key >= toDateKey(range.start) && key <= toDateKey(range.end);
  });
}

function autoReplyFor(message: string, settings: BusinessSettings) {
  const text = message.toLowerCase();
  if (/price|rate|how much|价格|价钱|收费/.test(text)) {
    return `Our overnight boarding is RM${settings.boardingRate} per night and daycare is RM${settings.daycareRate} per hour. You can choose your dates in Booking for the exact total.`;
  }
  if (/hour|time|check.?in|check.?out|几点|时间|入住|退房/.test(text)) {
    return "Check-in is available from 9:00am to 7:00pm. Please arrange checkout before 7:00pm. Our team will confirm the exact handover time with you.";
  }
  if (/available|full|slot|空位|满|日期/.test(text)) {
    return "Please choose your date in Booking. Dates marked Full are closed; other dates can be submitted for our team to verify and approve.";
  }
  if (/book|booking|reserve|预约|预定|下单/.test(text)) {
    return "You can add your pet profile, choose Boarding or Daycare, select a date, and submit payment from Booking. Our team verifies every payment before confirming the stay.";
  }
  return "Thank you for messaging Pet Villa. We have received your question and a team member will reply shortly.";
}

type DashboardRange = "today" | "this-week" | "this-month" | "last-week" | "last-month" | "custom";

function dateWindow(range: DashboardRange, customFrom: string, customTo: string = customFrom) {
  const today = todayLocal();
  const start = new Date(today);
  const end = new Date(today);
  if (range === "custom") {
    const selectedFrom = customFrom ? new Date(`${customFrom}T00:00:00`) : today;
    const selectedTo = customTo ? new Date(`${customTo}T00:00:00`) : selectedFrom;
    const rangeStart = selectedFrom <= selectedTo ? selectedFrom : selectedTo;
    const rangeEnd = selectedFrom <= selectedTo ? selectedTo : selectedFrom;
    return { start: rangeStart, end: rangeEnd, label: toDateKey(rangeStart) === toDateKey(rangeEnd) ? shortDate(rangeStart) : `${shortDate(rangeStart)} - ${shortDate(rangeEnd)}` };
  }
  if (range === "this-week" || range === "last-week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (range === "last-week" ? 7 : 0));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
    return { start, end, label: range === "this-week" ? "This Week" : "Last Week" };
  }
  if (range === "this-month") {
    start.setFullYear(today.getFullYear(), today.getMonth(), 1);
    end.setFullYear(today.getFullYear(), today.getMonth() + 1, 0);
    return { start, end, label: "This Month" };
  }
  if (range === "last-month") {
    start.setFullYear(today.getFullYear(), today.getMonth() - 1, 1);
    end.setFullYear(today.getFullYear(), today.getMonth(), 0);
    return { start, end, label: "Last Month" };
  }
  return { start, end, label: "Today" };
}

function dashboardDateRangeLabel(start: Date, end: Date, locale: "en-US" | "zh-CN") {
  const sameDay = toDateKey(start) === toDateKey(end);
  const fullDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  if (sameDay) return fullDate.format(start);
  const startDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(start);
  return `${startDate} - ${fullDate.format(end)}`;
}

function dashboardPeriodCalendarLabel(start: Date, end: Date, locale: "en-US" | "zh-CN") {
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const startLabel = month.format(start);
  const endLabel = month.format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

let hostAlertAudioContext: AudioContext | null = null;

function getHostAlertAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!hostAlertAudioContext || hostAlertAudioContext.state === "closed") {
    hostAlertAudioContext = new AudioContextClass();
  }
  return hostAlertAudioContext;
}

async function unlockHostAlertAudio() {
  const context = getHostAlertAudioContext();
  if (!context) return false;
  try {
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

function playHostAlert() {
  const context = getHostAlertAudioContext();
  if (!context || context.state !== "running") return false;

  const startTime = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.42, startTime);
  master.connect(context.destination);
  const tones = [
    { offset: 0, duration: 0.38, frequency: 880, level: 0.36 },
    { offset: 0.56, duration: 0.62, frequency: 659.25, level: 0.4 }
  ];
  tones.forEach(({ offset, duration, frequency, level }) => {
    const start = startTime + offset;
    const gain = context.createGain();
    const fundamental = context.createOscillator();
    const warmth = context.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.setValueAtTime(frequency, start);
    warmth.type = "triangle";
    warmth.frequency.setValueAtTime(frequency * 2, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(level * 0.58, start + duration * 0.42);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    fundamental.connect(gain);
    warmth.connect(gain);
    gain.connect(master);
    fundamental.start(start);
    warmth.start(start);
    fundamental.stop(start + duration);
    warmth.stop(start + duration);
  });
  return true;
}

function confirmedPetsForDate(orders: VillaOrder[], date: Date) {
  return ordersForDate(orders, date)
    .filter((order) => !["cancelled", "pending_verification"].includes(order.status))
    .reduce((sum, order) => sum + Math.max(1, order.pets.length), 0);
}

function shortDateFromISO(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : shortDate(date);
}

function dogMatchesOrder(dog: DogRecord, order: VillaOrder) {
  return order.pets.some((pet) => {
    const petId = pet.id || "";
    const petName = (pet.name || "").toLowerCase();
    return (petId && petId === dog.id) || (petName && petName === (dog.name || "").toLowerCase());
  });
}

function bookingDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate || startDate}T00:00:00`);
  const safeEnd = end < start ? start : end;
  const days = Math.max(1, Math.round((safeEnd.getTime() - start.getTime()) / 86400000) + 1);
  return { start, end: safeEnd, days };
}

function hostBookingRequestId() {
  return crypto.randomUUID();
}

const hostDaycareTimes = Array.from({ length: 12 }, (_, index) => {
  const hour = index + 9;
  const value = `${String(hour).padStart(2, "0")}:00`;
  const label = hour === 12 ? "12:00pm" : hour > 12 ? `${hour - 12}:00pm` : `${hour}:00am`;
  return { value, label };
});

function reviewPetAvatar(review: PublicReview) {
  if (review.photo) return review.photo;
  const breed = (review.breed || review.pet || "").trim().toLowerCase();
  if (!breed) return dogAvatarSrc();
  const matched = dogAvatarOptions.find((option) => {
    const optionBreed = (option.breed || option.en).toLowerCase();
    return breed.includes(optionBreed) || optionBreed.includes(breed);
  });
  return dogAvatarSrc(matched?.id);
}

type OrderWithOwner = VillaOrder & {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
};

type CustomerEditForm = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

type DogEditForm = PetProfile & {
  medicalRecordName?: string;
  medicalRecordDataUrl?: string;
};

type CrmTab = "overview" | "pets" | "orders" | "payments";

type DiaryForm = {
  mood: string;
  mealNotes: string;
  waterNotes: string;
  activityNotes: string;
  toiletNotes: string;
  healthNotes: string;
  medicationNotes: string;
  careNotes: string;
  reminderNotes: string;
  body: string;
  healthAlert: boolean;
};

function blankDiaryForm(): DiaryForm {
  return {
    mood: "Happy & comfortable",
    mealNotes: "",
    waterNotes: "",
    activityNotes: "",
    toiletNotes: "",
    healthNotes: "",
    medicationNotes: "",
    careNotes: "",
    reminderNotes: "",
    body: "",
    healthAlert: false
  };
}

function chatThreadsKey() {
  return "pet-villa-chat-threads";
}

function HostConsole() {
  const [hostLanguage, setHostLanguage] = useState<HostLanguage>("en");
  const t = (copy: HostCopy) => copy[hostLanguage];
  const [activeWorkspace, setActiveWorkspace] = useState<HostWorkspace>("dashboard");
  const [staffPermissions, setStaffPermissions] = useState<StaffPermission[] | null>(null);
  const [staffAccessRole, setStaffAccessRole] = useState<StaffRole | null>(null);
  const [staffEmail, setStaffEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [dogs, setDogs] = useState<DogRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<VillaMessage[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedDogKey, setSelectedDogKey] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [hostBookingSaving, setHostBookingSaving] = useState(false);
  const [bookingForm, setBookingForm] = useState<HostBookingForm>({
    requestId: hostBookingRequestId(),
    mode: "existing",
    customerId: "",
    customerSource: "auth",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    dogId: "",
    dogIds: [],
    dogName: "",
    dogBreed: "",
    dogAvatar: dogAvatarSrc(dogAvatarOptions[0].id),
    service: "overnight",
    startDate: toDateKey(todayLocal()),
    endDate: toDateKey(todayLocal()),
    startTime: "09:00",
    endTime: "17:00",
    discount: "0",
    paid: "0"
  });
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>("this-month");
  const [dashboardCustomFrom, setDashboardCustomFrom] = useState(toDateKey(todayLocal()));
  const [dashboardCustomTo, setDashboardCustomTo] = useState(toDateKey(todayLocal()));
  const [collectionRange, setCollectionRange] = useState<DashboardRange>("today");
  const [reportFrom, setReportFrom] = useState(toDateKey(new Date(todayLocal().getFullYear(), todayLocal().getMonth(), 1)));
  const [reportTo, setReportTo] = useState(toDateKey(todayLocal()));
  const [customerSearch, setCustomerSearch] = useState("");
  const [dogSearch, setDogSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [paymentCustomerSearch, setPaymentCustomerSearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("");
  const [offDays, setOffDays] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(todayLocal());
  const [managedDay, setManagedDay] = useState<Date | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentConfirm, setPaymentConfirm] = useState<{
    orderId: string;
    mode: "submission" | "balance";
    paymentSubmissionId?: string;
    amount: number;
    customerName: string;
    currentPaid: number;
    newPaid: number;
    remaining: number;
  } | null>(null);
  const [paymentConfirming, setPaymentConfirming] = useState(false);
  const [orderChargeForm, setOrderChargeForm] = useState<OrderChargeForm | null>(null);
  const [orderChargeSaving, setOrderChargeSaving] = useState(false);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const [collectionsExpanded, setCollectionsExpanded] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [voidOrderForm, setVoidOrderForm] = useState<{
    reasonCode: SafeVoidReasonCode;
    reason: string;
    confirmation: string;
    acknowledged: boolean;
  } | null>(null);
  const [voidOrderSaving, setVoidOrderSaving] = useState(false);
  const [earlyCheckoutOrderId, setEarlyCheckoutOrderId] = useState("");
  const [orderEditOpen, setOrderEditOpen] = useState(false);
  const [orderEditForm, setOrderEditForm] = useState<HostOrderEditForm | null>(null);
  const [customerEditOpen, setCustomerEditOpen] = useState(false);
  const [customerEditMode, setCustomerEditMode] = useState<"edit" | "host" | "registered">("edit");
  const [customerEditForm, setCustomerEditForm] = useState<CustomerEditForm>({ name: "", phone: "", email: "", password: "" });
  const [dogEditOpen, setDogEditOpen] = useState(false);
  const [dogEditMode, setDogEditMode] = useState<"add" | "edit">("edit");
  const [dogEditOwnerId, setDogEditOwnerId] = useState("");
  const [dogEditForm, setDogEditForm] = useState<DogEditForm | null>(null);
  const [crmTab, setCrmTab] = useState<CrmTab>("overview");
  const [reply, setReply] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [photoForm, setPhotoForm] = useState({ petName: "", breed: "", caption: "", imageUrl: "" });
  const [reviewForm, setReviewForm] = useState({ name: "", dogName: "", breed: "", rating: 5, en: "", zh: "", date: new Date().toISOString().slice(0, 10), photo: "" });
  const [editingReviewId, setEditingReviewId] = useState("");
  const [hostSettings, setHostSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [settingsTab, setSettingsTab] = useState<"business" | "security">("business");
  const [magicLinkNotice, setMagicLinkNotice] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("pet-villa-host-language");
    if (saved === "en" || saved === "zh") setHostLanguage(saved);
  }, []);

  function changeHostLanguage(language: HostLanguage) {
    setHostLanguage(language);
    window.localStorage.setItem("pet-villa-host-language", language);
  }
  const [paymentQrUploading, setPaymentQrUploading] = useState(false);
  const [notificationDraft, setNotificationDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [hostDataLoaded, setHostDataLoaded] = useState(false);
  const [hostRefreshing, setHostRefreshing] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<PetDiaryUpdate[]>([]);
  const [diaryConfiguration, setDiaryConfiguration] = useState({ configured: false, error: "Checking Private Diary configuration..." });
  const [diaryCustomerId, setDiaryCustomerId] = useState("");
  const [diaryCustomerSearch, setDiaryCustomerSearch] = useState("");
  const [diaryOrderId, setDiaryOrderId] = useState("");
  const [diaryPetId, setDiaryPetId] = useState("");
  const [diaryHistoryOrder, setDiaryHistoryOrder] = useState("");
  const [diaryHistoryPet, setDiaryHistoryPet] = useState("");
  const [diaryHistoryDate, setDiaryHistoryDate] = useState("");
  const [editingDiaryId, setEditingDiaryId] = useState("");
  const [diaryFiles, setDiaryFiles] = useState<File[]>([]);
  const [diaryPublishing, setDiaryPublishing] = useState(false);
  const [calendarSavingDay, setCalendarSavingDay] = useState("");
  const [diaryForm, setDiaryForm] = useState<DiaryForm>(blankDiaryForm());
  const settingsRef = useRef(hostSettings);
  const knownOrderIdsRef = useRef<Set<string> | null>(null);
  const handledAutoReplyIdsRef = useRef<Set<string>>(new Set());
  const autoReplyReadyRef = useRef(false);
  const selectedThreadIdRef = useRef(selectedThreadId);
  const hostSyncInFlightRef = useRef(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("workspace") as HostWorkspace | null;
    if (requested && requested in HOST_WORKSPACE_TITLES) setActiveWorkspace(requested);
    setMagicLinkNotice(window.sessionStorage.getItem(HOST_MAGIC_LINK_NOTICE_KEY) === "1");
    let active = true;
    async function loadStaffAccess() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase?.auth.getSession() || { data: { session: null } };
      if (!data.session?.access_token) {
        if (active) setStaffPermissions([]);
        return;
      }
      const response = await fetch("/api/host/staff/me", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      if (!response.ok) {
        if (active) setStaffPermissions([]);
        return;
      }
      const body = await response.json();
      if (active) {
        setStaffPermissions(Array.isArray(body.permissions) ? body.permissions : []);
        setStaffAccessRole(typeof body.accessRole === "string" ? body.accessRole as StaffRole : null);
        setStaffEmail(typeof body.email === "string" ? body.email : "");
      }
    }
    void loadStaffAccess();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    settingsRef.current = hostSettings;
  }, [hostSettings]);

  useEffect(() => {
    const unlockAudio = () => {
      void unlockHostAlertAudio();
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio, true);
    };
    window.addEventListener("pointerdown", unlockAudio, true);
    window.addEventListener("keydown", unlockAudio, true);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio, true);
    };
  }, []);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  function canViewWorkspace(workspace: HostWorkspace | "staff") {
    if (!staffPermissions) return false;
    const permission = workspace === "staff" ? "staff.view" : WORKSPACE_VIEW_PERMISSIONS[workspace];
    return hasStaffPermission(staffPermissions, permission);
  }

  function canManage(permission: StaffPermission) {
    return Boolean(staffPermissions && hasStaffPermission(staffPermissions, permission));
  }

  useEffect(() => {
    if (!staffPermissions) return;
    const permission = WORKSPACE_VIEW_PERMISSIONS[activeWorkspace];
    if (!hasStaffPermission(staffPermissions, permission)) setActiveWorkspace("dashboard");
  }, [activeWorkspace, staffPermissions]);

  const activeManagePermission = WORKSPACE_MANAGE_PERMISSIONS[activeWorkspace];
  const activeWorkspaceReadOnly = Boolean(activeManagePermission && !canManage(activeManagePermission));
  const isPrimaryOwner = staffAccessRole === "owner" && staffEmail.trim().toLowerCase() === PRIMARY_OWNER_EMAIL;

  useEffect(() => {
    let active = true;
    void loadBusinessSettings().then((settings) => {
      if (active) setHostSettings(settings);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const sync = async (background = false, allowAutomations = false) => {
      if (hostSyncInFlightRef.current) return;
      hostSyncInFlightRef.current = true;
      if (background) setHostRefreshing(true);
      const localRegisteredUsers = readRegisteredUsers();
      const localDogs = readAllPets(localRegisteredUsers);
      try {
        const results = await Promise.allSettled([
          loadHostCrmData(localRegisteredUsers, localDogs),
          loadAllOrdersForHost(),
          loadGuestPhotos(),
          loadChatThreads(),
          loadHostOffDays(),
          loadBusinessExpensesAsHost()
        ] as const);
        if (!active) return;

        const failures: string[] = [];
        const [crmResult, ordersResult, photosResult, threadsResult, offDaysResult, expensesResult] = results;
        if (crmResult.status === "fulfilled") {
          setRegisteredUsers(crmResult.value.profiles);
          setDogs(crmResult.value.pets);
        } else failures.push("customers");
        if (photosResult.status === "fulfilled") setPhotos(photosResult.value);
        else failures.push("gallery");
        if (offDaysResult.status === "fulfilled") setOffDays(offDaysResult.value);
        else failures.push("calendar");
        if (expensesResult.status === "fulfilled") {
          setExpenses(expensesResult.value);
          setExpensesLoaded(true);
        } else failures.push("expenses");

        if (ordersResult.status === "fulfilled") {
          const nextOrders = ordersResult.value;
          const nextOrderIds = new Set(nextOrders.map((order) => order.orderId));
          if (knownOrderIdsRef.current && settingsRef.current.notificationSound) {
            const hasNewOrder = nextOrders.some((order) => !knownOrderIdsRef.current?.has(order.orderId));
            if (hasNewOrder) playHostAlert();
          }
          knownOrderIdsRef.current = nextOrderIds;
          setOrders(nextOrders);
          const firstDiaryOrder = nextOrders.find((order) => DIARY_ELIGIBLE_STATUSES.includes(order.status));
          setDiaryOrderId((current) => current || firstDiaryOrder?.orderId || "");
          setDiaryPetId((current) => current || firstDiaryOrder?.pets[0]?.id || firstDiaryOrder?.pets[0]?.name || "");
        } else failures.push("orders");

        if (threadsResult.status === "fulfilled") {
          const nextThreads = threadsResult.value;
          const nextSelected = selectedThreadIdRef.current || nextThreads[0]?.id || "";
          setThreads(nextThreads);
          if (!selectedThreadIdRef.current && nextSelected) setSelectedThreadId(nextSelected);
          const selectedMessages = nextThreads.find((thread) => thread.id === nextSelected)?.messages;
          if (selectedMessages) setMessages(selectedMessages);
          const latestOwnerMessages = nextThreads
            .map((thread) => ({ thread, message: [...thread.messages].reverse().find((message) => message.from === "owner") }))
            .filter((item): item is { thread: ChatThread; message: VillaMessage } => Boolean(item.message));
          if (!autoReplyReadyRef.current) {
            latestOwnerMessages.forEach(({ message }) => handledAutoReplyIdsRef.current.add(message.id));
            autoReplyReadyRef.current = true;
          } else if (allowAutomations && settingsRef.current.autoReply) {
            latestOwnerMessages.forEach(({ thread, message }) => {
              if (thread.messages.at(-1)?.id !== message.id || handledAutoReplyIdsRef.current.has(message.id)) return;
              handledAutoReplyIdsRef.current.add(message.id);
              void sendMessage("host", autoReplyFor(message.text, settingsRef.current), thread.id).catch(() => {
                setNotice("Automatic reply could not be saved to Supabase. The customer message is still unread.");
              });
            });
          }
        } else failures.push("Inbox");

        setHostDataLoaded(true);
        if (failures.length > 0) {
          setNotice(`Unable to refresh ${failures.join(", ")} — showing last known Host data.`);
        }
      } finally {
        hostSyncInFlightRef.current = false;
        if (active) setHostRefreshing(false);
      }
    };
    const handleSync = () => void sync(true, true).catch((error) => {
      if (!active) return;
      setNotice(error instanceof Error ? error.message : "Unable to refresh — showing last known Host data.");
    });
    void sync(false, false).catch((error) => {
      if (!active) return;
      setHostDataLoaded(true);
      setNotice(error instanceof Error ? error.message : "Host data could not be loaded.");
    });
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void sync(true, false);
    };
    const interval = window.setInterval(refreshWhenVisible, 12_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("pet-villa-orders", handleSync);
    window.addEventListener("pet-villa-pets", handleSync);
    window.addEventListener("pet-villa-gallery", handleSync);
    window.addEventListener("pet-villa-messages", handleSync);
    window.addEventListener("pet-villa-availability", handleSync);
    window.addEventListener("pet-villa-customers", handleSync);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("pet-villa-orders", handleSync);
      window.removeEventListener("pet-villa-pets", handleSync);
      window.removeEventListener("pet-villa-gallery", handleSync);
      window.removeEventListener("pet-villa-messages", handleSync);
      window.removeEventListener("pet-villa-availability", handleSync);
      window.removeEventListener("pet-villa-customers", handleSync);
    };
  }, []);

  useEffect(() => {
    if (activeWorkspace !== "reviews" || !staffPermissions || !hasStaffPermission(staffPermissions, "reviews.view")) return;
    let active = true;
    let inFlight = false;
    const refreshReviews = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const nextReviews = await loadPublicReviews({ includeHidden: true });
        if (active) setReviews(nextReviews);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? `${error.message} Showing last known reviews.` : "Reviews could not be refreshed. Showing last known reviews.");
      } finally {
        inFlight = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshReviews();
    };
    void refreshReviews();
    const interval = window.setInterval(refreshWhenVisible, 5 * 60_000);
    window.addEventListener("pet-villa-reviews", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("pet-villa-reviews", refreshWhenVisible);
    };
  }, [activeWorkspace, staffPermissions]);

  useEffect(() => {
    if (activeWorkspace !== "diary" || !staffPermissions || !hasStaffPermission(staffPermissions, "diary.view")) return;
    let active = true;
    let inFlight = false;
    const refreshDiary = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [configuration, entries] = await Promise.all([
          checkPrivateDiaryConfiguration(),
          loadPetDiaryUpdatesForHost()
        ]);
        if (!active) return;
        setDiaryConfiguration(configuration);
        setDiaryEntries(entries);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? `${error.message} Showing last known Diary updates.` : "Private Diary could not be refreshed. Showing last known updates.");
      } finally {
        inFlight = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshDiary();
    };
    void refreshDiary();
    const interval = window.setInterval(refreshWhenVisible, 5 * 60_000);
    window.addEventListener("pet-villa-diary", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("pet-villa-diary", refreshWhenVisible);
    };
  }, [activeWorkspace, staffPermissions]);

  useEffect(() => {
    let active = true;
    if (!selectedThreadId) {
      setMessages([]);
      return () => {
        active = false;
      };
    }
    if (allowHostDevelopmentFallback) setMessages(readMessages(selectedThreadId));
    void loadMessages(selectedThreadId)
      .then((nextMessages) => {
        if (!active) return;
        setMessages(nextMessages);
      })
      .catch(() => {
        if (!active) return;
        setNotice("Unable to refresh this conversation — showing last known messages.");
      });
    return () => {
      active = false;
    };
  }, [selectedThreadId]);

  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth]);
  const todayKey = toDateKey(todayLocal());
  const dashboardWindow = dateWindow(dashboardRange, dashboardCustomFrom, dashboardCustomTo);
  const dashboardFrom = toDateKey(dashboardWindow.start);
  const dashboardTo = toDateKey(dashboardWindow.end);
  const reportKey = dashboardFrom;
  const reportDay = new Date(`${dashboardFrom}T00:00:00`);
  const dashboardRangeLabel = t({
    en: dashboardDateRangeLabel(dashboardWindow.start, dashboardWindow.end, "en-US"),
    zh: dashboardDateRangeLabel(dashboardWindow.start, dashboardWindow.end, "zh-CN")
  });
  const businessOrders = orders.filter(isBusinessOrder);
  const voidedOrders = orders.filter(isVoidedOrder);
  const selectedPeriodBookings = ordersInRecordedDateRange(businessOrders, dashboardFrom, dashboardTo)
    .filter((order) => order.status !== "cancelled");
  const inStayOrders = businessOrders.filter(isCurrentlyAtVilla);
  const dayCheckIns = ordersCheckedInInDateRange(businessOrders, dashboardFrom, dashboardTo);
  const dayCheckOuts = ordersCompletedInDateRange(businessOrders, dashboardFrom, dashboardTo);
  const accountingMetrics = calculateAccountingMetrics(businessOrders);
  const balanceDue = accountingMetrics.outstanding;
  const todaySales = calculateAccountingMetrics(ordersInRecordedDateRange(orders, todayKey, todayKey)).grossCollected;
  const accountingMonth = todayLocal();
  const accountingMonthStart = toDateKey(new Date(accountingMonth.getFullYear(), accountingMonth.getMonth(), 1));
  const accountingMonthEnd = toDateKey(new Date(accountingMonth.getFullYear(), accountingMonth.getMonth() + 1, 0));
  const monthRevenue = calculatePeriodBusinessReport(orders, accountingMonthStart, accountingMonthEnd).cashCollection.collected;
  const collectionWindow = dateWindow(collectionRange, reportFrom, reportTo);
  const collectionFrom = toDateKey(collectionWindow.start);
  const collectionTo = toDateKey(collectionWindow.end);
  const periodBusinessReport = calculatePeriodBusinessReport(orders, collectionFrom, collectionTo);
  const expenseMetrics = calculateExpenseMetrics(
    expenses,
    accountingMetrics.grossCollected,
    periodBusinessReport.cashCollection.collected,
    collectionFrom,
    collectionTo
  );
  const collectionRangeLabel = t({
    en: dashboardDateRangeLabel(collectionWindow.start, collectionWindow.end, "en-US"),
    zh: dashboardDateRangeLabel(collectionWindow.start, collectionWindow.end, "zh-CN")
  });
  const collectionCalendarLabel = t({
    en: dashboardPeriodCalendarLabel(collectionWindow.start, collectionWindow.end, "en-US"),
    zh: dashboardPeriodCalendarLabel(collectionWindow.start, collectionWindow.end, "zh-CN")
  });
  const collectionPeriodTitle = t({
    en: ({ today: "Today", "this-week": "This Week", "last-week": "Last Week", "this-month": "This Month", "last-month": "Last Month", custom: "Custom Range" } as Record<DashboardRange, string>)[collectionRange],
    zh: ({ today: "今天", "this-week": "本周", "last-week": "上周", "this-month": "本月", "last-month": "上月", custom: "自选范围" } as Record<DashboardRange, string>)[collectionRange]
  });
  const totalOffersGiven = accountingMetrics.offersGiven;
  const originalSalesTotal = accountingMetrics.originalTotal;
  const totalSales = accountingMetrics.totalSales;
  const totalPaidRevenue = accountingMetrics.grossCollected;
  const outstandingOrders = businessOrders.filter((order) => outstandingAmount(order) > 0);
  const unreadThreads = threads.filter((thread) => thread.messages.at(-1)?.from === "owner");
  const customers = useMemo<CustomerRecord[]>(() => {
    const records = new Map<string, CustomerRecord>();
    registeredUsers.forEach((user) => {
      const id = user.id || user.email || user.phone;
      if (!id) return;
      records.set(id, {
        id,
        name: user.fullName || user.name || "Pet Owner",
        phone: user.phone || "",
        email: user.email || "",
        registerDate: shortDateFromISO(user.registeredAt),
        dogs: [],
        orders: [],
        lastStay: "-",
        totalSpend: 0,
        phoneVerified: Boolean(user.phoneVerified),
        emailVerified: Boolean(user.emailVerified),
        isTemporary: Boolean(user.isTemporary),
        customerSource: user.customerSource || "auth"
      });
    });
    dogs.forEach((dog) => {
      const existing = records.get(dog.ownerId);
      records.set(dog.ownerId, {
        id: dog.ownerId,
        name: existing?.name || dog.ownerName,
        phone: existing?.phone || dog.ownerPhone,
        email: existing?.email || dog.ownerEmail,
        registerDate: existing?.registerDate || "-",
        dogs: [...(existing?.dogs || []), dog],
        orders: existing?.orders || [],
        lastStay: existing?.lastStay || "-",
        totalSpend: existing?.totalSpend || 0,
        phoneVerified: existing?.phoneVerified || false,
        emailVerified: existing?.emailVerified || false,
        isTemporary: existing?.isTemporary || false,
        customerSource: existing?.customerSource || dog.customerSource || "auth"
      });
    });
    businessOrders.forEach((order) => {
      const orderOwner = order as OrderWithOwner;
      const matchedDog = dogs.find((dog) => dogMatchesOrder(dog, order));
      const ownerId = orderOwner.customerId || matchedDog?.ownerId || "customer";
      const existing = records.get(ownerId);
      const range = getOrderDateRange(order);
      records.set(ownerId, {
        id: ownerId,
        name: existing?.name || orderOwner.customerName || matchedDog?.ownerName || "Pet Owner",
        phone: existing?.phone || orderOwner.customerPhone || matchedDog?.ownerPhone || "",
        email: existing?.email || orderOwner.customerEmail || matchedDog?.ownerEmail || "",
        registerDate: existing?.registerDate || "-",
        dogs: existing?.dogs || [],
        orders: [...(existing?.orders || []), order],
        lastStay: range ? shortDate(range.end) : existing?.lastStay || "-",
        totalSpend: (existing?.totalSpend || 0) + (order.paid || 0),
        phoneVerified: existing?.phoneVerified || false,
        emailVerified: existing?.emailVerified || false,
        isTemporary: existing?.isTemporary || false,
        customerSource: existing?.customerSource || order.customerSource || matchedDog?.customerSource || "auth"
      });
    });
    return Array.from(records.values());
  }, [businessOrders, dogs, registeredUsers]);

  const statusOverview = [
    ["Pending Verify", businessOrders.filter((order) => bookingStatus(order) === "Pending Verify").length],
    ["Pending", businessOrders.filter((order) => bookingStatus(order) === "Pending").length],
    ["Confirmed", businessOrders.filter((order) => bookingStatus(order) === "Confirmed").length],
    ["Checked In", businessOrders.filter((order) => bookingStatus(order) === "Checked In").length],
    ["Checked Out", businessOrders.filter((order) => bookingStatus(order) === "Checked Out").length],
    ["Completed", businessOrders.filter((order) => bookingStatus(order) === "Completed").length],
    ["Cancelled", businessOrders.filter((order) => bookingStatus(order) === "Cancelled").length]
  ];
  const reportPetCount = selectedPeriodBookings.reduce((sum, order) => sum + order.pets.length, 0);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const selectedCustomerOutstanding = selectedCustomer?.orders.reduce((sum, order) => sum + outstandingAmount(order), 0) || 0;
  const selectedCustomerPaid = selectedCustomer?.orders.reduce((sum, order) => sum + collectedAmount(order), 0) || 0;
  const selectedCustomerDiscount = selectedCustomer?.orders.reduce((sum, order) => sum + discountAmount(order), 0) || 0;
  const selectedCustomerCurrentOrders = selectedCustomer?.orders.filter((order) => !["completed", "cancelled"].includes(order.status)) || [];
  const selectedCustomerPastOrders = selectedCustomer?.orders.filter((order) => ["completed", "cancelled"].includes(order.status)) || [];
  const normalizedPaymentCustomerSearch = paymentCustomerSearch.trim().toLowerCase();
  const paymentCustomers = customers
    .map((customer) => ({
      ...customer,
      outstanding: customer.orders.reduce((sum, order) => sum + outstandingAmount(order), 0),
      paid: customer.orders.reduce((sum, order) => sum + collectedAmount(order), 0)
    }))
    .filter((customer) => customer.outstanding > 0)
    .filter((customer) => [customer.name, customer.phone, customer.email, customer.dogs.map((dog) => dog.name).join(" ")].join(" ").toLowerCase().includes(normalizedPaymentCustomerSearch))
    .sort((a, b) => b.outstanding - a.outstanding);
  const normalizedCollectionSearch = collectionSearch.trim().toLowerCase();
  const collectionOrders = paidOrderCollections(businessOrders).filter((order) => {
    const owner = ownerForOrder(order);
    return [order.orderId, owner.name, owner.phone, owner.email, order.pets.map((pet) => pet.name).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalizedCollectionSearch);
  });
  const selectedDog = dogs.find((dog) => `${dog.ownerId}-${dog.id}` === selectedDogKey) || null;
  const selectedOrder = orders.find((order) => orderSelectionKey(order) === selectedOrderId) || null;
  const diaryOrders = businessOrders.filter((order) => DIARY_ELIGIBLE_STATUSES.includes(order.status));
  const diaryCustomers = customers.filter((customer) => diaryOrders.some((order) => ownerForOrder(order).id === customer.id));
  const normalizedDiaryCustomerSearch = diaryCustomerSearch.trim().toLowerCase();
  const filteredDiaryCustomers = diaryCustomers.filter((customer) => [customer.name, customer.phone, customer.email, customer.dogs.map((dog) => dog.name).join(" ")].join(" ").toLowerCase().includes(normalizedDiaryCustomerSearch));
  const currentDiaryOrder = diaryOrders.find((order) => order.orderId === diaryOrderId) || diaryOrders[0] || null;
  const currentDiaryOwnerId = currentDiaryOrder ? ownerForOrder(currentDiaryOrder).id : "";
  const selectedDiaryCustomer = diaryCustomers.find((customer) => customer.id === diaryCustomerId)
    || diaryCustomers.find((customer) => customer.id === currentDiaryOwnerId)
    || diaryCustomers[0]
    || null;
  const customerDiaryOrders = selectedDiaryCustomer ? diaryOrders.filter((order) => ownerForOrder(order).id === selectedDiaryCustomer.id) : [];
  const customerDiaryPets = Array.from(new Map(customerDiaryOrders.flatMap((order) => order.pets).map((pet) => [pet.id || pet.name, pet])).values());
  const selectedDiaryCustomerPet = customerDiaryPets.find((pet) => (pet.id || pet.name) === diaryPetId) || customerDiaryPets[0] || null;
  const petDiaryOrders = selectedDiaryCustomerPet
    ? customerDiaryOrders.filter((order) => order.pets.some((pet) => (pet.id || pet.name) === (selectedDiaryCustomerPet.id || selectedDiaryCustomerPet.name)))
    : customerDiaryOrders;
  const selectedDiaryOrder = petDiaryOrders.find((order) => order.orderId === diaryOrderId) || petDiaryOrders[0] || null;
  const selectedDiaryOwner = selectedDiaryCustomer || (selectedDiaryOrder ? ownerForOrder(selectedDiaryOrder) : null);
  const selectedDiaryPet = selectedDiaryOrder?.pets.find((pet) => (pet.id || pet.name) === (selectedDiaryCustomerPet?.id || selectedDiaryCustomerPet?.name)) || selectedDiaryOrder?.pets[0] || null;
  const visibleDiaryEntries = diaryEntries.filter((entry) => {
    const matchesCustomer = !selectedDiaryOwner?.id || entry.ownerId === selectedDiaryOwner.id;
    const matchesOrder = !diaryHistoryOrder || entry.orderId === diaryHistoryOrder;
    const matchesPet = !diaryHistoryPet || entry.petId === diaryHistoryPet;
    const matchesDate = !diaryHistoryDate || entry.createdAt.slice(0, 10) === diaryHistoryDate;
    return matchesCustomer && matchesOrder && matchesPet && matchesDate;
  });
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId);
  const selectedThreadCustomer = selectedThread
    ? customers.find((customer) => customer.name === selectedThread.userName || customer.phone === selectedThread.userPhone)
    : undefined;
  const selectedChatDogs = selectedThreadCustomer?.dogs || [];
  const selectedChatOrders = selectedThreadCustomer?.orders || [];
  const selectedChatBalance = selectedChatOrders.reduce((sum, order) => sum + Math.max(0, order.balance || 0), 0);
  const activeBookingCustomer = customers.find((customer) => customer.id === bookingForm.customerId);
  const activeBookingDogs = bookingForm.mode === "existing"
    ? dogs.filter((dog) => bookingForm.dogIds.includes(dog.id) && dog.ownerId === bookingForm.customerId)
    : [];
  const bookingDogCount = activeBookingDogs.length + (bookingForm.dogName.trim() ? 1 : 0);
  const bookingDateMath = bookingDays(bookingForm.startDate, bookingForm.endDate);
  const bookingDaycareHours = Math.max(0, Number(bookingForm.endTime.slice(0, 2)) - Number(bookingForm.startTime.slice(0, 2)));
  const bookingSubtotal = calculateServiceSubtotal({
    service: bookingForm.service,
    startDate: bookingForm.startDate,
    endDate: bookingForm.service === "daycare" ? bookingForm.startDate : bookingForm.endDate,
    hours: bookingDaycareHours,
    petCount: bookingDogCount || 1,
    settings: {
      boardingRate: Number(hostSettings.boardingRate) || 35,
      daycareRate: Number(hostSettings.daycareRate) || 5,
      specialDateRates: hostSettings.specialDateRates
    }
  });
  const bookingDiscount = Math.min(bookingSubtotal, Math.max(0, Number(bookingForm.discount) || 0));
  const bookingTotal = Math.max(0, bookingSubtotal - bookingDiscount);
  const bookingPaid = Math.min(bookingTotal, Math.max(0, Number(bookingForm.paid) || 0));
  const bookingDeposit = bookingForm.service === "daycare" || bookingTotal < 50 ? 0 : 50;
  const bookingBalance = Math.max(0, bookingTotal - bookingPaid);
  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) =>
    [customer.name, customer.phone, customer.email, customer.dogs.map((dog) => dog.name).join(" "), customer.orders.map((order) => order.orderId).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalizedCustomerSearch)
  );
  const normalizedDogSearch = dogSearch.trim().toLowerCase();
  const filteredDogs = dogs.filter((dog) =>
    [dog.name, dog.breed, dog.ownerName, dog.ownerPhone]
      .join(" ")
      .toLowerCase()
      .includes(normalizedDogSearch)
  );
  const normalizedBookingSearch = bookingSearch.trim().toLowerCase();
  const filteredOrders = (bookingStatusFilter === "voided" ? voidedOrders : businessOrders).filter((order) => {
    const owner = order as OrderWithOwner;
    const statusMatches = !bookingStatusFilter
      || (bookingStatusFilter === "needs-action" && ["pending_verification", "balance"].includes(order.status))
      || (bookingStatusFilter === "active" && isCurrentlyAtVilla(order))
      || (bookingStatusFilter === "outstanding" && order.status !== "cancelled" && (order.balance || 0) > 0)
      || (bookingStatusFilter === "completed" && order.status === "completed")
      || (bookingStatusFilter === "voided" && isVoidedOrder(order));
    return [order.orderId, owner.customerName, owner.customerPhone, order.pets.map((pet) => pet.name).join(" "), order.serviceLabel, orderRangeLabel(order)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedBookingSearch) && statusMatches;
  });
  const bookingMetrics = {
    needsAction: businessOrders.filter((order) => ["pending_verification", "balance"].includes(order.status)).length,
    active: inStayOrders.length,
    outstanding: businessOrders.reduce((sum, order) => order.status === "cancelled" ? sum : sum + Math.max(0, order.balance || 0), 0)
  };
  const selectedStatusOrders = bookingStatusFilter && bookingStatusFilter !== "voided" ? businessOrders.filter((order) => bookingStatus(order) === bookingStatusFilter || paymentStatus(order) === bookingStatusFilter).slice(0, 5) : [];

  function ownerForOrder(order: VillaOrder) {
    const owner = order as OrderWithOwner;
    if (owner.customerName || owner.customerId) {
      return {
        id: owner.customerId || "",
        name: owner.customerName || "Pet Owner",
        phone: owner.customerPhone || "",
        email: owner.customerEmail || ""
      };
    }
    const matchedDog = dogs.find((dog) => dogMatchesOrder(dog, order));
    return {
      id: matchedDog?.ownerId || "",
      name: matchedDog?.ownerName || "Pet Owner",
      phone: matchedDog?.ownerPhone || "",
      email: matchedDog?.ownerEmail || ""
    };
  }

  function scrollToHostSection(id: string) {
    const workspaceMap: Record<string, HostWorkspace> = {
      dashboard: "dashboard",
      "booking-center": "bookings",
      "calendar-capacity": "calendar",
      customers: "customers",
      dogs: "customers",
      payments: "payments",
      gallery: "diary",
      messages: "messages",
      promotions: "vouchers",
      reviews: "reviews",
      reports: "payments",
      settings: "settings"
    };
    setActiveWorkspace(workspaceMap[id] || "dashboard");
    setSidebarOpen(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function refreshHostData() {
    const localRegisteredUsers = readRegisteredUsers();
    const crm = await loadHostCrmData(localRegisteredUsers, readAllPets(localRegisteredUsers));
    const nextRegisteredUsers = crm.profiles;
    const nextDogs = crm.pets;
    const nextThreads = await loadChatThreads();
    const nextSelected = selectedThreadId || nextThreads[0]?.id || "";
    const nextMessages = nextSelected ? await loadMessages(nextSelected) : [];
    setOrders(await loadAllOrdersForHost());
    setExpenses(await loadBusinessExpensesAsHost());
    setExpensesLoaded(true);
    setRegisteredUsers(nextRegisteredUsers);
    setDogs(nextDogs);
    setThreads(nextThreads);
    setSelectedThreadId(nextSelected);
    setMessages(nextMessages);
    setOffDays(await loadHostOffDays());
    setPhotos(await loadGuestPhotos());
  }

  function writeRegisteredUser(nextUser: RegisteredUser) {
    const id = nextUser.id || nextUser.email || nextUser.phone;
    if (!id || typeof window === "undefined") return;
    const next = readRegisteredUsers().map((user) => ((user.id || user.email || user.phone) === id ? { ...user, ...nextUser, id } : user));
    if (!next.some((user) => (user.id || user.email || user.phone) === id)) next.unshift({ ...nextUser, id });
    window.localStorage.setItem("pet-villa-registered-users", JSON.stringify(next));
    const session = readJson<{ user?: RegisteredUser }>("pet-villa-session", {});
    if ((session.user?.id || session.user?.email || session.user?.phone) === id) {
      window.localStorage.setItem("pet-villa-session", JSON.stringify({ ...session, user: { ...session.user, ...nextUser, id } }));
    }
    window.dispatchEvent(new Event("pet-villa-customers"));
  }

  function openCustomerEditor(customer: CustomerRecord) {
    setSelectedCustomerId(customer.id);
    setCustomerEditMode("edit");
    setCustomerEditForm({ name: customer.name, phone: customer.phone, email: customer.email, password: "" });
    setCustomerEditOpen(true);
  }

  function openHostCustomerEditor() {
    setCustomerEditMode("host");
    setCustomerEditForm({ name: "", phone: "", email: "", password: "" });
    setCustomerEditOpen(true);
  }

  function openRegisteredCustomerEditor() {
    setCustomerEditMode("registered");
    setCustomerEditForm({ name: "", phone: "", email: "", password: "" });
    setCustomerEditOpen(true);
  }

  function selectCrmCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    setCrmTab("overview");
    setCustomerEditOpen(false);
    setDogEditOpen(false);
  }

  async function saveCustomerEdit() {
    if (customerEditMode === "registered") {
      const name = customerEditForm.name.trim();
      if (!name || (!customerEditForm.phone.trim() && !customerEditForm.email.trim()) || customerEditForm.password.length < 8) {
        setNotice("Enter the customer name, email or phone, and a temporary password of at least 8 characters.");
        return;
      }
      try {
        const customer = await createCustomerAccountAsHost({
          fullName: name,
          phone: customerEditForm.phone.trim(),
          email: customerEditForm.email.trim(),
          password: customerEditForm.password
        });
        writeRegisteredUser({
          id: customer.id,
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email,
          registeredAt: customer.registeredAt,
          phoneVerified: Boolean(customer.phone),
          emailVerified: Boolean(customer.email),
          isTemporary: false
        });
        setSelectedCustomerId(customer.id);
        setCustomerEditOpen(false);
        setNotice("Registered customer login created in Supabase. Share the login ID and temporary password privately.");
        await refreshHostData();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "The registered customer account could not be created.");
      }
      return;
    }
    if (customerEditMode === "host") {
      const name = customerEditForm.name.trim();
      const phone = customerEditForm.phone.trim();
      if (!name || !phone) {
        setNotice("Customer name and phone are required. Email is optional.");
        return;
      }
      try {
        const customer = await createHostCustomerAsHost({
          fullName: name,
          phone,
          email: customerEditForm.email.trim()
        });
        setSelectedCustomerId(customer.id);
        setCustomerEditOpen(false);
        setNotice("Customer profile saved permanently. This profile does not create a login account.");
        await refreshHostData();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "The customer profile could not be created.");
      }
      return;
    }
    if (!selectedCustomer) return;
    const nextCustomer = {
      id: selectedCustomer.id,
      fullName: customerEditForm.name.trim() || selectedCustomer.name,
      phone: customerEditForm.phone.trim(),
      email: customerEditForm.email.trim()
    };
    try {
      const result = await updateCustomerAsHost(selectedCustomer.id, selectedCustomer.customerSource, {
          fullName: nextCustomer.fullName,
          phone: nextCustomer.phone,
          email: nextCustomer.email
        });
      if (selectedCustomer.customerSource === "auth") writeRegisteredUser({ ...nextCustomer, isTemporary: false });
      setCustomerEditOpen(false);
      setNotice(result.persisted
        ? "Customer profile updated and synced to Supabase."
        : "The customer profile could not be persisted.");
      await refreshHostData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Customer profile could not be updated.");
    }
  }

  function openDogEditor(dog: DogRecord) {
    setSelectedDogKey(`${dog.ownerId}-${dog.id}`);
    setDogEditOwnerId(dog.ownerId);
    setDogEditMode("edit");
    setDogEditForm({ ...dog });
    setDogEditOpen(true);
  }

  function openAddPetEditor(customer: CustomerRecord) {
    setSelectedCustomerId(customer.id);
    setSelectedDogKey("");
    setDogEditOwnerId(customer.id);
    setDogEditMode("add");
    setDogEditForm({
      id: `host-pet-${Date.now()}`,
      name: "",
      breed: "",
      weight: "",
      age: "",
      gender: "",
      coatColor: "",
      vaccinated: false,
      neutered: false,
      friendly: true,
      calm: true,
      foodBrand: "",
      mealsPerDay: "",
      allergies: "",
      medication: "",
      specialNotes: "",
      photoDataUrl: dogAvatarSrc(dogAvatarOptions[0].id)
    });
    setDogEditOpen(true);
    setCrmTab("pets");
  }

  function handlePetPhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !dogEditForm) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Pet photo must be an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDogEditForm((current) => current ? { ...current, photoDataUrl: String(reader.result || "") } : current);
    reader.readAsDataURL(file);
  }

  function handleMedicalRecordFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !dogEditForm) return;
    const reader = new FileReader();
    reader.onload = () => setDogEditForm((current) => current ? { ...current, medicalRecordName: file.name, medicalRecordDataUrl: String(reader.result || "") } : current);
    reader.readAsDataURL(file);
  }

  async function saveDogEdit() {
    if (!dogEditForm || !dogEditOwnerId) return;
    if (!dogEditForm.name.trim()) {
      setNotice("Pet name is required.");
      return;
    }
    const ownerId = dogEditOwnerId;
    const existingDog = dogs.find((dog) => dog.ownerId === ownerId && dog.id === dogEditForm.id);
    const current = readPetProfiles(ownerId);
    const cleanPet: DogEditForm = {
      ...dogEditForm,
      name: dogEditForm.name.trim(),
      breed: dogEditForm.breed.trim(),
      weight: dogEditForm.weight.trim(),
      age: dogEditForm.age.trim(),
      allergies: dogEditForm.allergies.trim(),
      medication: dogEditForm.medication.trim(),
      specialNotes: dogEditForm.specialNotes.trim()
    };
    try {
      const owner = customers.find((customer) => customer.id === ownerId);
      if (!owner) throw new Error("The pet owner could not be found. Refresh and try again.");
      const result = await savePetAsHost(ownerId, owner.customerSource, cleanPet);
      const savedPet = result.pet;
      const next = current.some((pet) => pet.id === (existingDog?.id || savedPet.id))
        ? current.map((pet) => pet.id === (existingDog?.id || savedPet.id) ? savedPet : pet)
        : [savedPet, ...current];
      writePetProfiles(next, ownerId);
      setSelectedDogKey(`${ownerId}-${savedPet.id}`);
      setDogEditOpen(false);
      setNotice(result.persisted
        ? `Pet profile ${dogEditMode === "add" ? "added" : "updated"} and synced to Supabase.`
        : `Pet profile ${dogEditMode === "add" ? "added" : "updated"} in local fallback only.`);
      await refreshHostData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pet profile could not be saved.");
    }
  }

  async function removePetFromCustomer(customer: CustomerRecord, pet: PetProfile) {
    if (!window.confirm(`Delete ${pet.name || "this pet"}'s profile? Existing order history will remain unchanged.`)) return;
    try {
      const result = await deletePetAsHost(customer.id, customer.customerSource, pet);
      writePetProfiles(readPetProfiles(customer.id).filter((item) => item.id !== pet.id), customer.id);
      setDogEditOpen(false);
      setSelectedDogKey("");
      setNotice(result.persisted ? "Pet profile deleted from Supabase." : "Pet profile deleted from local fallback only.");
      await refreshHostData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pet profile could not be deleted.");
    }
  }

  async function updateHostOrder(
    order: VillaOrder,
    updater: (order: VillaOrder & OrderWithOwner) => VillaOrder & OrderWithOwner,
    paymentVerified = false,
    earlyCheckoutApproved = false
  ) {
    if (typeof window === "undefined") return null;
    if (isVoidedOrder(order)) {
      setNotice("Voided records are read-only and cannot be changed.");
      return null;
    }
    const updated = updater(order as VillaOrder & OrderWithOwner);
    const recordsPayment = updated.paid > order.paid || updated.balance < order.balance;
    if (recordsPayment && !paymentVerified) {
      void openPaymentConfirmation(order, order.paymentSubmission ? "submission" : "balance");
      return null;
    }
    try {
      if (!order.orderRowId) throw new Error("This order is missing its permanent database identity. Refresh and try again.");
      const result = await updateHostOrderAsHost(order.orderRowId, {
        service: updated.service,
        serviceLabel: updated.serviceLabel,
        dateLabel: updated.dateLabel,
        startDateISO: updated.startDateISO,
        endDateISO: updated.endDateISO,
        startTime: updated.startTime,
        endTime: updated.endTime,
        nights: updated.nights,
        hours: updated.hours,
        pets: updated.pets,
        subtotal: updated.subtotal ?? updated.total,
        total: updated.total,
        deposit: updated.deposit,
        manualDiscount: updated.manualDiscount || 0,
        specialRequest: updated.specialRequest || "",
        status: updated.status,
        cancelledAt: updated.cancelledAt || null,
        photosAvailable: updated.photosAvailable || 0
      }, earlyCheckoutApproved);
      await refreshHostData();
      setSelectedOrderId(order.orderRowId);
      return { ...updated, ...(result.order as Partial<VillaOrder>) };
    } catch (error) {
      console.error("Host order update could not be persisted.", error);
      setNotice(error instanceof Error ? error.message : "Order was not updated because Supabase could not save the change. Please try again.");
      return null;
    }
  }

  async function openPaymentConfirmation(order: VillaOrder, mode: "submission" | "balance") {
    if (isVoidedOrder(order)) {
      setNotice("Payment actions are disabled for voided records.");
      return;
    }
    let paymentSubmission = order.paymentSubmission;
    if (mode === "submission" && !paymentSubmission?.id) {
      if (!order.orderRowId) {
        setNotice(t({ en: "This order is missing its permanent database identity. Refresh and try again.", zh: "此订单缺少永久资料身份。请刷新后再试。" }));
        return;
      }
      try {
        const prepared = await prepareHostPaymentSubmissionAsHost(order.orderRowId);
        const submissionId = prepared.paymentSubmission?.payment_submission_id;
        if (!submissionId) throw new Error(t({ en: "The pending payment has no durable submission identity.", zh: "待核实付款没有永久提交身份。" }));
        paymentSubmission = {
          id: submissionId,
          amount: Number(prepared.paymentSubmission?.amount || 0),
          method: prepared.paymentSubmission?.method || "qr",
          submittedAt: prepared.paymentSubmission?.submitted_at || new Date().toISOString()
        };
        await refreshHostData();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : t({ en: "The pending payment could not be prepared safely.", zh: "无法安全准备此待核实付款。" }));
        return;
      }
    }
    const amount = mode === "submission"
      ? Math.min(Math.max(0, order.balance || 0), Math.max(0, paymentSubmission?.amount || 0))
      : Math.max(0, order.balance || 0);
    if (amount <= 0) {
      setNotice(mode === "submission" ? "There is no customer payment submission to verify." : "This order has no outstanding balance.");
      return;
    }
    const currentPaid = Math.max(0, order.paid || 0);
    const newPaid = Math.min(order.total, currentPaid + amount);
    setPaymentConfirm({
      orderId: order.orderId,
      mode,
      paymentSubmissionId: paymentSubmission?.id,
      amount,
      customerName: ownerForOrder(order).name,
      currentPaid,
      newPaid,
      remaining: Math.max(0, order.total - newPaid)
    });
  }

  async function confirmHostPayment() {
    if (!paymentConfirm || paymentConfirming) return;
    const order = orders.find((item) => item.orderId === paymentConfirm.orderId);
    if (!order) {
      setNotice("The order is no longer available. Refresh and try again.");
      setPaymentConfirm(null);
      return;
    }
    setPaymentConfirming(true);
    try {
      if (!order.orderRowId) throw new Error("This order is missing its permanent database identity. Refresh and try again.");
      const result = await verifyHostPaymentAsHost(order.orderRowId, paymentConfirm.mode, paymentConfirm.paymentSubmissionId) as {
        alreadyVerified?: boolean;
        paid?: number;
        balance?: number;
      };
      await refreshHostData();
      if (paymentConfirm.mode === "submission" && !result.alreadyVerified) {
        const customer = customers.find((item) => item.id === ownerForOrder(order).id);
        if (customer) {
          const threadId = ensureCustomerThread(customer, false);
          try {
            await sendMessage(
              "host",
              `Your Pet Villa booking ${order.orderId} payment has been verified. Paid: ${money(result.paid || 0)}. Balance: ${money(result.balance || 0)}.`,
              threadId
            );
          } catch (messageError) {
            console.error("Payment was verified, but the customer message could not be saved.", messageError);
            setNotice("Payment verified and saved. The customer Inbox message could not be sent.");
            setPaymentConfirm(null);
            return;
          }
        }
      }
      setNotice(result.alreadyVerified
        ? "This payment was already verified. No duplicate amount was added."
        : `${money(paymentConfirm.amount)} verified. Paid ${money(result.paid || 0)} · Balance ${money(result.balance || 0)}.`);
      setPaymentConfirm(null);
    } catch (error) {
      console.error("Host payment verification failed.", error);
      setNotice(error instanceof Error ? error.message : "Payment verification failed. No amounts were changed.");
    } finally {
      setPaymentConfirming(false);
    }
  }

  async function rejectHostPayment(order: VillaOrder) {
    if (paymentConfirming) return;
    if (!order.orderRowId) {
      setNotice(t({ en: "This payment is missing its durable submission identity. Refresh and try again.", zh: "此付款缺少永久提交身份。请刷新后再试。" }));
      return;
    }
    if (!window.confirm(t({ en: "Reject this submitted payment? This will not cancel the booking or change verified amounts.", zh: "要拒绝此已提交付款吗？这不会取消预约或更改已核实金额。" }))) return;
    setPaymentConfirming(true);
    try {
      let paymentSubmissionId = order.paymentSubmission?.id;
      if (!paymentSubmissionId) {
        const prepared = await prepareHostPaymentSubmissionAsHost(order.orderRowId);
        paymentSubmissionId = prepared.paymentSubmission?.payment_submission_id;
      }
      if (!paymentSubmissionId) throw new Error(t({ en: "The pending payment has no durable submission identity.", zh: "待核实付款没有永久提交身份。" }));
      const result = await rejectHostPaymentAsHost(order.orderRowId, paymentSubmissionId, "not_received") as { alreadyRejected?: boolean };
      await refreshHostData();
      setNotice(result.alreadyRejected
        ? t({ en: "This payment submission was already rejected. No verified amount changed.", zh: "此付款提交已被拒绝。已核实金额没有改变。" })
        : t({ en: "Payment submission rejected. The booking and verified amounts were preserved.", zh: "付款提交已拒绝。预约与已核实金额均已保留。" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t({ en: "Payment rejection failed. No order amount changed.", zh: "付款拒绝失败。订单金额没有改变。" }));
    } finally {
      setPaymentConfirming(false);
    }
  }

  function openOrderCharge(order: VillaOrder) {
    if (isVoidedOrder(order) || ["cancelled", "completed"].includes(order.status)) {
      setNotice("Closed or voided orders cannot receive a new charge.");
      return;
    }
    setSelectedOrderId(orderSelectionKey(order));
    setOrderChargeForm({ requestId: crypto.randomUUID(), amount: "", reasonCode: "late_checkout", note: "" });
  }

  async function saveOrderCharge() {
    if (!selectedOrder || !orderChargeForm || orderChargeSaving) return;
    const amount = Number(orderChargeForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Enter a charge amount greater than RM0.");
      return;
    }
    if (!selectedOrder.orderRowId) {
      setNotice("This order is missing its permanent database identity. Refresh and try again.");
      return;
    }
    setOrderChargeSaving(true);
    try {
      const result = await addOrderChargeAsHost(selectedOrder.orderRowId, {
        requestId: orderChargeForm.requestId,
        amount,
        reasonCode: orderChargeForm.reasonCode,
        note: orderChargeForm.note.trim()
      });
      await refreshHostData();
      setSelectedOrderId(orderSelectionKey(selectedOrder));
      setOrderChargeForm(null);
      setNotice(`Charge ${money(result.charge.amount)} added to ${selectedOrder.orderId}. New balance: ${money(result.order.balance)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The charge was not saved. No order amount changed.");
    } finally {
      setOrderChargeSaving(false);
    }
  }

  function openExpenseRecorder() {
    setExpenseForm({
      requestId: crypto.randomUUID(),
      expenseDate: toDateKey(todayLocal()),
      amount: "",
      category: "supplies",
      note: ""
    });
  }

  async function saveBusinessExpense() {
    if (!expenseForm || expenseSaving) return;
    if (!isValidExpenseAmount(expenseForm.amount)) {
      setNotice("Enter an amount greater than RM0 with no more than two decimal places.");
      return;
    }
    const amount = Number(expenseForm.amount);
    setExpenseSaving(true);
    try {
      await recordBusinessExpenseAsHost({
        requestId: expenseForm.requestId,
        expenseDate: expenseForm.expenseDate,
        amount,
        category: expenseForm.category,
        note: expenseForm.note.trim()
      });
      const nextExpenses = await loadBusinessExpensesAsHost();
      setExpenses(nextExpenses);
      setExpensesLoaded(true);
      setExpenseForm(null);
      setNotice(`Expense ${expenseMoney(amount)} recorded for ${expenseForm.expenseDate}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The expense was not saved. No financial total changed.");
    } finally {
      setExpenseSaving(false);
    }
  }

  async function moveHostOrder(order: VillaOrder, nextStatus: VillaOrder["status"], earlyCheckoutApproved = false) {
    if (isVoidedOrder(order)) {
      setNotice("Voided records cannot move through booking operations.");
      return;
    }
    if (nextStatus === "ready_pickup") {
      const range = getOrderDateRange(order);
      const isEarly = Boolean(range && toDateKey(todayLocal()) < toDateKey(range.end));
      if (isEarly && !earlyCheckoutApproved) {
        if (staffAccessRole !== "owner" && staffAccessRole !== "admin") {
          setNotice("Only an Owner or Admin can approve checkout before the booked checkout date.");
          return;
        }
        setEarlyCheckoutOrderId(order.orderId);
        return;
      }
    }
    if (!canMoveOrderTo(order, nextStatus)) {
      const range = getOrderDateRange(order);
      const message = nextStatus === "staying" && Math.max(0, order.paid || 0) <= 0
        ? t({ en: "A verified payment is required before checking in this booking.", zh: "此预约须先有已核实付款，才可办理入住。" })
        : nextStatus === "staying" && range && toDateKey(todayLocal()) < toDateKey(range.start)
        ? `Check-in is available from ${shortDate(range.start)}.`
        : nextStatus === "completed" && (order.balance || 0) > 0
        ? "Collect the outstanding balance before completing this booking."
        : "This booking cannot move to that status from its current stage.";
      setNotice(message);
      return;
    }
    const updated = await updateHostOrder(order, (current) => ({
      ...current,
      status: nextStatus,
      cancelledAt: nextStatus === "cancelled" ? new Date().toISOString() : current.cancelledAt
    }), false, earlyCheckoutApproved);
    if (updated) setNotice(`Booking updated to ${bookingStatus(updated)}.`);
  }

  function recalculateHostOrder(order: VillaOrder & OrderWithOwner) {
    const startDate = order.startDateISO || toDateKey(todayLocal());
    const endDate = order.service === "daycare" ? startDate : order.endDateISO || startDate;
    const dateMath = bookingDays(startDate, endDate);
    const daycareHours = order.service === "daycare"
      ? hostTimeHours(order.startTime || "09:00", order.endTime || "17:00")
      : 0;
    const petCount = Math.max(1, order.pets.length);
    const subtotal = calculateServiceSubtotal({
      service: order.service,
      startDate: toDateKey(dateMath.start),
      endDate: order.service === "daycare" ? toDateKey(dateMath.start) : toDateKey(dateMath.end),
      hours: order.service === "daycare" ? daycareHours : 0,
      petCount,
      settings: {
        boardingRate: Number(hostSettings.boardingRate) || 35,
        daycareRate: Number(hostSettings.daycareRate) || 5,
        specialDateRates: hostSettings.specialDateRates
      }
    });
    const totalDiscount = Math.min(subtotal, Math.max(0, order.voucherDiscount || 0) + Math.max(0, order.manualDiscount || 0));
    const total = Math.max(0, subtotal - totalDiscount);
    const paid = Math.min(total, Math.max(0, order.paid || 0));
    const balance = Math.max(0, total - paid);
    return {
      ...order,
      serviceLabel: order.service === "overnight" ? "Overnight Boarding" : "Daycare",
      dateLabel: order.service === "daycare"
        ? `${hostBusinessDateLabel(startDate)} · ${hostTimeLabel(order.startTime || "09:00")} – ${hostTimeLabel(order.endTime || "17:00")}`
        : formatDateRange(dateMath.start, dateMath.end),
      startDateISO: toDateKey(dateMath.start),
      endDateISO: order.service === "daycare" ? toDateKey(dateMath.start) : toDateKey(dateMath.end),
      nights: order.service === "overnight" ? dateMath.days : 0,
      hours: order.service === "daycare" ? daycareHours : 0,
      subtotal,
      total,
      deposit: order.service === "daycare" || total < 50 ? 0 : 50,
      paid,
      balance,
      status: balance === 0 && order.status === "balance" ? "confirmed" as const : order.status
    };
  }

  function openOrderEditor(order: VillaOrder) {
    if (isVoidedOrder(order)) {
      setNotice("Voided records are read-only.");
      return;
    }
    setOrderEditForm({
      service: order.service,
      startDate: order.startDateISO || toDateKey(getOrderDateRange(order)?.start || todayLocal()),
      endDate: order.endDateISO || toDateKey(getOrderDateRange(order)?.end || todayLocal()),
      startTime: order.startTime || "09:00",
      endTime: order.endTime || "17:00",
      petIds: order.pets.map((pet) => pet.id).filter(Boolean),
      specialRequest: order.specialRequest || "",
      manualDiscount: String(Math.max(0, order.manualDiscount || 0))
    });
    setOrderEditOpen(true);
  }

  async function saveOrderEdit() {
    if (!selectedOrder || !orderEditForm) return;
    if (isVoidedOrder(selectedOrder)) {
      setOrderEditOpen(false);
      setNotice("Voided records are read-only.");
      return;
    }
    if (!orderEditForm.startDate || (orderEditForm.service === "overnight" && !orderEditForm.endDate)) {
      setNotice("Choose the booking date before saving.");
      return;
    }
    if (orderEditForm.service === "overnight" && orderEditForm.endDate < orderEditForm.startDate) {
      setNotice("Check-out date cannot be before check-in date.");
      return;
    }
    if (orderEditForm.service === "daycare" && hostTimeHours(orderEditForm.startTime, orderEditForm.endTime) < 1) {
      setNotice("Daycare end time must be after the start time.");
      return;
    }
    if (!selectedOrderCustomer || orderEditForm.petIds.length === 0) {
      setNotice("Keep at least one pet on this booking.");
      return;
    }
    const selectedPets = orderEditForm.petIds
      .map((petId) => selectedOrderCustomer.dogs.find((dog) => dog.id === petId))
      .filter((dog): dog is PetProfile => Boolean(dog))
      .map((dog) => ({ id: dog.id, name: dog.name, breed: dog.breed, weight: dog.weight, photoDataUrl: dog.photoDataUrl }));
    if (selectedPets.length !== orderEditForm.petIds.length) {
      setNotice("One or more selected pets no longer belong to this customer. Refresh before saving.");
      return;
    }
    const updated = await updateHostOrder(selectedOrder, (order) => recalculateHostOrder({
      ...order,
      service: orderEditForm.service,
      startDateISO: orderEditForm.startDate,
      endDateISO: orderEditForm.service === "daycare" ? orderEditForm.startDate : orderEditForm.endDate,
      startTime: orderEditForm.service === "daycare" ? orderEditForm.startTime : undefined,
      endTime: orderEditForm.service === "daycare" ? orderEditForm.endTime : undefined,
      pets: selectedPets,
      manualDiscount: Math.max(0, Number(orderEditForm.manualDiscount) || 0),
      specialRequest: orderEditForm.specialRequest.trim()
    }));
    if (!updated) return;
    setOrderEditOpen(false);
    setNotice("Booking details updated and customer totals recalculated.");
  }

  function openSafeVoid(order: VillaOrder) {
    if (!isPrimaryOwner) {
      setNotice("Only the active Primary Owner can void a record.");
      return;
    }
    if (isVoidedOrder(order)) {
      setNotice("This record is already voided.");
      return;
    }
    setVoidOrderForm({ reasonCode: "test_order", reason: "", confirmation: "", acknowledged: false });
  }

  async function confirmSafeVoid() {
    if (!selectedOrder || !voidOrderForm || voidOrderSaving) return;
    if (!isPrimaryOwner) {
      setNotice("Only the active Primary Owner can void a record.");
      return;
    }
    const validationError = validateSafeVoidRequest(voidOrderForm);
    if (validationError) {
      setNotice(validationError);
      return;
    }

    setVoidOrderSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase?.auth.getSession() || { data: { session: null }, error: null };
      const token = data.session?.access_token;
      if (error || !token) throw new Error("Your Host session expired. Please sign in again.");

      if (!selectedOrder.orderRowId) throw new Error("This order is missing its authoritative database ID. Refresh and try again.");
      const response = await fetch(`/api/host/orders/${encodeURIComponent(selectedOrder.orderRowId)}/void`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(voidOrderForm)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The order could not be voided.");

      setVoidOrderForm(null);
      setOrderEditOpen(false);
      await refreshHostData();
      setSelectedOrderId(orderSelectionKey(selectedOrder));
      setNotice("Record voided. Original status and financial values remain preserved in the audit view.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The order could not be voided.");
    } finally {
      setVoidOrderSaving(false);
    }
  }

  function ensureCustomerThread(customer?: CustomerRecord, navigate = true) {
    if (!customer || typeof window === "undefined") return "";
    const threadId = `thread-${customer.id}`;
    const current = readChatThreads();
    const existing = current.find((thread) => thread.id === threadId);
    if (existing) {
      setSelectedThreadId(existing.id);
      setMessages(existing.messages);
      if (navigate) scrollToHostSection("messages");
      return existing.id;
    }
    const nextThread: ChatThread = {
      id: threadId,
      userId: customer.id,
      userName: customer.name,
      userPhone: customer.phone,
      updatedAt: new Date().toISOString(),
      messages: []
    };
    window.localStorage.setItem(chatThreadsKey(), JSON.stringify([nextThread, ...current]));
    setThreads(readChatThreads());
    setSelectedThreadId(threadId);
    setMessages([]);
    if (navigate) scrollToHostSection("messages");
    return threadId;
  }

  async function setOffDay(date: Date, shouldBlock: boolean) {
    const key = toDateKey(date);
    const confirmed = window.confirm(
      shouldBlock
        ? `Mark ${shortDate(date)} as Full? Customers will no longer be able to select this date.`
        : `Reopen ${shortDate(date)}? Customers will be able to select this date again.`
    );
    if (!confirmed) return;
    setCalendarSavingDay(key);
    try {
      const next = await setHostOffDay(key, shouldBlock);
      setOffDays(next);
      setNotice(`${shortDate(date)} is now ${shouldBlock ? "Full" : "Available"} and synced to the customer calendar.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Calendar availability could not be updated.");
    } finally {
      setCalendarSavingDay("");
    }
  }

  function handlePhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoForm((current) => ({ ...current, imageUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  function selectDiaryCustomer(customerId: string) {
    const customerOrders = diaryOrders.filter((order) => ownerForOrder(order).id === customerId);
    const firstOrder = customerOrders[0];
    setDiaryCustomerId(customerId);
    setDiaryPetId(firstOrder?.pets[0]?.id || firstOrder?.pets[0]?.name || "");
    setDiaryOrderId(firstOrder?.orderId || "");
    setEditingDiaryId("");
    setDiaryForm(blankDiaryForm());
    setDiaryFiles([]);
  }

  function selectDiaryPet(petId: string) {
    const matchingOrder = customerDiaryOrders.find((order) => order.pets.some((pet) => (pet.id || pet.name) === petId));
    setDiaryPetId(petId);
    setDiaryOrderId(matchingOrder?.orderId || "");
    setEditingDiaryId("");
    setDiaryForm(blankDiaryForm());
    setDiaryFiles([]);
  }

  function selectDiaryOrder(orderId: string) {
    const order = customerDiaryOrders.find((item) => item.orderId === orderId) || diaryOrders.find((item) => item.orderId === orderId);
    if (order) setDiaryCustomerId(ownerForOrder(order).id);
    setDiaryOrderId(orderId);
    if (!order?.pets.some((pet) => (pet.id || pet.name) === diaryPetId)) {
      setDiaryPetId(order?.pets[0]?.id || order?.pets[0]?.name || "");
    }
  }

  function openPrivateDiary(customer: CustomerRecord, petId = "", orderId = "") {
    const customerOrders = diaryOrders.filter((order) => ownerForOrder(order).id === customer.id);
    const targetOrder = customerOrders.find((order) => order.orderId === orderId)
      || customerOrders.find((order) => petId && order.pets.some((pet) => (pet.id || pet.name) === petId))
      || customerOrders[0];
    const targetPet = targetOrder?.pets.find((pet) => (pet.id || pet.name) === petId) || targetOrder?.pets[0];
    setDiaryCustomerId(customer.id);
    setDiaryCustomerSearch("");
    setDiaryPetId(targetPet?.id || targetPet?.name || petId);
    setDiaryOrderId(targetOrder?.orderId || "");
    setDiaryHistoryOrder(orderId);
    setDiaryHistoryPet(petId);
    setDiaryHistoryDate("");
    setEditingDiaryId("");
    setDiaryForm(blankDiaryForm());
    setDiaryFiles([]);
    setActiveWorkspace("diary");
    setSidebarOpen(false);
    if (!targetOrder) setNotice(`${customer.name} has no confirmed, active, or completed booking eligible for Private Diary.`);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function editDiaryEntry(entry: PetDiaryUpdate) {
    const order = diaryOrders.find((item) => item.orderId === entry.orderId);
    if (order) {
      setDiaryCustomerId(entry.ownerId);
      setDiaryOrderId(entry.orderId);
      setDiaryPetId(entry.petId);
    }
    setEditingDiaryId(entry.id);
    setDiaryForm({
      mood: entry.mood,
      mealNotes: entry.mealNotes,
      waterNotes: entry.waterNotes,
      activityNotes: entry.activityNotes,
      toiletNotes: entry.toiletNotes,
      healthNotes: entry.healthNotes,
      medicationNotes: entry.medicationNotes,
      careNotes: entry.careNotes,
      reminderNotes: entry.reminderNotes,
      body: entry.body,
      healthAlert: entry.healthAlert
    });
    setDiaryFiles([]);
    setNotice(`Editing ${entry.petName}'s diary update.`);
    window.requestAnimationFrame(() => document.querySelector(".host-diary-composer")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function cancelDiaryEdit() {
    setEditingDiaryId("");
    setDiaryFiles([]);
    setDiaryForm(blankDiaryForm());
  }

  function handleDiaryFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    const supported = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);
    const invalid = files.find((file) => !supported.has(file.type));
    if (invalid) {
      setNotice("Diary media must be JPG, PNG, WEBP, MP4 or MOV.");
      return;
    }
    setDiaryFiles(files);
  }

  async function publishDiaryUpdate() {
    if (!diaryConfiguration.configured) {
      setNotice(diaryConfiguration.error || "Private Diary database is not configured.");
      return;
    }
    if (!selectedDiaryOrder || !selectedDiaryOwner?.id || !selectedDiaryPet) {
      setNotice("Choose a booking, customer, and pet before publishing an update.");
      return;
    }
    if (!diaryForm.body.trim()) {
      setNotice("Add a short care update for the customer.");
      return;
    }
    if (!editingDiaryId && diaryFiles.length === 0) {
      setNotice("Add at least one pet photo or video before publishing.");
      return;
    }
    setDiaryPublishing(true);
    try {
      const input = {
        ownerId: selectedDiaryOwner.id,
        orderId: selectedDiaryOrder.orderId,
        bookingId: selectedDiaryOrder.bookingId,
        petId: selectedDiaryPet.id || selectedDiaryPet.name,
        petName: selectedDiaryPet.name,
        customerName: selectedDiaryOwner.name,
        mood: diaryForm.mood,
        mealNotes: diaryForm.mealNotes.trim(),
        waterNotes: diaryForm.waterNotes.trim(),
        activityNotes: diaryForm.activityNotes.trim(),
        toiletNotes: diaryForm.toiletNotes.trim(),
        healthNotes: diaryForm.healthNotes.trim(),
        medicationNotes: diaryForm.medicationNotes.trim(),
        careNotes: diaryForm.careNotes.trim(),
        reminderNotes: diaryForm.reminderNotes.trim(),
        body: diaryForm.body.trim(),
        healthAlert: diaryForm.healthAlert
      };
      const editingEntry = diaryEntries.find((entry) => entry.id === editingDiaryId);
      const result = editingEntry
        ? await updatePetDiaryUpdate(editingEntry, input, diaryFiles)
        : await savePetDiaryUpdate(input, diaryFiles);
      setDiaryEntries((current) => [result.entry, ...current.filter((entry) => entry.id !== result.entry.id)]);
      if (!editingEntry) await updateHostOrder(selectedDiaryOrder, (order) => ({ ...order, photosAvailable: (order.photosAvailable || 0) + 1 }));
      setDiaryFiles([]);
      setDiaryForm(blankDiaryForm());
      setEditingDiaryId("");
      setNotice(result.persisted
        ? `${selectedDiaryPet.name}'s private Diary is synced to ${selectedDiaryOwner.name}'s account.`
        : `${selectedDiaryPet.name}'s Diary is saved on this device only. Apply the Diary migration for cross-device sync.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Diary update could not be saved.");
    } finally {
      setDiaryPublishing(false);
    }
  }

  async function removeDiaryEntry(entry: PetDiaryUpdate) {
    if (!window.confirm(`Delete ${entry.petName}'s Diary update? This cannot be undone.`)) return;
    try {
      const result = await deletePetDiaryUpdate(entry);
      setDiaryEntries((current) => current.filter((item) => item.id !== entry.id));
      const order = orders.find((item) => item.orderId === entry.orderId);
      if (order) await updateHostOrder(order, (item) => ({ ...item, photosAvailable: Math.max(0, (item.photosAvailable || 0) - 1) }));
      if (editingDiaryId === entry.id) cancelDiaryEdit();
      setNotice(result.persisted ? "Diary update deleted from the customer account." : "Local Diary update deleted from this device.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Diary update could not be deleted.");
    }
  }

  async function publishPhoto() {
    if (!photoForm.petName.trim()) {
      setNotice(t({ en: "Please add a pet name before publishing.", zh: "发布前请填写宠物名字。" }));
      return;
    }
    try {
      const nextPhotos = await saveGuestPhoto({
        petName: photoForm.petName.trim(),
        breed: photoForm.breed.trim() || "Small dog",
        caption: photoForm.caption.trim() || "Happy guest at Pet Villa.",
        imageUrl: photoForm.imageUrl || hostPhotoPlaceholder,
        visibleOnHome: true,
        color: "#f0b46e"
      });
      setPhotoForm({ petName: "", breed: "", caption: "", imageUrl: "" });
      setPhotos(nextPhotos);
      setNotice(t({ en: "Happy Guest photo published to Home.", zh: "Happy Guests 照片已发布到首页。" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gallery photo could not be published.");
    }
  }

  async function toggleGuestPhoto(photo: GuestPhoto) {
    try {
      setPhotos(await updateGuestPhoto(photo.id, { visibleOnHome: !photo.visibleOnHome }));
      setNotice(photo.visibleOnHome ? "Gallery photo hidden from Home." : "Gallery photo published on Home.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gallery visibility could not be changed.");
    }
  }

  async function publishReview() {
    if (!reviewForm.name.trim() || !reviewForm.en.trim()) {
      setNotice(t({ en: "Please add reviewer name and review text.", zh: "请填写顾客名字和评价内容。" }));
      return;
    }
    const payload = {
      name: reviewForm.name.trim(),
      pet: [reviewForm.dogName, reviewForm.breed].filter(Boolean).join(" · ") || "Small dog",
      dogName: reviewForm.dogName.trim() || "Pet",
      breed: reviewForm.breed.trim() || "Small dog",
      date: reviewForm.date,
      rating: reviewForm.rating,
      photo: reviewForm.photo,
      quote: { en: reviewForm.en.trim(), zh: reviewForm.zh.trim() || reviewForm.en.trim() }
    };
    const existing = reviews.find((review) => review.id === editingReviewId);
    let nextReviews: PublicReview[];
    try {
      nextReviews = existing
        ? await updateReview({ ...existing, ...payload })
        : await saveHostReview(payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Review could not be saved.");
      return;
    }
    setReviewForm({ name: "", dogName: "", breed: "", rating: 5, en: "", zh: "", date: new Date().toISOString().slice(0, 10), photo: "" });
    setEditingReviewId("");
    setReviews(nextReviews);
    setNotice(existing ? "Review changes saved." : t({ en: "Review published to Home.", zh: "评价已发布到首页。" }));
  }

  function editReview(review: PublicReview) {
    setEditingReviewId(review.id);
    setReviewForm({
      name: review.name,
      dogName: review.dogName || review.pet,
      breed: review.breed || "",
      rating: review.rating,
      en: review.quote.en,
      zh: review.quote.zh,
      date: review.date,
      photo: review.photo || ""
    });
    document.getElementById("host-review-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function toggleReviewVisibility(review: PublicReview) {
    try {
      const nextReviews = review.hidden ? await showReview(review.id) : await hideReview(review.id);
      setReviews(nextReviews);
      setNotice(review.hidden ? t({ en: "Review is visible on Home again.", zh: "评价已重新显示在首页。" }) : t({ en: "Review hidden from Home.", zh: "评价已从首页隐藏。" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Review visibility could not be changed.");
    }
  }

  async function removeReview(review: PublicReview) {
    try {
      setReviews(await deleteReview(review));
      setNotice(t({ en: "Review deleted.", zh: "评价已删除。" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Review could not be deleted.");
    }
  }

  async function sendHostReply() {
    if (!reply.trim() || !selectedThreadId || replySending) return;
    setReplySending(true);
    try {
      await sendMessage("host", reply, selectedThreadId);
      setReply("");
      const [nextMessages, nextThreads] = await Promise.all([
        loadMessages(selectedThreadId),
        loadChatThreads()
      ]);
      setMessages(nextMessages);
      setThreads(nextThreads);
    } catch {
      setNotice("Reply was not sent because Supabase could not save it. Please try again.");
    } finally {
      setReplySending(false);
    }
  }

  async function sendNotificationDraft() {
    if (!notificationDraft.trim()) {
      setNotice("Write a notification message before sending.");
      return;
    }
    if (!selectedThreadId) {
      setNotice("Choose a customer in Inbox first. Broadcast push and WhatsApp delivery require an external provider connection.");
      return;
    }
    try {
      await sendMessage("host", notificationDraft.trim(), selectedThreadId);
      setNotificationDraft("");
      const [nextMessages, nextThreads] = await Promise.all([
        loadMessages(selectedThreadId),
        loadChatThreads()
      ]);
      setMessages(nextMessages);
      setThreads(nextThreads);
      setNotice("Message sent to the selected customer's website inbox.");
    } catch {
      setNotice("Message was not sent because Supabase could not save it. Please try again.");
    }
  }

  async function saveHostSettings() {
    try {
      const result = await saveBusinessSettings(hostSettings);
      setNotice(result.persisted
        ? "Business settings saved and synced to the customer checkout."
        : "Development fallback saved on this device only.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Business settings could not be saved to Supabase.");
    }
  }

  async function handlePaymentQrUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPaymentQrUploading(true);
    try {
      const next = await uploadBusinessPaymentQr(file, hostSettings);
      setHostSettings(next);
      setNotice("Payment QR updated and synced to customer checkout.");
    } catch (error) {
      console.warn(error);
      setNotice("Payment QR could not be synced. Apply the Host operations migration and confirm this account has Host access.");
    } finally {
      setPaymentQrUploading(false);
      event.target.value = "";
    }
  }

  function openCreateBooking(customer?: CustomerRecord) {
    const owner = customer || selectedCustomer || customers[0];
    const dog = owner?.dogs[0];
    setBookingForm({
      requestId: hostBookingRequestId(),
      mode: owner ? "existing" : "new",
      customerId: owner?.id || "",
      customerSource: owner?.customerSource || "auth",
      customerName: owner?.name || "",
      customerPhone: owner?.phone || "",
      customerEmail: owner?.email || "",
      dogId: dog?.id || "",
      dogIds: dog?.id ? [dog.id] : [],
      dogName: "",
      dogBreed: "",
      dogAvatar: dogAvatarSrc(dogAvatarOptions[0].id),
      service: "overnight",
      startDate: toDateKey(todayLocal()),
      endDate: toDateKey(todayLocal()),
      startTime: "09:00",
      endTime: "17:00",
      discount: "0",
      paid: "0"
    });
    setBookingModalOpen(true);
  }

  async function saveHostBooking() {
    if (hostBookingSaving) return;
    const existingCustomer = bookingForm.mode === "existing" ? activeBookingCustomer : undefined;
    const customerName = bookingForm.mode === "existing" ? existingCustomer?.name || "" : bookingForm.customerName.trim();
    const customerPhone = bookingForm.mode === "existing" ? existingCustomer?.phone || "" : bookingForm.customerPhone.trim();
    const customerEmail = bookingForm.mode === "existing" ? existingCustomer?.email || "" : bookingForm.customerEmail.trim();
    const newDogName = bookingForm.dogName.trim();
    if (bookingForm.mode === "existing" && !existingCustomer) {
      setNotice("Select an existing customer before creating the booking.");
      return;
    }
    if (!customerName || !customerPhone) {
      setNotice("Customer name and phone are required. Email is optional.");
      return;
    }
    if (activeBookingDogs.length === 0 && !newDogName) {
      setNotice("Select or add at least one pet before creating the booking.");
      return;
    }
    if (!bookingForm.startDate || (bookingForm.service === "overnight" && !bookingForm.endDate)) {
      setNotice("Choose the booking date before continuing.");
      return;
    }
    if (bookingForm.service === "overnight" && bookingForm.endDate < bookingForm.startDate) {
      setNotice("Check-out date cannot be before check-in date.");
      return;
    }
    if (bookingForm.service === "daycare" && bookingDaycareHours < 1) {
      setNotice("Daycare end time must be after the start time.");
      return;
    }
    setHostBookingSaving(true);
    try {
      const result = await createHostBookingAsHost({
        requestId: bookingForm.requestId,
        mode: bookingForm.mode,
        customerId: bookingForm.mode === "existing" ? bookingForm.customerId : undefined,
        customerSource: bookingForm.mode === "existing" ? bookingForm.customerSource : undefined,
        customerName,
        customerPhone,
        customerEmail,
        petIds: activeBookingDogs.map((dog) => dog.id),
        newPet: newDogName ? { name: newDogName, breed: bookingForm.dogBreed.trim(), photoDataUrl: bookingForm.dogAvatar } : null,
        service: bookingForm.service,
        startDate: bookingForm.startDate,
        endDate: bookingForm.service === "daycare" ? bookingForm.startDate : bookingForm.endDate,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        paid: bookingPaid,
        discount: bookingDiscount
      }) as { orderId?: string; alreadyCreated?: boolean };
      await refreshHostData();
      setBookingModalOpen(false);
      setNotice(result.alreadyCreated
        ? `Booking ${result.orderId || ""} was already saved. No duplicate order was created.`
        : `Booking ${result.orderId || ""} created and saved permanently.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Booking could not be saved. No local booking was created.");
    } finally {
      setHostBookingSaving(false);
    }
  }

  async function testHostAlert() {
    const unlocked = await unlockHostAlertAudio();
    if (!unlocked || !playHostAlert()) {
      setNotice("Browser audio is unavailable. Host operations continue normally.");
    }
  }

  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const accountingMonthLabel = accountingMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const calendarLeadingDays = days[0]?.getDay() || 0;
  const calendarTrailingDays = (7 - ((calendarLeadingDays + days.length) % 7)) % 7;
  const previousMonthLastDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0).getDate();
  const managedOrders = managedDay ? ordersForDate(orders, managedDay) : [];
  const managedPetCount = managedDay ? confirmedPetsForDate(orders, managedDay) : 0;
  const managedKey = managedDay ? toDateKey(managedDay) : "";
  const managedOff = managedDay ? offDays.includes(managedKey) : false;
  const selectedOrderOwner = selectedOrder ? ownerForOrder(selectedOrder) : null;
  const selectedOrderCustomer = selectedOrderOwner && selectedOrder
    ? customers.find((customer) => customer.id === selectedOrder.customerId && customer.customerSource === (selectedOrder.customerSource || "auth"))
      || customers.find((customer) => customer.phone === selectedOrderOwner.phone || (selectedOrderOwner.email && customer.email === selectedOrderOwner.email))
    : undefined;

  return (
    <div className="host-console">
      <HostLanguageRuntime language={hostLanguage} />
      {sidebarOpen ? <button type="button" aria-label="Close menu" className="host-sidebar-scrim" onClick={() => setSidebarOpen(false)} /> : null}
      <aside className={`host-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="host-brand">
          <img src="/petvilla-app-badge.webp" alt="Pet Villa" />
          <div><strong>Pet Villa</strong><span>Ipoh Operations</span></div>
        </div>
        <div className="host-profile-card">
          <img src="/avatars/human-04.png" alt="Host profile" />
          <div><strong>Pet Villa Team</strong><span>Business owner</span></div>
          <i aria-hidden="true" />
        </div>
        <nav className="host-sidebar-nav" aria-label="Host workspaces">
          {HOST_NAV_GROUPS.map((group) => (
            <div key={group.label.en} className="host-nav-group">
              <p>{t(group.label)}</p>
              {group.items.filter((item) => canViewWorkspace(item.id)).map((item) => item.href ? (
                <a key={item.id} href={item.href}>
                  <span className="host-nav-icon"><HostIcon name={item.icon} /></span>
                  <span>{t(item.label)}</span>
                </a>
              ) : (
                <button key={item.id} type="button" className={activeWorkspace === item.id ? "is-active" : ""} onClick={() => { setActiveWorkspace(item.id as HostWorkspace); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <span className="host-nav-icon"><HostIcon name={item.icon} /></span>
                  <span>{t(item.label)}</span>
                  {item.id === "messages" && unreadThreads.length ? <b>{unreadThreads.length}</b> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="host-support-card">
          <span>{t({ en: "Need a customer view?", zh: "需要查看顾客网页？" })}</span>
          <strong>{t({ en: "Open the live Pet Villa site", zh: "打开 Pet Villa 正式网页" })}</strong>
          <a href="/" target="_blank" rel="noreferrer">{t({ en: "View website", zh: "查看网页" })}</a>
        </div>
      </aside>

      <main className="host-main" data-host-readonly={activeWorkspaceReadOnly ? "true" : "false"}>
        <header className="host-topbar">
          <div className="host-title-row">
            <button type="button" className="host-mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><HostIcon name="menu" /></button>
            <div>
              <h1>{t(HOST_WORKSPACE_TITLES[activeWorkspace].title)}</h1>
              <p>{t(HOST_WORKSPACE_TITLES[activeWorkspace].description)}</p>
            </div>
          </div>
          <div className="host-topbar-actions">
            <label className="host-search"><HostIcon name="search" /><input placeholder={t({ en: "Search orders, customers, pets...", zh: "搜索订单、顾客、宠物..." })} onChange={(event) => { setBookingSearch(event.target.value); setCustomerSearch(event.target.value); setDogSearch(event.target.value); }} /></label>
            <div className="host-language-switch" role="group" aria-label="Host language">
              <button type="button" data-active={hostLanguage === "en" || undefined} onClick={() => changeHostLanguage("en")}>EN</button>
              <button type="button" data-active={hostLanguage === "zh" || undefined} onClick={() => changeHostLanguage("zh")}>中文</button>
            </div>
            {canViewWorkspace("notifications") ? <button type="button" className="host-top-icon" aria-label="Notifications" onClick={() => setActiveWorkspace("notifications")}><HostIcon name="notifications" />{unreadThreads.length ? <i /> : null}</button> : null}
            {canViewWorkspace("settings") ? <button type="button" className="host-top-avatar" aria-label="Business settings" onClick={() => setActiveWorkspace("settings")}><img src="/avatars/human-04.png" alt="" /></button> : null}
            <button type="button" className="host-logout-button" onClick={async () => {
              await getSupabaseBrowserClient()?.auth.signOut();
              clearAuthPersistence();
              window.location.replace("/host/login");
            }}>{t({ en: "Logout", zh: "登出" })}</button>
          </div>
        </header>

        {!hostDataLoaded ? <p className="host-notice" role="status">{t({ en: "Loading live Host data...", zh: "正在载入实时营业资料..." })}</p> : null}
        <span className="sr-only" aria-live="polite">{hostRefreshing ? "Syncing live operations" : ""}</span>
        {notice ? <p className="host-notice">{notice}</p> : null}
        {magicLinkNotice ? <aside className="host-magic-password-notice" role="status"><div><strong>You signed in using a secure link.</strong><span>Set a password so you can use regular login next time.</span></div><button type="button" onClick={() => { window.sessionStorage.removeItem(HOST_MAGIC_LINK_NOTICE_KEY); setMagicLinkNotice(false); setSettingsTab("security"); setActiveWorkspace("settings"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Set Password</button><button type="button" className="is-dismiss" aria-label="Dismiss" onClick={() => { window.sessionStorage.removeItem(HOST_MAGIC_LINK_NOTICE_KEY); setMagicLinkNotice(false); }}>&times;</button></aside> : null}

        <div className={activeWorkspace === "dashboard" ? "host-workspace" : "hidden"}>
          <section className="host-welcome-panel">
            <div>
              <span>{dashboardWindow.label}</span>
              <h2>{t({ en: "Everything your villa needs today.", zh: "今天的营业重点，一目了然。" })}</h2>
              <p>{t({ en: "Move from new bookings to payments, guest care, and customer replies without losing your place.", zh: "从新预约、付款、宠物照顾到顾客回复，都可顺畅处理。" })}</p>
              <div className="host-welcome-actions">
                {canManage("bookings.manage") ? <button type="button" className="host-primary-action" onClick={() => openCreateBooking()}>{t({ en: "Create booking", zh: "建立预约" })}</button> : null}
                <button type="button" className="host-secondary-action" onClick={() => setActiveWorkspace("calendar")}>{t({ en: "Open calendar", zh: "打开日历" })}</button>
              </div>
            </div>
            <img src="/petvilla-dashboard-banner.webp" alt="Pet Villa host and dogs" />
          </section>

          <section className="host-date-control host-range-control">
            <div><strong>{t({ en: "Operations overview", zh: "营业期间总览" })}</strong><span>{t({ en: "Review one day or compare recent operating periods.", zh: "查看单日或比较近期营业期间。" })}</span></div>
            <div className="host-range-segments" role="group" aria-label="Dashboard report period">
              {([
                ["today", "Today"],
                ["this-week", "This Week"],
                ["last-week", "Last Week"],
                ["this-month", "This Month"],
                ["last-month", "Last Month"],
                ["custom", "Custom"]
              ] as Array<[DashboardRange, string]>).map(([value, label]) => <button key={value} type="button" data-active={dashboardRange === value || undefined} onClick={() => { setDashboardRange(value); if (value === "today") setVisibleMonth(todayLocal()); }}>{t({ en: label, zh: ({ Today: "今天", "This Week": "本周", "This Month": "本月", "Last Week": "上周", "Last Month": "上月", Custom: "自选" } as Record<string, string>)[label] || label })}</button>)}
            </div>
            {dashboardRange === "custom" ? <div className="host-custom-period-range">
              <label>{t({ en: "From", zh: "开始日期" })}<input type="date" value={dashboardCustomFrom} max={dashboardCustomTo || undefined} onChange={(event) => { const value = event.target.value; setDashboardCustomFrom(value); if (value && (!dashboardCustomTo || value > dashboardCustomTo)) setDashboardCustomTo(value); if (value) setVisibleMonth(new Date(`${value}T00:00:00`)); }} /></label>
              <span aria-hidden="true">→</span>
              <label>{t({ en: "To", zh: "结束日期" })}<input type="date" value={dashboardCustomTo} min={dashboardCustomFrom || undefined} onChange={(event) => setDashboardCustomTo(event.target.value)} /></label>
            </div> : null}
            <div className="host-selected-date-range"><span>{t({ en: "Selected date range", zh: "当前统计日期" })}</span><strong>{dashboardRangeLabel}</strong></div>
          </section>

          <section className="host-kpi-section" data-scope="period">
            <div className="host-kpi-section-heading"><div><span>{t({ en: "Selected period", zh: "所选期间" })}</span><h3>{dashboardRangeLabel}</h3></div><small>{t({ en: "Operational activity within this date range", zh: "此日期范围内的营业活动" })}</small></div>
            <div className="host-stat-grid" data-columns="4">
              {[
                { en: "Check-ins", zh: "入住", value: dayCheckIns.length, action: () => { setBookingSearch(reportKey); setBookingStatusFilter(""); scrollToHostSection("booking-center"); } },
                { en: "Check-outs", zh: "退房", value: dayCheckOuts.length, action: () => { setBookingSearch(reportKey); setBookingStatusFilter(""); scrollToHostSection("booking-center"); } },
                { en: "Bookings", zh: "预约", value: selectedPeriodBookings.length, action: () => { setBookingSearch(""); setBookingStatusFilter(""); scrollToHostSection("booking-center"); } },
                { en: "Booked Pets", zh: "已预约宠物", value: reportPetCount, action: () => { if (dashboardFrom === dashboardTo) setManagedDay(reportDay); else setActiveWorkspace("calendar"); } }
              ].map((card, index) => <button key={card.en} type="button" onClick={card.action} data-tone={index}><span>{t({ en: card.en, zh: card.zh })}</span><strong>{card.value}</strong><small>{t({ en: "Selected period", zh: "所选期间" })}</small></button>)}
            </div>
          </section>

          <div className="host-dashboard-scope-grid">
            <section className="host-kpi-section" data-scope="current">
              <div className="host-kpi-section-heading"><div><span>{t({ en: "Current operations", zh: "当前营运" })}</span><h3>{t({ en: "Live business status", zh: "实时营业状态" })}</h3></div><small>{t({ en: "Not affected by the period selector", zh: "不受期间选择影响" })}</small></div>
              <div className="host-stat-grid" data-columns="3">
                {[
                  { en: "At the Villa", zh: "目前在 Villa", value: inStayOrders.length, subEn: "Checked in, not checked out", subZh: "已入住，尚未退房", action: () => { setBookingStatusFilter("active"); scrollToHostSection("booking-center"); } },
                  { en: "Current Outstanding", zh: "当前未收余额", value: money(balanceDue), subEn: "Balance still to collect", subZh: "仍待收取的余额", action: () => scrollToHostSection("payments") },
                  { en: "Unread Messages", zh: "未读消息", value: unreadThreads.length, subEn: "Needs a reply", subZh: "等待回复", action: () => scrollToHostSection("messages") }
                ].map((card, index) => <button key={card.en} type="button" onClick={card.action} data-tone={index + 1}><span>{t({ en: card.en, zh: card.zh })}</span><strong>{card.value}</strong><small>{t({ en: card.subEn, zh: card.subZh })}</small></button>)}
              </div>
            </section>
            <section className="host-kpi-section" data-scope="finance">
              <div className="host-kpi-section-heading"><div><span>{t({ en: "Finance snapshot", zh: "财务快照" })}</span><h3>{t({ en: "Fixed reporting windows", zh: "固定统计期间" })}</h3></div><small>{t({ en: "Today and current month", zh: "今日与本月" })}</small></div>
              <div className="host-stat-grid" data-columns="2">
                {[
                  { en: "Today Sales", zh: "今日已收款", value: money(todaySales), subEn: "Today only", subZh: "仅限今日" },
                  { en: "This Month Collected", zh: "本月已收款", value: money(monthRevenue), subEn: accountingMonthLabel, subZh: accountingMonthLabel }
                ].map((card, index) => <button key={card.en} type="button" onClick={() => scrollToHostSection("payments")} data-tone={index + 2}><span>{t({ en: card.en, zh: card.zh })}</span><strong>{card.value}</strong><small>{t({ en: card.subEn, zh: card.subZh })}</small></button>)}
              </div>
            </section>
          </div>

          <section className="host-dashboard-lower">
            <article className="host-operating-card">
              <div className="host-panel-heading"><div><h2>{t({ en: "Quick actions", zh: "快捷操作" })}</h2><p>{t({ en: "Common tasks, one click away.", zh: "常用工作，一键直达。" })}</p></div></div>
              <div className="host-quick-grid">
              {[
                ["Create Booking", "建立预约", () => openCreateBooking()],
                ["Find Customer", "查找顾客", () => scrollToHostSection("customers")],
                ["Open Messages", "打开消息", () => scrollToHostSection("messages")],
                ["Manage Calendar", "管理日历", () => scrollToHostSection("calendar-capacity")],
                ["Add Review", "新增评价", () => scrollToHostSection("reviews")],
                ["Upload Diary", "发布日记", () => scrollToHostSection("gallery")]
              ].map(([en, zh, action]) => (
                <button key={String(en)} type="button" onClick={action as () => void}>{t({ en: String(en), zh: String(zh) })}</button>
              ))}
              </div>
            </article>
            <article className="host-operating-card host-today-list">
              <div className="host-panel-heading"><div><h2>{t({ en: "Today at the villa", zh: "目前在 Villa" })}</h2><p>{t({ en: `${inStayOrders.length} checked-in ${inStayOrders.length === 1 ? "booking" : "bookings"} currently in our care.`, zh: `目前有 ${inStayOrders.length} 笔已入住预约由我们照顾。` })}</p></div><button type="button" onClick={() => { setBookingStatusFilter("active"); setActiveWorkspace("bookings"); }}>{t({ en: "See bookings", zh: "查看预约" })}</button></div>
              {inStayOrders.map((order) => <button key={`${orderSelectionKey(order)}-${order.startDateISO}`} type="button" onClick={() => setSelectedOrderId(orderSelectionKey(order))}><img src={dogAvatarSrc(order.pets[0]?.photoDataUrl)} alt={order.pets[0]?.name || "Pet"} /><span><strong>{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</strong><small>{ownerForOrder(order).name} · {orderRangeLabel(order)}</small></span><b>{t({ en: "In stay", zh: "寄宿中" })}</b></button>)}
              {inStayOrders.length === 0 ? <div className="host-empty-row"><strong>{t({ en: "No pets currently checked in", zh: "目前没有已入住宠物" })}</strong><span>{t({ en: "Bookings appear here after Check In and remain until Check Out.", zh: "完成入住后会显示在这里，直至实际退房。" })}</span></div> : null}
            </article>
          </section>
        </div>

          <section id="messages" className={activeWorkspace === "messages" ? "host-operating-card host-workspace host-inbox-workspace" : "hidden"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="host-section-eyebrow">Customer conversations</span>
                <h2 className="section-title">Messages Inbox</h2>
                <p className="body-copy mt-1">Reply, review the customer record, and move straight into their booking.</p>
              </div>
              <span className="host-inbox-count" data-active={unreadThreads.length > 0 || undefined}>{unreadThreads.length ? `${unreadThreads.length} unread` : "All caught up"}</span>
            </div>
            <div className="host-inbox-grid">
              <div className="host-conversation-list">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div><strong className="block text-sm text-villa-text-primary">Conversations</strong><span className="text-[10px] font-bold text-villa-text-muted">Newest activity first</span></div>
                  <span className="host-list-count">{threads.length}</span>
                </div>
                <div className="grid max-h-[560px] content-start gap-2 overflow-auto pr-1">
                  {threads.map((thread) => (
                    <button key={thread.id} type="button" className="host-conversation-row" data-active={thread.id === selectedThreadId || undefined} onClick={() => setSelectedThreadId(thread.id)}>
                      <span className="host-conversation-identity">
                        <span className="host-conversation-avatar">{thread.userName.trim().charAt(0).toUpperCase() || "C"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-villa-text-primary">{thread.userName}</span>
                          <span className="block truncate text-[10px] font-bold text-villa-text-muted">{thread.userPhone || "Pet Villa customer"}</span>
                        </span>
                        {thread.messages.at(-1)?.from === "owner" ? <span className="host-new-pill">New</span> : null}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-villa-text-secondary">{thread.messages.at(-1)?.text || "No message yet"}</span>
                      <span className="mt-1 block text-[10px] font-black text-villa-text-muted">{thread.messages.at(-1)?.createdAt ? shortDateFromISO(thread.messages.at(-1)?.createdAt) : "No time"}</span>
                    </button>
                  ))}
                  {threads.length === 0 ? <div className="host-inbox-empty"><span>...</span><strong>No conversations yet</strong><small>New website messages will appear here.</small></div> : null}
                </div>
              </div>

              <div className="host-chat-panel">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-villa-primary-light pb-3">
                  <div>
                    <strong className="block text-base text-villa-text-primary">{selectedThread?.userName || "Select a chat"}</strong>
                    <span className="text-xs font-bold text-villa-text-secondary">{selectedThreadCustomer?.phone || selectedThread?.userPhone || "No phone"} · {selectedThreadCustomer?.email || "No email"}</span>
                  </div>
                  {selectedThreadCustomer ? (
                    <button type="button" className="host-chat-link" onClick={() => {
                      setSelectedCustomerId(selectedThreadCustomer.id);
                      scrollToHostSection("customers");
                    }}>Open CRM</button>
                  ) : null}
                </div>
                <div className="host-chat-stream">
                  {messages.map((message) => (
                    <div key={message.id} className="host-chat-message" data-from={message.from}>
                      <div className="host-chat-bubble" data-from={message.from}>{message.text}</div>
                      <span>{message.from === "host" ? "Pet Villa" : selectedThread?.userName || "Customer"} · {message.createdAt ? shortDateFromISO(message.createdAt) : "Now"}</span>
                    </div>
                  ))}
                  {messages.length === 0 ? <div className="host-chat-empty"><span>...</span><strong>Select a conversation</strong><small>Messages and customer context will appear together here.</small></div> : null}
                </div>
                <div className="host-chat-composer">
                  <input value={reply} disabled={replySending} onChange={(event) => setReply(event.target.value)} placeholder="Reply as host..." onKeyDown={(event) => { if (event.key === "Enter") void sendHostReply(); }} />
                  <button type="button" disabled={replySending || !reply.trim()} onClick={() => void sendHostReply()}>{replySending ? "Sending..." : "Send"}</button>
                </div>
              </div>

              <aside className="host-chat-customer-card">
                <span className="host-section-eyebrow">At a glance</span>
                <h3 className="card-title">Customer Card</h3>
                {selectedThreadCustomer ? (
                  <div className="mt-4 grid gap-3 text-sm font-bold">
                    <div className="host-chat-customer-identity">
                      <span>{selectedThreadCustomer.name.trim().charAt(0).toUpperCase() || "C"}</span>
                      <div><strong className="block text-villa-text-primary">{selectedThreadCustomer.name}</strong>
                      <span className="mt-1 block text-xs text-villa-text-secondary">{selectedThreadCustomer.phone || "No phone"}</span>
                      <span className="block text-xs text-villa-text-secondary">{selectedThreadCustomer.email || "No email"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <span className="rounded-[14px] bg-villa-primary-bg p-3"><b className="block text-lg">{selectedChatDogs.length}</b>Dogs</span>
                      <span className="rounded-[14px] bg-villa-primary-bg p-3"><b className="block text-lg">{selectedChatOrders.length}</b>Orders</span>
                      <span className="rounded-[14px] bg-villa-primary-bg p-3"><b className="block text-lg">{money(selectedChatBalance)}</b>Balance</span>
                    </div>
                    <div className="rounded-[16px] bg-villa-primary-bg p-3">
                      <strong className="text-xs uppercase text-villa-text-secondary">Dogs</strong>
                      <div className="mt-2 grid gap-1 text-xs">
                        {selectedChatDogs.slice(0, 4).map((dog) => <span key={dog.id}>{dog.name} · {dog.breed || "Small dog"}</span>)}
                        {selectedChatDogs.length === 0 ? <span>No dogs saved.</span> : null}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                        setSelectedCustomerId(selectedThreadCustomer.id);
                        scrollToHostSection("customers");
                      }}>Open CRM</button>
                      <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                        setBookingSearch(selectedThreadCustomer.name);
                        setBookingStatusFilter("");
                        scrollToHostSection("booking-center");
                      }}>Open Orders</button>
                      <button type="button" className="villa-button px-3 py-2 text-xs" onClick={() => openCreateBooking(selectedThreadCustomer)}>Create Booking</button>
                    </div>
                  </div>
                ) : (
                  <p className="body-copy mt-3 text-xs">Select a customer chat to view phone, email, dogs, orders, and outstanding balance.</p>
                )}
              </aside>
            </div>
          </section>

          <section className="grid gap-5">
              <div className={activeWorkspace === "payments" ? "host-workspace host-payments-workspace grid gap-5 lg:grid-cols-2" : "hidden"}>
                <article id="payments" className="host-operating-card host-revenue-overview">
                  <div className="host-panel-heading"><div><span>{t({ en: "Financial position", zh: "财务概况" })}</span><h2>{t({ en: "Sales & collection overview", zh: "销售与收款总览" })}</h2><p>{t({ en: "One clear view of sales, discounts, collected money and balances due.", zh: "清楚查看销售、优惠、已收款与待收余额。" })}</p></div>{canManage("payments.manage") ? <button type="button" className="host-finance-add-expense" onClick={openExpenseRecorder}>{t({ en: "Record expense", zh: "记录支出" })}</button> : null}</div>
                  <div className="host-finance-metrics">
                    <button type="button" data-tone="purple"><span>{t({ en: "Original Total", zh: "原价总额" })}</span><strong>{money(originalSalesTotal)}</strong><small>{t({ en: "Before discounts", zh: "优惠前" })}</small></button>
                    <button type="button" data-tone="gold"><span>{t({ en: "Discount", zh: "优惠总额" })}</span><strong>{money(totalOffersGiven)}</strong><small>{t({ en: "All applied discounts", zh: "所有已应用优惠" })}</small></button>
                    <button type="button" data-tone="mint"><span>{t({ en: "Total Sales", zh: "销售总额" })}</span><strong>{money(totalSales)}</strong><small>{t({ en: "After discounts", zh: "优惠后" })}</small></button>
                    <button type="button" data-tone="purple"><span>{t({ en: "Collected", zh: "已收款" })}</span><strong>{money(totalPaidRevenue)}</strong><small>{t({ en: `${paidOrderCollections(orders).length} paid orders`, zh: `${paidOrderCollections(orders).length} 笔已收款订单` })}</small></button>
                    <button type="button" data-tone="coral"><span>{t({ en: "Outstanding", zh: "待收余额" })}</span><strong>{money(balanceDue)}</strong><small>{t({ en: `${outstandingOrders.length} orders need follow-up`, zh: `${outstandingOrders.length} 笔订单待跟进` })}</small></button>
                  </div>
                  <section className="host-cash-position" aria-label={t({ en: "Cash position", zh: "现金状况" })}>
                    <header><div><span>{t({ en: "Cash position", zh: "现金状况" })}</span><h3>{t({ en: "Collected money after recorded expenses", zh: "已收款扣除已记录支出" })}</h3></div><small>{t({ en: "Operational cash view, not a bank balance", zh: "营业现金视图，并非银行余额" })}</small></header>
                    <div>
                      <article data-tone="coral"><span>{t({ en: "Expenses", zh: "支出" })}</span><strong>{expensesLoaded ? expenseMoney(expenseMetrics.overallExpenses) : t({ en: "Unavailable", zh: "暂不可用" })}</strong><small>{t({ en: `${expenses.length} permanent records`, zh: `${expenses.length} 笔永久记录` })}</small></article>
                      <article data-tone="mint"><span>{t({ en: "Cash On Hand", zh: "手上现金" })}</span><strong>{expensesLoaded ? expenseMoney(expenseMetrics.cashOnHand) : t({ en: "Unavailable", zh: "暂不可用" })}</strong><small>{t({ en: "Overall collected minus expenses", zh: "总已收款减去支出" })}</small></article>
                    </div>
                  </section>
                  <section className="host-collection-performance host-period-business-report">
                    <header className="host-period-report-heading">
                      <div><span>{t({ en: "Period Business Report", zh: "期间营业报表" })}</span><h3>{t({ en: "Business activity by its real event date", zh: "按真实营业事件日期统计" })}</h3><p>{t({ en: "Orders, completed stays and verified collections use separate, honest date cohorts.", zh: "订单、完成住宿和已核实收款分别采用各自真实日期统计。" })}</p></div>
                      <div className="host-period-report-range"><span>{t({ en: "Selected period", zh: "已选期间" })}</span><strong>{collectionPeriodTitle}</strong><b>{collectionCalendarLabel}</b><small>{collectionRangeLabel}</small></div>
                    </header>
                    <div className="host-collection-period-control">
                      <div className="host-range-segments" role="group" aria-label="Period business report period">
                        {([
                          ["today", "Today", "今天"],
                          ["this-week", "This Week", "本周"],
                          ["last-week", "Last Week", "上周"],
                          ["this-month", "This Month", "本月"],
                          ["last-month", "Last Month", "上月"],
                          ["custom", "Custom", "自选"]
                        ] as Array<[DashboardRange, string, string]>).map(([value, en, zh]) => <button key={value} type="button" data-active={collectionRange === value || undefined} onClick={() => setCollectionRange(value)}>{t({ en, zh })}</button>)}
                      </div>
                    </div>
                    {collectionRange === "custom" ? <div className="host-custom-report">
                      <label><span>{t({ en: "From", zh: "开始日期" })}</span><input type="date" value={reportFrom} max={reportTo || undefined} onChange={(event) => { const value = event.target.value; setReportFrom(value); if (value && (!reportTo || value > reportTo)) setReportTo(value); }} aria-label="Revenue report start date" /></label>
                      <label><span>{t({ en: "To", zh: "结束日期" })}</span><input type="date" value={reportTo} min={reportFrom || undefined} onChange={(event) => setReportTo(event.target.value)} aria-label="Revenue report end date" /></label>
                    </div> : null}
                    <div className="host-period-report-sections">
                      <section className="host-period-report-section" data-report="new-business">
                        <header><div><span>01</span><h4>{t({ en: "New Business", zh: "新增业务" })}</h4></div><p>{t({ en: "Order Recorded Date", zh: "订单建立日期" })}</p></header>
                        <div className="host-period-report-cards" data-columns="5">
                          <article data-tone="gold"><span>{t({ en: "Original Value", zh: "原价总额" })}</span><strong>{money(periodBusinessReport.newBusiness.originalValue)}</strong><small>{t({ en: "Before discounts", zh: "优惠前" })}</small></article>
                          <article data-tone="purple"><span>{t({ en: "Discount", zh: "优惠" })}</span><strong>{money(periodBusinessReport.newBusiness.discount)}</strong><small>{t({ en: "Voucher + manual", zh: "优惠券及手动优惠" })}</small></article>
                          <article data-tone="mint"><span>{t({ en: "Booked Sales", zh: "预订销售额" })}</span><strong>{money(periodBusinessReport.newBusiness.bookedSales)}</strong><small>{t({ en: "After discounts", zh: "优惠后" })}</small></article>
                          <article data-tone="coral"><span>{t({ en: "New Orders", zh: "新订单" })}</span><strong>{periodBusinessReport.newBusiness.newOrders}</strong><small>{t({ en: "Recorded in period", zh: "期间建立" })}</small></article>
                          <article data-tone="sky"><span>{t({ en: "Booked Pets", zh: "预订宠物" })}</span><strong>{periodBusinessReport.newBusiness.bookedPets}</strong><small>{t({ en: "Across new orders", zh: "来自新订单" })}</small></article>
                        </div>
                      </section>

                      <section className="host-period-report-section" data-report="service-performance">
                        <header><div><span>02</span><h4>{t({ en: "Service Performance", zh: "服务表现" })}</h4></div><p>{t({ en: "Actual Completed / Check Out Date", zh: "实际完成 / 退房日期" })}</p></header>
                        <div className="host-period-report-cards" data-columns="3">
                          <article data-tone="mint"><span>{t({ en: "Completed Sales", zh: "完成销售额" })}</span><strong>{money(periodBusinessReport.servicePerformance.completedSales)}</strong><small>{t({ en: "Completed stays only", zh: "仅完成住宿" })}</small></article>
                          <article data-tone="gold"><span>{t({ en: "Completed Orders", zh: "完成订单" })}</span><strong>{periodBusinessReport.servicePerformance.completedOrders}</strong><small>{t({ en: "Real checkout workflow", zh: "真实退房流程" })}</small></article>
                          <article data-tone="sky"><span>{t({ en: "Completed Pets", zh: "完成寄宿宠物" })}</span><strong>{periodBusinessReport.servicePerformance.completedPets}</strong><small>{t({ en: "Checked out in period", zh: "期间已退房" })}</small></article>
                        </div>
                      </section>

                      <section className="host-period-report-section" data-report="cash-collection">
                        <header><div><span>03</span><h4>{t({ en: "Cash Collection", zh: "收款" })}</h4></div><p>{t({ en: "Collection Date / Month Attribution", zh: "收款日期 / 月份归属" })}</p></header>
                        <div className="host-period-report-cards" data-columns="3">
                          <article data-tone="purple"><span>{t({ en: "Collected", zh: "已收款" })}</span><strong>{money(periodBusinessReport.cashCollection.collected)}</strong><small>{t({ en: "Verified events + confirmed legacy month attribution", zh: "核实付款事件 + 已确认历史月份归属" })}</small></article>
                          <article data-tone="coral"><span>{t({ en: "Expenses", zh: "支出" })}</span><strong>{expensesLoaded ? expenseMoney(expenseMetrics.periodExpenses) : t({ en: "Unavailable", zh: "暂不可用" })}</strong><small>{t({ en: "By expense date", zh: "按支出日期" })}</small></article>
                          <article data-tone="mint"><span>{t({ en: "Net Cash", zh: "净现金" })}</span><strong>{expensesLoaded ? expenseMoney(expenseMetrics.periodNetCash) : t({ en: "Unavailable", zh: "暂不可用" })}</strong><small>{t({ en: "Collected minus expenses", zh: "已收款减去支出" })}</small></article>
                        </div>
                      </section>
                    </div>
                    <p className="host-period-report-note">{t({ en: "Exact Host verification dates remain precise. Confirmed legacy collections are included only when the selected range contains their full attributed month.", zh: "Host 核实日期保持精确；已确认的历史收款仅在所选范围完整包含其归属月份时计入。" })}</p>
                  </section>
                </article>

                <article className="host-operating-card host-customer-balances">
                  <div className="host-panel-heading"><div><span>{t({ en: "Customer-level summary", zh: "顾客汇总" })}</span><h2>{t({ en: "Customer balances", zh: "顾客待收余额" })}</h2><p>{t({ en: "Outstanding totals combined across each customer's orders.", zh: "按顾客汇总其所有订单的待收余额。" })}</p></div><span>{t({ en: `${paymentCustomers.length} customers`, zh: `${paymentCustomers.length} 位顾客` })}</span></div>
                  <input value={paymentCustomerSearch} onChange={(event) => setPaymentCustomerSearch(event.target.value)} placeholder={t({ en: "Search customer, phone or pet...", zh: "搜索顾客、电话或宠物..." })} />
                  <div className="host-customer-balance-list">
                    {paymentCustomers.slice(0, 8).map((customer) => <button key={customer.id} type="button" onClick={() => { setSelectedCustomerId(customer.id); setActiveWorkspace("customers"); }}><span><strong>{customer.name}</strong><small>{t({ en: `${customer.orders.length} orders`, zh: `${customer.orders.length} 笔订单` })} · {customer.dogs.map((dog) => dog.name).join(", ") || t({ en: "No saved pet", zh: "未有宠物资料" })} · {t({ en: `Paid ${money(customer.paid)}`, zh: `已收 ${money(customer.paid)}` })}</small></span><b><small>{t({ en: "Outstanding", zh: "待收" })}</small>{money(customer.outstanding)}</b></button>)}
                    {paymentCustomers.length === 0 ? <p>{t({ en: "No matching outstanding customer balances.", zh: "没有符合条件的顾客待收余额。" })}</p> : null}
                  </div>
                </article>
              </div>

              <section className={activeWorkspace === "payments" ? "host-operating-card host-workspace host-outstanding-workspace" : "hidden"}>
                <div className="host-panel-heading"><div><span>{t({ en: "Order-level actions", zh: "订单收款操作" })}</span><h2>{t({ en: "Collection desk", zh: "收款工作台" })}</h2><p>{t({ en: "Current outstanding orders. Verify or confirm money only after it reaches your bank.", zh: "当前仍待收的订单。确认款项到账后才核实或确认收款。" })}</p></div><span>{t({ en: `${money(balanceDue)} due`, zh: `待收 ${money(balanceDue)}` })}</span></div>
                <div className="overflow-auto rounded-[14px] border border-villa-primary-light bg-white">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="text-xs uppercase text-villa-text-secondary"><tr className="border-b border-villa-primary-light"><th className="py-3">{t({ en: "Order", zh: "订单" })}</th><th>{t({ en: "Customer / Pet", zh: "顾客 / 宠物" })}</th><th>{t({ en: "Stay", zh: "入住期间" })}</th><th>{t({ en: "Payment", zh: "付款状态" })}</th><th>{t({ en: "Total Sales", zh: "销售总额" })}</th><th>{t({ en: "Paid", zh: "已收" })}</th><th>{t({ en: "Outstanding", zh: "待收" })}</th><th>{t({ en: "Action", zh: "操作" })}</th></tr></thead>
                    <tbody>{outstandingOrders.map((order) => <tr key={orderSelectionKey(order)} className="border-b border-villa-primary-light/60 font-bold"><td className="py-3"><strong>{order.orderId}</strong></td><td><strong>{ownerForOrder(order).name}</strong><small className="block text-villa-text-muted">{order.pets.map((pet) => pet.name).join(", ") || t({ en: "Pet", zh: "宠物" })}</small></td><td>{orderRangeLabel(order)}</td><td>{order.paymentSubmission ? <span className="host-payment-status is-review">{t({ en: `Verify ${money(order.paymentSubmission.amount)}`, zh: `核实 ${money(order.paymentSubmission.amount)}` })}</span> : <span className="host-payment-status">{t({ en: "Balance due", zh: "尚有余额" })}</span>}</td><td>{money(order.total)}</td><td className="text-emerald-700">{money(collectedAmount(order))}</td><td className="text-red-600">{money(outstandingAmount(order))}</td><td><div className="host-payment-row-actions"><button type="button" onClick={() => setSelectedOrderId(orderSelectionKey(order))}>{t({ en: "Manage", zh: "管理" })}</button><button type="button" onClick={() => { const customer = customers.find((item) => item.id === ownerForOrder(order).id); if (customer) { ensureCustomerThread(customer, true); setActiveWorkspace("messages"); } }}>{t({ en: "Contact", zh: "联系" })}</button><button type="button" data-primary onClick={() => void openPaymentConfirmation(order, order.paymentSubmission ? "submission" : "balance")}>{order.paymentSubmission ? t({ en: "Verify Payment", zh: "核实付款" }) : t({ en: `Confirm ${money(outstandingAmount(order))} Paid`, zh: `确认收款 ${money(outstandingAmount(order))}` })}</button></div></td></tr>)}</tbody>
                  </table>
                  {outstandingOrders.length === 0 ? <p className="body-copy m-4">{t({ en: "No outstanding balances.", zh: "目前没有待收余额。" })}</p> : null}
                </div>
              </section>

              <section className={activeWorkspace === "payments" ? "host-operating-card host-workspace host-recent-expenses" : "hidden"}>
                <div className="host-panel-heading"><div><span>{t({ en: "Permanent expense records", zh: "永久支出记录" })}</span><h2>{t({ en: "Recent expenses", zh: "近期支出" })}</h2><p>{t({ en: "Recorded operating expenses are read-only and remain in the business audit history.", zh: "已记录的营业支出为只读，并永久保留在营业审计记录中。" })}</p></div><span>{expensesLoaded ? t({ en: `${expenses.length} records`, zh: `${expenses.length} 笔记录` }) : t({ en: "Unavailable", zh: "暂不可用" })}</span></div>
                <div className="host-expense-list">
                  {(expensesExpanded ? expenses : expenses.slice(0, 5)).map((expense) => <article key={expense.id}><time>{hostBusinessDateLabel(expense.expenseDate)}</time><span><strong>{t({ en: expense.category.replaceAll("_", " "), zh: expense.category === "utilities" ? "水电杂费" : expense.category === "supplies" ? "用品" : expense.category === "maintenance" ? "维修" : expense.category === "transport" ? "交通" : "其他" })}</strong><small>{expense.note || t({ en: "No note", zh: "无备注" })}</small></span><b>{expenseMoney(expense.amount)}</b></article>)}
                  {expensesLoaded && expenses.length === 0 ? <p>{t({ en: "No expenses recorded yet.", zh: "尚未记录支出。" })}</p> : null}
                  {!expensesLoaded ? <p>{t({ en: "Expense records could not be loaded. Existing financial data has been kept.", zh: "无法载入支出记录，现有财务资料已保留。" })}</p> : null}
                </div>
                {expenses.length > 5 ? <button type="button" className="host-history-toggle" aria-expanded={expensesExpanded} onClick={() => setExpensesExpanded((value) => !value)}>{expensesExpanded ? t({ en: "Show recent only", zh: "只显示近期记录" }) : t({ en: `View all ${expenses.length} records`, zh: `查看全部 ${expenses.length} 笔记录` })}</button> : null}
              </section>

              <section className={activeWorkspace === "payments" ? "host-operating-card host-workspace host-collections-workspace" : "hidden"}>
                <div className="host-panel-heading"><div><span>Payment traceability</span><h2>Order Collections</h2><p>Verified amounts recorded on each order. This is an order-level collection history, not a bank transaction ledger.</p></div><span>{collectionOrders.length} records</span></div>
                <input className="villa-input mb-4" value={collectionSearch} onChange={(event) => setCollectionSearch(event.target.value)} placeholder="Search order ID, customer or pet..." />
                <div className="overflow-auto rounded-[14px] border border-villa-primary-light bg-white">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="text-xs uppercase text-villa-text-secondary"><tr className="border-b border-villa-primary-light"><th className="py-3 pl-3">Order recorded</th><th>Order ID</th><th>Customer</th><th>Pet / Pets</th><th>Booking dates</th><th>Order status</th><th>Payment status</th><th>Original</th><th>Discount</th><th>Total sales</th><th>Collected</th><th>Outstanding</th></tr></thead>
                    <tbody>{(collectionsExpanded ? collectionOrders : collectionOrders.slice(0, 10)).map((order) => <tr key={orderSelectionKey(order)} className="border-b border-villa-primary-light/60 font-bold"><td className="py-3 pl-3">{shortDateFromISO(order.createdAt)}</td><td><button type="button" className="font-black text-villa-primary underline decoration-villa-primary/30 underline-offset-4" onClick={() => setSelectedOrderId(orderSelectionKey(order))}>{order.orderId}</button></td><td>{ownerForOrder(order).name}</td><td>{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</td><td>{orderRangeLabel(order)}</td><td><span className={`host-payment-status ${order.status === "cancelled" ? "is-review" : ""}`}>{bookingStatus(order)}</span></td><td><HostPaymentStatus order={order} showAmounts={false} /></td><td>{money(originalOrderAmount(order))}</td><td>{money(discountAmount(order))}</td><td>{money(order.total)}</td><td className="text-emerald-700">{money(collectedAmount(order))}</td><td className={outstandingAmount(order) > 0 ? "text-red-600" : "text-villa-text-secondary"}>{money(outstandingAmount(order))}</td></tr>)}</tbody>
                  </table>
                  {collectionOrders.length === 0 ? <p className="body-copy m-4">No matching paid order records.</p> : null}
                </div>
                {collectionOrders.length > 10 ? <button type="button" className="host-history-toggle" aria-expanded={collectionsExpanded} onClick={() => setCollectionsExpanded((value) => !value)}>{collectionsExpanded ? t({ en: "Show recent only", zh: "只显示近期记录" }) : t({ en: `View all ${collectionOrders.length} records`, zh: `查看全部 ${collectionOrders.length} 笔记录` })}</button> : null}
              </section>

              <section id="customers" className={activeWorkspace === "customers" ? "host-operating-card host-workspace host-crm-workspace host-crm-v2" : "hidden"}>
                <div className="host-crm-heading">
                  <div><span>Customer operations</span><h2>CRM Command Center</h2><p>Registered accounts, pets, stays, payments and care history in one workspace.</p></div>
                  <div><b>{filteredCustomers.length} customers</b><button type="button" onClick={openHostCustomerEditor}>+ Customer</button><button type="button" onClick={openRegisteredCustomerEditor}>+ Login account</button></div>
                </div>

                {customerEditOpen && customerEditMode === "registered" ? <div className="host-crm-editor host-account-editor"><div><span>Registered login account</span><strong>Creates a real Supabase Auth customer. The customer can sign in with the ID and temporary password you provide.</strong></div><input value={customerEditForm.name} onChange={(event) => setCustomerEditForm({ ...customerEditForm, name: event.target.value })} placeholder="Full name" /><input value={customerEditForm.phone} onChange={(event) => setCustomerEditForm({ ...customerEditForm, phone: event.target.value })} placeholder="Login phone, e.g. +6011..." /><input value={customerEditForm.email} onChange={(event) => setCustomerEditForm({ ...customerEditForm, email: event.target.value })} placeholder="Login email (recommended)" /><input type="password" value={customerEditForm.password} onChange={(event) => setCustomerEditForm({ ...customerEditForm, password: event.target.value })} placeholder="Temporary password, minimum 8 characters" /><button type="button" onClick={() => void saveCustomerEdit()}>Create login account</button><button type="button" className="is-quiet" onClick={() => setCustomerEditOpen(false)}>Cancel</button></div> : null}
                {customerEditOpen && customerEditMode === "host" ? <div className="host-crm-editor is-temporary"><div><span>Host-managed customer</span><strong>Permanent customer profile for phone or counter bookings. No login account is created.</strong></div><input value={customerEditForm.name} onChange={(event) => setCustomerEditForm({ ...customerEditForm, name: event.target.value })} placeholder="Customer name (required)" /><input value={customerEditForm.phone} onChange={(event) => setCustomerEditForm({ ...customerEditForm, phone: event.target.value })} placeholder="Phone (required)" /><input value={customerEditForm.email} onChange={(event) => setCustomerEditForm({ ...customerEditForm, email: event.target.value })} placeholder="Email (optional)" /><button type="button" onClick={() => void saveCustomerEdit()}>Save customer</button><button type="button" className="is-quiet" onClick={() => setCustomerEditOpen(false)}>Cancel</button></div> : null}

                <div className="host-crm-layout">
                  <aside className="host-crm-directory">
                    <label className="host-crm-search"><HostIcon name="search" /><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Name, phone, email, pet or order ID" /></label>
                    <div className="host-crm-customer-list">
                      {filteredCustomers.map((customer) => {
                        const currentCount = customer.orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;
                        const outstanding = customer.orders.reduce((sum, order) => order.status === "cancelled" ? sum : sum + Math.max(0, order.balance || 0), 0);
                        return <button key={customer.id} type="button" data-active={selectedCustomer?.id === customer.id || undefined} onClick={() => selectCrmCustomer(customer.id)}><span className="host-crm-list-avatar">{customer.name.slice(0, 1).toUpperCase()}</span><span><strong>{customer.name}</strong><small>{customer.phone || customer.email || "No contact details"}</small><em>{customer.dogs.length} pets · {currentCount} current orders</em></span><span className={outstanding > 0 ? "has-balance" : "is-clear"}>{outstanding > 0 ? money(outstanding) : "Clear"}</span>{customer.isTemporary ? <i>Temporary</i> : null}</button>;
                      })}
                      {filteredCustomers.length === 0 ? <div className="host-crm-empty"><strong>No matching customer</strong><span>Try a phone number, pet name or order ID.</span></div> : null}
                    </div>
                  </aside>

                  {selectedCustomer ? <article className="host-crm-profile">
                    <header className="host-crm-profile-head"><div className="host-crm-profile-identity"><span>{selectedCustomer.name.slice(0, 1).toUpperCase()}</span><div><div><h3>{selectedCustomer.name}</h3>{selectedCustomer.isTemporary ? <b>Temporary</b> : <b className="is-registered">Registered</b>}</div><p>{selectedCustomer.phone || "No phone"} · {selectedCustomer.email || "No email"}</p><small>Joined {selectedCustomer.registerDate || "-"}</small></div></div><div className="host-crm-primary-actions"><button type="button" onClick={() => openCreateBooking(selectedCustomer)}>Create booking</button><button type="button" className="is-secondary" onClick={() => ensureCustomerThread(selectedCustomer)}>Open inbox</button><button type="button" className="is-secondary" onClick={() => openCustomerEditor(selectedCustomer)}>Edit profile</button></div></header>
                    <div className="host-crm-metrics"><span><small>Pets</small><strong>{selectedCustomer.dogs.length}</strong></span><span><small>Current orders</small><strong>{selectedCustomerCurrentOrders.length}</strong></span><span><small>Paid total</small><strong>{money(selectedCustomerPaid)}</strong></span><span data-alert={selectedCustomerOutstanding > 0 || undefined}><small>Outstanding</small><strong>{money(selectedCustomerOutstanding)}</strong></span></div>
                    <nav className="host-crm-tabs" aria-label="Customer profile sections">{(["overview", "pets", "orders", "payments"] as CrmTab[]).map((tab) => <button key={tab} type="button" data-active={crmTab === tab || undefined} onClick={() => setCrmTab(tab)}>{tab === "overview" ? "Overview" : tab === "pets" ? `Pets (${selectedCustomer.dogs.length})` : tab === "orders" ? `Orders (${selectedCustomer.orders.length})` : "Payments"}</button>)}</nav>

                    {customerEditOpen && customerEditMode === "edit" ? <div className="host-crm-editor"><div><span>Customer profile</span><strong>{selectedCustomer.isTemporary ? "Local temporary profile" : "Changes sync to the registered account"}</strong></div><input value={customerEditForm.name} onChange={(event) => setCustomerEditForm({ ...customerEditForm, name: event.target.value })} placeholder="Full name" /><input value={customerEditForm.phone} onChange={(event) => setCustomerEditForm({ ...customerEditForm, phone: event.target.value })} placeholder="Phone" /><input value={customerEditForm.email} onChange={(event) => setCustomerEditForm({ ...customerEditForm, email: event.target.value })} placeholder="Email" /><button type="button" onClick={() => void saveCustomerEdit()}>Save changes</button><button type="button" className="is-quiet" onClick={() => setCustomerEditOpen(false)}>Cancel</button></div> : null}

                    {crmTab === "overview" ? <div className="host-crm-overview"><section><div className="host-crm-section-title"><div><span>Customer details</span><h4>Contact & verification</h4></div></div><dl className="host-crm-detail-grid"><div><dt>Full name</dt><dd>{selectedCustomer.name}</dd></div><div><dt>Phone</dt><dd>{selectedCustomer.phone || "Not provided"}</dd></div><div><dt>Email</dt><dd>{selectedCustomer.email || "Not provided"}</dd></div><div><dt>Registered</dt><dd>{selectedCustomer.registerDate || "-"}</dd></div><div><dt>Phone verified</dt><dd data-verified={selectedCustomer.phoneVerified || undefined}>{selectedCustomer.phoneVerified ? "Verified" : "Not verified"}</dd></div><div><dt>Email verified</dt><dd data-verified={selectedCustomer.emailVerified || undefined}>{selectedCustomer.emailVerified ? "Verified" : "Not verified"}</dd></div></dl></section><section><div className="host-crm-section-title"><div><span>Customer care</span><h4>Quick actions</h4></div></div><div className="host-crm-action-grid"><button type="button" onClick={() => openAddPetEditor(selectedCustomer)}>Add pet</button><button type="button" onClick={() => openPrivateDiary(selectedCustomer)}>Open Diary</button><button type="button" onClick={() => openPrivateDiary(selectedCustomer)}>Add Diary update</button><button type="button" onClick={() => ensureCustomerThread(selectedCustomer)}>Send message</button></div></section></div> : null}

                    {crmTab === "pets" ? <div className="host-crm-tab-panel"><div className="host-crm-section-title"><div><span>Pet profiles</span><h4>Care records for {selectedCustomer.name}</h4></div><button type="button" onClick={() => openAddPetEditor(selectedCustomer)}>+ Add pet</button></div><div className="host-crm-pet-grid">{selectedCustomer.dogs.map((pet) => { const fullPet = dogs.find((item) => item.ownerId === selectedCustomer.id && item.id === pet.id) || { ...pet, ownerId: selectedCustomer.id, ownerName: selectedCustomer.name, ownerPhone: selectedCustomer.phone, ownerEmail: selectedCustomer.email }; return <article key={pet.id}><a href={dogAvatarSrc(pet.photoDataUrl)} target="_blank" rel="noreferrer" title="Open pet photo"><img src={dogAvatarSrc(pet.photoDataUrl)} alt={pet.name} /></a><div><h5>{pet.name || "Unnamed pet"}</h5><p>{pet.breed || "Breed not set"} · {pet.age || "Age not set"} · {pet.weight ? `${pet.weight}kg` : "Weight not set"}</p><dl><span>Gender<b>{pet.gender || "-"}</b></span><span>Vaccination<b>{pet.vaccinated ? "Vaccinated" : "Not verified"}</b></span><span>Allergies<b>{pet.allergies || "None"}</b></span><span>Medication<b>{pet.medication || "None"}</b></span><span>Diet<b>{[pet.foodBrand, pet.mealsPerDay].filter(Boolean).join(" · ") || "Not recorded"}</b></span><span>Temperament<b>{[pet.friendly && "Friendly", pet.calm && "Calm"].filter(Boolean).join(" · ") || "Not recorded"}</b></span></dl><p className="host-crm-pet-notes">{pet.specialNotes || "No special care notes."}</p><footer><button type="button" onClick={() => openDogEditor(fullPet)}>Edit pet</button><button type="button" className="is-danger" onClick={() => void removePetFromCustomer(selectedCustomer, pet)}>Delete pet</button></footer></div></article>; })}{selectedCustomer.dogs.length === 0 ? <div className="host-crm-empty"><strong>No pets added</strong><span>Add a pet before creating the customer's booking.</span><button type="button" onClick={() => openAddPetEditor(selectedCustomer)}>Add first pet</button></div> : null}</div>
                      {dogEditOpen && dogEditForm ? <div className="host-crm-pet-editor"><div className="host-crm-section-title"><div><span>{dogEditMode === "add" ? "New pet" : "Edit pet"}</span><h4>{dogEditMode === "add" ? `Add a pet for ${selectedCustomer.name}` : dogEditForm.name}</h4></div><button type="button" onClick={() => setDogEditOpen(false)}>Close</button></div><label className="host-crm-pet-photo"><img src={dogAvatarSrc(dogEditForm.photoDataUrl)} alt="Pet preview" /><span>Upload pet photo</span><input type="file" accept="image/*" onChange={handlePetPhotoFile} /></label><PetAvatarPicker value={dogEditForm.photoDataUrl} onChange={(photoDataUrl) => setDogEditForm({ ...dogEditForm, photoDataUrl })} /><div className="host-crm-pet-form"><label>Name<input value={dogEditForm.name} onChange={(event) => setDogEditForm({ ...dogEditForm, name: event.target.value })} /></label><label>Breed<input value={dogEditForm.breed} onChange={(event) => setDogEditForm({ ...dogEditForm, breed: event.target.value })} /></label><label>Age<input value={dogEditForm.age} onChange={(event) => setDogEditForm({ ...dogEditForm, age: event.target.value })} /></label><label>Weight (kg)<input value={dogEditForm.weight} onChange={(event) => setDogEditForm({ ...dogEditForm, weight: event.target.value })} /></label><label>Gender<select value={dogEditForm.gender} onChange={(event) => setDogEditForm({ ...dogEditForm, gender: event.target.value })}><option value="">Select</option><option>Female</option><option>Male</option></select></label><label>Coat colour<input value={dogEditForm.coatColor} onChange={(event) => setDogEditForm({ ...dogEditForm, coatColor: event.target.value })} /></label><label>Food / diet<input value={dogEditForm.foodBrand} onChange={(event) => setDogEditForm({ ...dogEditForm, foodBrand: event.target.value })} /></label><label>Meals per day<input value={dogEditForm.mealsPerDay} onChange={(event) => setDogEditForm({ ...dogEditForm, mealsPerDay: event.target.value })} /></label><label>Allergies<input value={dogEditForm.allergies} onChange={(event) => setDogEditForm({ ...dogEditForm, allergies: event.target.value })} /></label><label>Medication<input value={dogEditForm.medication} onChange={(event) => setDogEditForm({ ...dogEditForm, medication: event.target.value })} /></label><label className="is-wide">Personality & care notes<textarea value={dogEditForm.specialNotes} onChange={(event) => setDogEditForm({ ...dogEditForm, specialNotes: event.target.value })} /></label><div className="host-crm-pet-checks"><label><input type="checkbox" checked={dogEditForm.vaccinated} onChange={(event) => setDogEditForm({ ...dogEditForm, vaccinated: event.target.checked })} />Vaccinated</label><label><input type="checkbox" checked={dogEditForm.neutered} onChange={(event) => setDogEditForm({ ...dogEditForm, neutered: event.target.checked })} />Neutered</label><label><input type="checkbox" checked={dogEditForm.friendly} onChange={(event) => setDogEditForm({ ...dogEditForm, friendly: event.target.checked })} />Friendly</label><label><input type="checkbox" checked={dogEditForm.calm} onChange={(event) => setDogEditForm({ ...dogEditForm, calm: event.target.checked })} />Calm</label></div><button type="button" className="host-primary-action is-wide" onClick={() => void saveDogEdit()}>{dogEditMode === "add" ? "Add pet profile" : "Save pet changes"}</button></div></div> : null}</div> : null}

                    {crmTab === "orders" ? <div className="host-crm-orders"><section><div className="host-crm-section-title"><div><span>In progress</span><h4>Current orders</h4></div><button type="button" onClick={() => openCreateBooking(selectedCustomer)}>+ New booking</button></div>{selectedCustomerCurrentOrders.map((order) => <article key={orderSelectionKey(order)}><div><strong>{order.orderId}</strong><span>{order.serviceLabel} · {orderRangeLabel(order)}</span><small>{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</small></div><div><b>{bookingStatus(order)}</b><span>Total {money(order.total)} · Paid {money(order.paid)}</span><strong data-balance={order.balance > 0 || undefined}>{order.balance > 0 ? `${money(order.balance)} due` : "Paid"}</strong></div><footer><button type="button" onClick={() => setSelectedOrderId(orderSelectionKey(order))}>Modify order</button>{order.balance > 0 ? <button type="button" onClick={() => void openPaymentConfirmation(order, "balance")}>Pay balance</button> : null}</footer></article>)}{selectedCustomerCurrentOrders.length === 0 ? <p className="host-crm-inline-empty">No current orders.</p> : null}</section><section><div className="host-crm-section-title"><div><span>Archive</span><h4>Historical orders</h4></div></div>{selectedCustomerPastOrders.map((order) => <article key={orderSelectionKey(order)}><div><strong>{order.orderId}</strong><span>{order.serviceLabel} · {orderRangeLabel(order)}</span><small>{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</small></div><div><b>{bookingStatus(order)}</b><span>{money(order.total)}</span></div><footer><button type="button" onClick={() => setSelectedOrderId(orderSelectionKey(order))}>View details</button></footer></article>)}{selectedCustomerPastOrders.length === 0 ? <p className="host-crm-inline-empty">No historical orders.</p> : null}</section></div> : null}

                    {crmTab === "payments" ? <div className="host-crm-payments"><div><span>Paid total</span><strong>{money(selectedCustomerPaid)}</strong><small>Recorded across all orders</small></div><div data-alert={selectedCustomerOutstanding > 0 || undefined}><span>Outstanding balance</span><strong>{money(selectedCustomerOutstanding)}</strong><small>{selectedCustomerOutstanding > 0 ? "Action required" : "Account clear"}</small></div><div><span>Offers & discounts</span><strong>{money(selectedCustomerDiscount)}</strong><small>Total discounts applied</small></div><section><div className="host-crm-section-title"><div><span>Order payments</span><h4>Payment history</h4></div></div>{selectedCustomer.orders.map((order) => <button key={orderSelectionKey(order)} type="button" onClick={() => setSelectedOrderId(orderSelectionKey(order))}><span><strong>{order.orderId}</strong><small>{orderRangeLabel(order)}</small></span><span><small>Paid</small><b>{money(order.paid)}</b></span><span data-alert={order.balance > 0 || undefined}><small>Balance</small><b>{money(order.balance)}</b></span></button>)}</section></div> : null}
                  </article> : <div className="host-crm-profile host-crm-empty"><strong>No customer selected</strong><span>Choose a customer from the directory.</span></div>}
                </div>
              </section>

              <section id="customers-legacy" className="hidden" aria-hidden="true">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">Customers CRM</h2>
                    <p className="body-copy mt-1">Owner profile, dogs, order count, last stay, and total spend.</p>
                  </div>
                  <span className="rounded-full bg-villa-primary-bg px-3 py-1 text-xs font-black text-villa-primary">{filteredCustomers.length} customers</span>
                </div>
                <input className="villa-input mt-4" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search name, phone, email, or dog..." />
                <div className="mt-4 max-h-[360px] overflow-auto rounded-[18px] border border-villa-primary-light bg-white">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase text-villa-text-secondary">
                      <tr className="border-b border-villa-primary-light">
                        <th className="py-3">Customer</th><th>Phone</th><th>Email</th><th>Registered</th><th>Dogs</th><th>Orders</th><th>Last Stay</th><th>Total Spend</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b border-villa-primary-light/60 font-bold">
                          <td className="py-3"><button type="button" onClick={() => setSelectedCustomerId(customer.id)} className="text-left text-villa-primary">{customer.name}</button></td>
                          <td>{customer.phone || "-"}</td>
                          <td>{customer.email || "-"}</td>
                          <td>{customer.registerDate || "-"}</td>
                          <td>{customer.dogs.map((dog) => dog.name).join(", ") || "-"}</td>
                          <td>{customer.orders.length}</td>
                          <td>{customer.lastStay}</td>
                          <td>{money(customer.totalSpend)}</td>
                          <td>
                            <div className="flex gap-2">
                              <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => setSelectedCustomerId(customer.id)}>Open</button>
                              <button type="button" className="rounded-pill bg-villa-primary px-3 py-1 text-xs font-black text-white" onClick={() => openCreateBooking(customer)}>Book</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {customers.length === 0 ? <p className="body-copy mt-4">No customer records yet.</p> : null}
                </div>
                {selectedCustomer ? (
                  <article className="mt-4 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="card-title">{selectedCustomer.name}</h3>
                        <p className="mt-1 text-xs font-bold text-villa-text-secondary">{selectedCustomer.phone || "No phone"} · {selectedCustomer.email || "No email"}</p>
                        <p className="mt-1 text-xs font-bold text-villa-text-muted">Registered {selectedCustomer.registerDate || "-"} · Last stay {selectedCustomer.lastStay}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="villa-button-outline bg-white px-4 py-2 text-xs" onClick={() => openCustomerEditor(selectedCustomer)}>Edit Customer</button>
                        <button type="button" className="villa-button-outline bg-white px-4 py-2 text-xs" onClick={() => ensureCustomerThread(selectedCustomer)}>Send Message</button>
                        <button type="button" className="villa-button-outline bg-white px-4 py-2 text-xs" onClick={() => openPrivateDiary(selectedCustomer)}>Open Diary</button>
                        <button type="button" className="host-primary-action px-4 py-2 text-xs" onClick={() => openPrivateDiary(selectedCustomer)}>Add Diary Update</button>
                        <button type="button" className="villa-button px-4 py-2 text-xs" onClick={() => openCreateBooking(selectedCustomer)}>Create Booking</button>
                      </div>
                    </div>
                    <div className="host-crm-summary-grid">
                      <div className="rounded-[14px] bg-white p-3 text-sm font-black">Dogs: {selectedCustomer.dogs.length}</div>
                      <div className="rounded-[14px] bg-white p-3 text-sm font-black">Orders: {selectedCustomer.orders.length}</div>
                      <div className="rounded-[14px] bg-white p-3 text-sm font-black">Paid: {money(selectedCustomerPaid)}</div>
                      <div className={selectedCustomerOutstanding > 0 ? "is-outstanding" : "is-clear"}>Outstanding: {money(selectedCustomerOutstanding)}</div>
                    </div>
                    {customerEditOpen ? (
                      <div className="mt-3 grid gap-3 rounded-[16px] bg-white p-3 sm:grid-cols-3">
                        <input className="villa-input" value={customerEditForm.name} onChange={(event) => setCustomerEditForm({ ...customerEditForm, name: event.target.value })} placeholder="Full name" />
                        <input className="villa-input" value={customerEditForm.phone} onChange={(event) => setCustomerEditForm({ ...customerEditForm, phone: event.target.value })} placeholder="Phone" />
                        <input className="villa-input" value={customerEditForm.email} onChange={(event) => setCustomerEditForm({ ...customerEditForm, email: event.target.value })} placeholder="Email" />
                        <button type="button" className="villa-button sm:col-span-2" onClick={saveCustomerEdit}>Save Customer</button>
                        <button type="button" className="villa-button-outline bg-white" onClick={() => setCustomerEditOpen(false)}>Cancel</button>
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[16px] bg-white p-3">
                        <h4 className="text-sm font-black text-villa-text-primary">Dog List</h4>
                        <div className="mt-2 grid gap-2">
                          {selectedCustomer.dogs.map((dog) => {
                            const fullDogRecord = dogs.find((item) => item.ownerId === selectedCustomer.id && item.id === dog.id) || {
                              ...dog,
                              ownerId: selectedCustomer.id,
                              ownerName: selectedCustomer.name,
                              ownerPhone: selectedCustomer.phone,
                              ownerEmail: selectedCustomer.email,
                            };

                            return (
                            <button key={dog.id} type="button" className="rounded-[12px] bg-villa-primary-bg p-2 text-left text-xs font-bold" onClick={() => openDogEditor(fullDogRecord)}>
                              <span className="block font-black">{dog.name || "Unnamed dog"} - {dog.breed || "Small dog"}</span>
                              <span className="text-villa-text-secondary">{dog.weight || "-"}kg - {dog.vaccinated ? "Vaccinated" : "Not vaccinated"}</span>
                            </button>
                            );
                          })}
                          {selectedCustomer.dogs.length === 0 ? <p className="body-copy text-xs">No dogs yet.</p> : null}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-white p-3">
                        <h4 className="text-sm font-black text-villa-text-primary">Order History</h4>
                        <div className="mt-2 grid max-h-[190px] gap-2 overflow-auto pr-1">
                          {selectedCustomer.orders.map((order) => (
                            <button key={orderSelectionKey(order)} type="button" className="rounded-[12px] bg-villa-primary-bg p-2 text-left text-xs font-bold" onClick={() => setSelectedOrderId(orderSelectionKey(order))}>
                              <span className="block font-black">{order.orderId} - {bookingStatus(order)}</span>
                              <span className="text-villa-text-secondary">{orderRangeLabel(order)} - {money(order.total)}</span>
                            </button>
                          ))}
                          {selectedCustomer.orders.length === 0 ? <p className="body-copy text-xs">No orders yet.</p> : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ) : null}
              </section>

              <section id="dogs-legacy" className="hidden" aria-hidden="true">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title">Dogs Profile</h2>
                  <span className="rounded-full bg-villa-primary-bg px-3 py-1 text-xs font-black text-villa-primary">{filteredDogs.length} dogs</span>
                </div>
                <input className="villa-input mt-4" value={dogSearch} onChange={(event) => setDogSearch(event.target.value)} placeholder="Search dog, breed, owner, or phone..." />
                <div className="mt-4 grid max-h-[520px] gap-3 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDogs.map((dog) => (
                    <article key={`${dog.ownerId}-${dog.id}`} className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                      <div className="flex gap-3">
                        <img src={dogAvatarSrc(dog.photoDataUrl)} alt={dog.name} className="h-16 w-16 rounded-[16px] object-cover" />
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
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => setSelectedDogKey(`${dog.ownerId}-${dog.id}`)}>View Full Profile</button>
                        <button type="button" className="rounded-pill bg-villa-primary px-3 py-1 text-xs font-black text-white" onClick={() => openDogEditor(dog)}>Edit Dog</button>
                      </div>
                    </article>
                  ))}
                  {filteredDogs.length === 0 ? <p className="body-copy">No dog profiles yet.</p> : null}
                </div>
                {selectedDog ? (
                  <article className="mt-4 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4">
                    <h3 className="card-title">{selectedDog.name} Full Profile</h3>
                    <div className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-2 lg:grid-cols-3">
                      <span>Breed: {selectedDog.breed || "-"}</span>
                      <span>Age: {selectedDog.age || "-"}</span>
                      <span>Weight: {selectedDog.weight || "-"}kg</span>
                      <span>Owner: {selectedDog.ownerName}</span>
                      <span>Vaccination: {selectedDog.vaccinated ? "Vaccinated" : "Not verified"}</span>
                      <span>Allergy: {selectedDog.allergies || "None"}</span>
                      <span>Medication: {selectedDog.medication || "None"}</span>
                      <span>Medical record: {selectedDog.medicalRecordName || "Not uploaded"}</span>
                      <span className="sm:col-span-2">Notes: {selectedDog.specialNotes || "No notes"}</span>
                    </div>
                    <button type="button" className="villa-button-outline mt-3 bg-white px-4 py-2 text-xs" onClick={() => openDogEditor(selectedDog)}>Edit Dog</button>
                    {dogEditOpen && dogEditForm ? (
                      <div className="mt-4 grid gap-3 rounded-[16px] bg-white p-3 sm:grid-cols-2">
                        <input className="villa-input" value={dogEditForm.name} onChange={(event) => setDogEditForm({ ...dogEditForm, name: event.target.value })} placeholder="Dog name" />
                        <input className="villa-input" value={dogEditForm.breed} onChange={(event) => setDogEditForm({ ...dogEditForm, breed: event.target.value })} placeholder="Breed" />
                        <input className="villa-input" value={dogEditForm.age} onChange={(event) => setDogEditForm({ ...dogEditForm, age: event.target.value })} placeholder="Age" />
                        <input className="villa-input" value={dogEditForm.weight} onChange={(event) => setDogEditForm({ ...dogEditForm, weight: event.target.value })} placeholder="Weight kg" />
                        <label className="flex items-center gap-2 rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-3 py-3 text-sm font-black">
                          <input type="checkbox" checked={dogEditForm.vaccinated} onChange={(event) => setDogEditForm({ ...dogEditForm, vaccinated: event.target.checked })} />
                          Vaccinated
                        </label>
                        <label className="flex items-center gap-2 rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-3 py-3 text-sm font-black">
                          <input type="checkbox" checked={dogEditForm.neutered} onChange={(event) => setDogEditForm({ ...dogEditForm, neutered: event.target.checked })} />
                          Neutered
                        </label>
                        <input className="villa-input" value={dogEditForm.allergies} onChange={(event) => setDogEditForm({ ...dogEditForm, allergies: event.target.value })} placeholder="Allergy" />
                        <input className="villa-input" value={dogEditForm.medication} onChange={(event) => setDogEditForm({ ...dogEditForm, medication: event.target.value })} placeholder="Medication" />
                        <textarea className="villa-input h-24 py-3 sm:col-span-2" value={dogEditForm.specialNotes} onChange={(event) => setDogEditForm({ ...dogEditForm, specialNotes: event.target.value })} placeholder="Notes" />
                        <label className="grid cursor-pointer place-items-center rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-4 py-3 text-sm font-black text-villa-primary sm:col-span-2">
                          {dogEditForm.medicalRecordName ? `Medical record: ${dogEditForm.medicalRecordName}` : "Upload Medical Record"}
                          <input type="file" accept="image/*,.pdf" className="sr-only" onChange={handleMedicalRecordFile} />
                        </label>
                        <button type="button" className="villa-button" onClick={saveDogEdit}>Save Dog</button>
                        <button type="button" className="villa-button-outline bg-white" onClick={() => setDogEditOpen(false)}>Cancel</button>
                      </div>
                    ) : null}
                  </article>
                ) : null}
              </section>

              <section id="booking-center" className={activeWorkspace === "bookings" ? "host-workspace host-booking-v2" : "hidden"}>
                <div className="host-booking-command">
                  <div>
                    <span className="host-workspace-kicker">{t({ en: "OPERATIONS DESK", zh: "预约营运" })}</span>
                    <h2>{t({ en: "Every stay, one clear workflow.", zh: "每一笔寄宿，都有清楚流程。" })}</h2>
                    <p>{t({ en: "Find an order, verify payment, update the stay, and keep the customer informed.", zh: "查找订单、确认付款、更新寄宿状态并通知顾客。" })}</p>
                  </div>
                  <button type="button" className="host-primary-action" onClick={() => openCreateBooking()}><span>+</span> {t({ en: "New booking", zh: "新增预约" })}</button>
                </div>

                <div className="host-booking-metrics" aria-label="Booking overview">
                  <button type="button" className={!bookingStatusFilter ? "is-active" : ""} onClick={() => setBookingStatusFilter("")}><span>{t({ en: "All bookings", zh: "全部预约" })}</span><strong>{businessOrders.length}</strong><small>{t({ en: "Operational order list", zh: "营业订单列表" })}</small></button>
                  <button type="button" className={bookingStatusFilter === "needs-action" ? "is-active is-warm" : "is-warm"} onClick={() => setBookingStatusFilter("needs-action")}><span>{t({ en: "Needs action", zh: "需要处理" })}</span><strong>{bookingMetrics.needsAction}</strong><small>{t({ en: "Verify or follow up", zh: "确认或跟进" })}</small></button>
                  <button type="button" className={bookingStatusFilter === "active" ? "is-active is-green" : "is-green"} onClick={() => setBookingStatusFilter("active")}><span>{t({ en: "At the villa", zh: "正在寄宿" })}</span><strong>{bookingMetrics.active}</strong><small>{t({ en: "Check-in to pickup", zh: "入住至接回" })}</small></button>
                  <button type="button" className={bookingStatusFilter === "outstanding" ? "is-active is-coral" : "is-coral"} onClick={() => setBookingStatusFilter("outstanding")}><span>{t({ en: "Outstanding", zh: "未结余额" })}</span><strong>{money(bookingMetrics.outstanding)}</strong><small>{t({ en: "Balance to collect", zh: "待收余额" })}</small></button>
                  <button type="button" className={bookingStatusFilter === "voided" ? "is-active is-coral" : "is-coral"} onClick={() => setBookingStatusFilter("voided")}><span>{t({ en: "Voided records", zh: "作废记录" })}</span><strong>{voidedOrders.length}</strong><small>{t({ en: "Read-only audit trail", zh: "只读审计记录" })}</small></button>
                </div>

                <div className="host-booking-directory">
                  <div className="host-booking-toolbar">
                    <label>
                      <span className="host-nav-icon"><HostIcon name="search" /></span>
                      <input value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder={t({ en: "Search order ID, customer, phone, pet or date", zh: "搜索订单号、顾客、电话、宠物或日期" })} />
                    </label>
                    <div className="host-booking-filter-tabs" aria-label="Booking filters">
                      {[["", "All", "全部"], ["needs-action", "To verify", "待确认"], ["active", "In stay", "寄宿中"], ["outstanding", "Balance", "余额"], ["completed", "Completed", "已完成"], ["voided", "Voided", "已作废"]].map(([value, en, zh]) => <button key={en} type="button" className={bookingStatusFilter === value ? "is-active" : ""} onClick={() => setBookingStatusFilter(value)}>{t({ en, zh })}</button>)}
                    </div>
                  </div>

                  <div className="host-booking-list">
                    {filteredOrders.map((order) => {
                      const range = getOrderDateRange(order);
                      const owner = ownerForOrder(order);
                      return (
                        <article key={orderSelectionKey(order)} className={`host-booking-row${isVoidedOrder(order) ? " is-voided" : ""}`}>
                          <div className="host-booking-row-main">
                            <div className="host-booking-pets-stack">
                              {order.pets.slice(0, 3).map((pet, index) => <img key={`${pet.id}-${index}`} src={dogAvatarSrc(pet.photoDataUrl)} alt={pet.name} />)}
                              {order.pets.length > 3 ? <b>+{order.pets.length - 3}</b> : null}
                            </div>
                            <div className="host-booking-identity">
                              <span>{order.orderId}</span>
                              <strong>{owner.name}</strong>
                              <small>{order.pets.map((pet) => pet.name).join(", ") || "Pet profile pending"}</small>
                            </div>
                          </div>
                          <div className="host-booking-stay">
                            <span>{order.serviceLabel}</span>
                            <strong>{shortDate(range?.start)} <i aria-hidden="true">to</i> {shortDate(range?.end)}</strong>
                            <small>{order.pets.length} {order.pets.length === 1 ? "pet" : "pets"}</small>
                          </div>
                          <div className="host-booking-state">
                            <span className={`host-booking-status ${statusPill(bookingStatus(order))}`}>{isVoidedOrder(order) ? "Voided" : bookingStatus(order)}</span>
                            <small>{isVoidedOrder(order) ? "Excluded from operations" : paymentStatus(order)}</small>
                          </div>
                          <div className="host-booking-money">
                            <span>Paid <strong>{money(order.paid)}</strong></span>
                            <span className={(order.balance || 0) > 0 ? "has-balance" : ""}>Balance <strong>{money(order.balance)}</strong></span>
                          </div>
                          <button type="button" className="host-booking-open" onClick={() => setSelectedOrderId(orderSelectionKey(order))}>{isVoidedOrder(order) ? t({ en: "Audit", zh: "审计" }) : t({ en: "Manage", zh: "管理" })} <span aria-hidden="true">›</span></button>
                        </article>
                      );
                    })}
                    {filteredOrders.length === 0 ? <div className="host-booking-empty"><span className="host-nav-icon"><HostIcon name="booking" /></span><strong>{t({ en: "No matching bookings", zh: "没有符合条件的预约" })}</strong><p>{t({ en: "Try another customer, pet, order number, or status.", zh: "请尝试其他顾客、宠物、订单号或状态。" })}</p><button type="button" onClick={() => { setBookingSearch(""); setBookingStatusFilter(""); }}>{t({ en: "Clear filters", zh: "清除筛选" })}</button></div> : null}
                  </div>
                </div>
              </section>

              <section id="calendar-capacity" className={activeWorkspace === "calendar" ? "host-workspace host-calendar-v2" : "hidden"}>
                <div className="host-calendar-command">
                  <div>
                    <span className="host-workspace-kicker">LIVE AVAILABILITY</span>
                    <h2>Calendar Capacity</h2>
                    <p>Confirmed pet counts and manually closed dates stay aligned with customer booking.</p>
                  </div>
                  <div className="host-calendar-month-switcher">
                    <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>&lt;</button>
                    <strong>{monthLabel}</strong>
                    <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>&gt;</button>
                  </div>
                </div>

                <div className="host-calendar-summary">
                  <div><span>Confirmed this month</span><strong>{days.reduce((sum, date) => sum + confirmedPetsForDate(orders, date), 0)}</strong><small>Pet-days scheduled</small></div>
                  <div><span>Booked dates</span><strong>{days.filter((date) => confirmedPetsForDate(orders, date) > 0).length}</strong><small>Dates with guests</small></div>
                  <div><span>Closed dates</span><strong>{days.filter((date) => offDays.includes(toDateKey(date))).length}</strong><small>Marked full by host</small></div>
                  <div className="host-calendar-legend"><span><i className="is-available" />Available</span><span><i className="is-booked" />Confirmed pets</span><span><i className="is-full" />Full</span></div>
                </div>

                <div className="host-calendar-board">
                  <div className="host-calendar-weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
                  <div className="host-calendar-grid">
                    {Array.from({ length: calendarLeadingDays }, (_, index) => <div key={`previous-${index}`} className="host-calendar-day is-outside"><span>{previousMonthLastDay - calendarLeadingDays + index + 1}<small>Prev</small></span></div>)}
                    {days.map((date) => {
                      const key = toDateKey(date);
                      const petCount = confirmedPetsForDate(orders, date);
                      const isFull = offDays.includes(key);
                      const isToday = key === todayKey;
                      const label = isFull ? "Full" : petCount > 0 ? `${petCount} ${petCount === 1 ? "pet" : "pets"}` : "Available";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setManagedDay(date)}
                          className={`host-calendar-day ${isFull ? "is-full" : petCount > 0 ? "has-bookings" : ""} ${isToday ? "is-today" : ""}`}
                        >
                          <span>{date.getDate()}<small>{date.toLocaleDateString("en-US", { weekday: "short" })}</small></span>
                          <strong>{label}</strong>
                          <em>{isFull ? "Closed for booking" : petCount > 0 ? "Open day details" : "Tap to manage"}</em>
                        </button>
                      );
                    })}
                    {Array.from({ length: calendarTrailingDays }, (_, index) => <div key={`next-${index}`} className="host-calendar-day is-outside"><span>{index + 1}<small>Next</small></span></div>)}
                  </div>
                </div>
              </section>

              <section id="reviews" className={activeWorkspace === "reviews" ? "host-operating-card host-workspace host-reviews-workspace" : "hidden"}>
                <div className="host-reviews-heading"><div><span>Customer stories</span><h2 className="section-title">Reviews Management</h2><p>Publish polished testimonials and control exactly what customers can see.</p></div><b>{reviews.filter((review) => !review.hidden).length} live</b></div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
                  <div id="host-review-editor" className="host-review-editor grid gap-3">
                    <div className="host-review-editor-heading"><div><span>{editingReviewId ? "Editing review" : "New review"}</span><strong>{editingReviewId ? "Update the selected customer story" : "Publish a customer story"}</strong></div>{editingReviewId ? <button type="button" onClick={() => { setEditingReviewId(""); setReviewForm({ name: "", dogName: "", breed: "", rating: 5, en: "", zh: "", date: new Date().toISOString().slice(0, 10), photo: "" }); }}>Cancel edit</button> : null}</div>
                    <input className="villa-input" value={reviewForm.name} onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })} placeholder="Owner name" />
                    <input className="villa-input" value={reviewForm.dogName} onChange={(event) => setReviewForm({ ...reviewForm, dogName: event.target.value })} placeholder="Dog name" />
                    <input className="villa-input" value={reviewForm.breed} onChange={(event) => setReviewForm({ ...reviewForm, breed: event.target.value })} placeholder="Breed" />
                    <input className="villa-input" type="date" value={reviewForm.date} onChange={(event) => setReviewForm({ ...reviewForm, date: event.target.value })} />
                    <div className="rounded-[14px] border border-[#e5d8ec] bg-white/75 px-4 py-3 text-[10px] font-bold leading-relaxed text-villa-text-secondary">
                      Review photo upload is unavailable until dedicated secure review storage is configured.
                    </div>
                    <select className="villa-input" value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}>
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <textarea className="villa-input h-24 py-3" value={reviewForm.en} onChange={(event) => setReviewForm({ ...reviewForm, en: event.target.value })} placeholder="English review" />
                    <textarea className="villa-input h-24 py-3" value={reviewForm.zh} onChange={(event) => setReviewForm({ ...reviewForm, zh: event.target.value })} placeholder="Chinese review (optional)" />
                    <button type="button" className="host-primary-action" onClick={publishReview}>{editingReviewId ? "Save Review Changes" : "Publish Review"}</button>
                  </div>
                  <div className="host-review-list">
                    {reviews.map((review) => (
                      <article key={review.id} className="host-review-card" data-hidden={review.hidden || undefined}>
                        <div className="flex items-start gap-3">
                          <img src={reviewPetAvatar(review)} alt={review.dogName || review.pet} className="h-12 w-12 rounded-full object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-[#f5a623]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                            <p className="mt-2 text-sm font-bold text-villa-text-primary">{review.quote.en}</p>
                            <p className="mt-2 text-xs font-black text-villa-text-secondary">{review.name} · {review.dogName || review.pet}{review.breed ? ` · ${review.breed}` : ""} · {review.date}</p>
                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(review.hidden ? "Hidden" : "Live")}`}>{review.hidden ? "Hidden" : "Live"}</span>
                          </div>
                        </div>
                        <div className="host-review-actions">
                          <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => editReview(review)}>Edit</button>
                          <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => toggleReviewVisibility(review)}>{review.hidden ? "Show" : "Hide"}</button>
                          <button type="button" className="rounded-pill border border-red-200 px-3 py-1 text-xs font-black text-red-500" onClick={() => removeReview(review)}>Delete</button>
                        </div>
                      </article>
                    ))}
                    {reviews.length === 0 ? <div className="host-review-empty"><strong>No customer stories yet</strong><p>Publish the first review from the editor. Its website visibility will stay clear here.</p></div> : null}
                  </div>
                </div>
              </section>

              {activeWorkspace === "diary" ? <section id="gallery" className="host-workspace host-diary-workspace">
                <article className="host-operating-card host-diary-composer">
                  <div className="host-panel-heading">
                    <div><h2>{editingDiaryId ? "Edit private pet update" : "Add private pet update"}</h2><p>Customer → Pet → Booking. Only the matching registered customer can read it.</p></div>
                    <span>{editingDiaryId ? "Editing" : "Private account"}</span>
                  </div>

                  {!diaryConfiguration.configured ? <div className="host-diary-configuration-error" role="alert"><strong>Private Diary database is not configured</strong><span>{diaryConfiguration.error}</span><small>Apply database/migrations/202608060001_create_supabase_pet_diary.sql in Production Supabase.</small></div> : null}

                  <div className="host-diary-customer-step">
                    <label><span>1. Search customer</span><input value={diaryCustomerSearch} onChange={(event) => setDiaryCustomerSearch(event.target.value)} placeholder="Name, phone, email or pet..." /></label>
                    <div className="host-diary-customer-results">
                      {filteredDiaryCustomers.slice(0, 6).map((customer) => <button key={customer.id} type="button" data-active={selectedDiaryCustomer?.id === customer.id} onClick={() => selectDiaryCustomer(customer.id)}><strong>{customer.name}</strong><small>{customer.phone || customer.email || "Registered customer"} · {customer.dogs.length} pets</small></button>)}
                      {filteredDiaryCustomers.length === 0 ? <p>No eligible confirmed customer stays found.</p> : null}
                    </div>
                  </div>

                  <div className="host-diary-targets">
                    <label><span>2. Pet</span><select value={selectedDiaryCustomerPet?.id || selectedDiaryCustomerPet?.name || ""} onChange={(event) => selectDiaryPet(event.target.value)} disabled={!selectedDiaryCustomer}><option value="">Choose a pet</option>{customerDiaryPets.map((pet) => <option key={pet.id || pet.name} value={pet.id || pet.name}>{pet.name} - {pet.breed || "Pet"}</option>)}</select></label>
                    <label><span>3. Booking / order</span><select value={selectedDiaryOrder?.orderId || ""} onChange={(event) => selectDiaryOrder(event.target.value)} disabled={!selectedDiaryCustomerPet}><option value="">Choose an eligible booking</option>{petDiaryOrders.map((order) => <option key={order.orderId} value={order.orderId}>{order.orderId} - {orderRangeLabel(order)} - {bookingStatus(order)}</option>)}</select></label>
                  </div>

                  {selectedDiaryOrder && selectedDiaryOwner && selectedDiaryPet ? (
                    <div className="host-diary-recipient">
                      <img src={dogAvatarSrc(selectedDiaryPet.photoDataUrl)} alt={selectedDiaryPet.name} />
                      <div><small>Sending to</small><strong>{selectedDiaryOwner.name}</strong><span>{selectedDiaryPet.name} · {selectedDiaryOrder.orderId}</span></div>
                      <b>{orderRangeLabel(selectedDiaryOrder)}</b>
                    </div>
                  ) : <div className="host-diary-empty-target">Choose a booking to load the matching customer and pet.</div>}

                  <div className="host-diary-form-grid">
                    <label><span>Mood</span><select value={diaryForm.mood} onChange={(event) => setDiaryForm({ ...diaryForm, mood: event.target.value })}><option>Happy & comfortable</option><option>Calm & resting</option><option>Playful & active</option><option>A little tired</option><option>Needs attention</option></select></label>
                    <label><span>Meal</span><input value={diaryForm.mealNotes} onChange={(event) => setDiaryForm({ ...diaryForm, mealNotes: event.target.value })} placeholder="e.g. Finished breakfast" /></label>
                    <label><span>Water</span><input value={diaryForm.waterNotes} onChange={(event) => setDiaryForm({ ...diaryForm, waterNotes: event.target.value })} placeholder="e.g. Drinking normally" /></label>
                    <label><span>Activity</span><input value={diaryForm.activityNotes} onChange={(event) => setDiaryForm({ ...diaryForm, activityNotes: event.target.value })} placeholder="e.g. Indoor play and nap" /></label>
                    <label><span>Toilet</span><input value={diaryForm.toiletNotes} onChange={(event) => setDiaryForm({ ...diaryForm, toiletNotes: event.target.value })} placeholder="e.g. Normal, twice today" /></label>
                    <label><span>Health</span><input value={diaryForm.healthNotes} onChange={(event) => setDiaryForm({ ...diaryForm, healthNotes: event.target.value })} placeholder="e.g. Bright and comfortable" /></label>
                    <label><span>Medication</span><input value={diaryForm.medicationNotes} onChange={(event) => setDiaryForm({ ...diaryForm, medicationNotes: event.target.value })} placeholder="Medicine, dose and time" /></label>
                    <label><span>Care status</span><input value={diaryForm.careNotes} onChange={(event) => setDiaryForm({ ...diaryForm, careNotes: event.target.value })} placeholder="Grooming, rest or special care" /></label>
                    <label className="is-wide"><span>Important reminder</span><input value={diaryForm.reminderNotes} onChange={(event) => setDiaryForm({ ...diaryForm, reminderNotes: event.target.value })} placeholder="Anything the owner should know or respond to" /></label>
                    <label className="is-wide"><span>Customer update</span><textarea value={diaryForm.body} onChange={(event) => setDiaryForm({ ...diaryForm, body: event.target.value })} placeholder="Write a warm, clear summary of how their little one is doing today." /></label>
                  </div>

                  <label className="host-diary-upload">
                    <span><HostIcon name="diary" /></span>
                    <strong>{diaryFiles.length ? `${diaryFiles.length} file${diaryFiles.length === 1 ? "" : "s"} ready` : "Add pet photos or videos"}</strong>
                    <small>Up to 6 files per update · JPG, PNG, WEBP, MP4 or MOV</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple onChange={handleDiaryFiles} />
                  </label>
                  {diaryFiles.length ? <div className="host-diary-file-list">{diaryFiles.map((file) => <span key={`${file.name}-${file.size}`}>{file.type.startsWith("video/") ? "Video" : "Photo"} · {file.name}</span>)}</div> : null}

                  <div className="host-diary-publish-row">
                    <label><input type="checkbox" checked={diaryForm.healthAlert} onChange={(event) => setDiaryForm({ ...diaryForm, healthAlert: event.target.checked })} /><span><strong>Important care alert</strong><small>Highlight this update for the owner.</small></span></label>
                    <div className="host-diary-publish-actions">{editingDiaryId ? <button type="button" className="host-secondary-action" onClick={cancelDiaryEdit}>Cancel edit</button> : null}<button type="button" className="host-primary-action" onClick={publishDiaryUpdate} disabled={diaryPublishing || !diaryConfiguration.configured}>{diaryPublishing ? "Saving..." : editingDiaryId ? "Save Diary changes" : "Publish to customer account"}</button></div>
                  </div>
                </article>

                <article className="host-operating-card host-diary-feed">
                  <div className="host-panel-heading"><div><h2>Private Diary history</h2><p>{selectedDiaryCustomer ? `${selectedDiaryCustomer.name}'s private updates` : "Choose a customer to review history."}</p></div><span>{visibleDiaryEntries.length} updates</span></div>
                  <div className="host-diary-history-filters">
                    <label><span>Order</span><select value={diaryHistoryOrder} onChange={(event) => setDiaryHistoryOrder(event.target.value)}><option value="">All eligible orders</option>{customerDiaryOrders.map((order) => <option key={order.orderId} value={order.orderId}>{order.orderId} - {orderRangeLabel(order)}</option>)}</select></label>
                    <label><span>Pet</span><select value={diaryHistoryPet} onChange={(event) => setDiaryHistoryPet(event.target.value)}><option value="">All pets</option>{customerDiaryPets.map((pet) => <option key={pet.id || pet.name} value={pet.id || pet.name}>{pet.name}</option>)}</select></label>
                    <label><span>Published date</span><input type="date" value={diaryHistoryDate} onChange={(event) => setDiaryHistoryDate(event.target.value)} /></label>
                  </div>
                  <div className="host-diary-timeline">
                    {visibleDiaryEntries.map((entry) => (
                      <article key={entry.id}>
                        <header><div><strong>{entry.petName}</strong><span>{entry.customerName} · {new Date(entry.createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</span></div><b className={entry.healthAlert ? "is-alert" : ""}>{entry.healthAlert ? "Care alert" : entry.mood}</b></header>
                        <p>{entry.body}</p>
                        {[entry.mealNotes, entry.waterNotes, entry.activityNotes, entry.toiletNotes, entry.healthNotes, entry.medicationNotes, entry.careNotes, entry.reminderNotes].some(Boolean) ? <div className="host-diary-care-notes">{entry.mealNotes ? <span><small>Meal</small>{entry.mealNotes}</span> : null}{entry.waterNotes ? <span><small>Water</small>{entry.waterNotes}</span> : null}{entry.activityNotes ? <span><small>Activity</small>{entry.activityNotes}</span> : null}{entry.toiletNotes ? <span><small>Toilet</small>{entry.toiletNotes}</span> : null}{entry.healthNotes ? <span><small>Health</small>{entry.healthNotes}</span> : null}{entry.medicationNotes ? <span><small>Medication</small>{entry.medicationNotes}</span> : null}{entry.careNotes ? <span><small>Care status</small>{entry.careNotes}</span> : null}{entry.reminderNotes ? <span><small>Reminder</small>{entry.reminderNotes}</span> : null}</div> : null}
                        {entry.media.length ? <div className="host-diary-media">{entry.media.map((media, index) => media.type === "video" ? <video key={`${media.url}-${index}`} src={media.url} controls preload="metadata" /> : <img key={`${media.url}-${index}`} src={media.url} alt={`${entry.petName} update ${index + 1}`} />)}</div> : null}
                        <footer><span>Visible only to this customer account</span><div><button type="button" onClick={() => editDiaryEntry(entry)}>Edit</button><button type="button" className="is-danger" onClick={() => removeDiaryEntry(entry)}>Delete</button></div></footer>
                      </article>
                    ))}
                    {visibleDiaryEntries.length === 0 ? <div className="host-diary-empty-feed"><span><HostIcon name="diary" /></span><strong>No private updates yet</strong><p>Publish the first photo or video update for this booking.</p></div> : null}
                  </div>
                </article>

                <details className="host-operating-card host-marketing-gallery">
                  <summary><span><strong>Home marketing gallery</strong><small>Separate from customer Pet Diary · {photos.length} public gallery items</small></span><b>Manage</b></summary>
                  <div className="host-marketing-gallery-body">
                    <div className="grid gap-3">
                      <label className="host-gallery-upload">{photoForm.imageUrl ? <img src={photoForm.imageUrl} alt="" /> : "Upload Home photo"}<input type="file" accept="image/*" className="sr-only" onChange={handlePhotoFile} /></label>
                      <input className="villa-input" value={photoForm.petName} onChange={(event) => setPhotoForm({ ...photoForm, petName: event.target.value })} placeholder="Pet name" />
                      <input className="villa-input" value={photoForm.breed} onChange={(event) => setPhotoForm({ ...photoForm, breed: event.target.value })} placeholder="Breed" />
                      <input className="villa-input" value={photoForm.caption} onChange={(event) => setPhotoForm({ ...photoForm, caption: event.target.value })} placeholder="Caption" />
                      <button type="button" className="host-secondary-action" onClick={publishPhoto}>Publish to Home</button>
                    </div>
                    <div className="host-gallery-thumbs">{photos.slice(0, 9).map((photo) => <article key={photo.id}><img src={photo.imageUrl || hostPhotoPlaceholder} alt={photo.petName} /><span><strong>{photo.petName}</strong><small>{photo.visibleOnHome ? "Published" : "Hidden"}</small></span>{!photo.id.startsWith("guest-") ? <button type="button" onClick={() => void toggleGuestPhoto(photo)}>{photo.visibleOnHome ? "Hide" : "Show"}</button> : null}</article>)}</div>
                  </div>
                </details>
              </section> : null}

              <section className={activeWorkspace === "vouchers" ? "host-workspace host-pricing-workspace" : "hidden"}>
                {/* Legacy voucher campaigns are intentionally unavailable for future bookings. */}
                {/*
                <article className="host-operating-card">
                  <div className="host-panel-heading"><div><h2>Voucher catalogue</h2><p>Create, edit, or pause offers used by customer checkout.</p></div><button type="button" onClick={() => editVoucherCampaign()}>New voucher</button></div>
                  <div className="host-voucher-list">
                    {voucherCampaigns.map((voucher, index) => (
                      <article key={voucher.code} data-tone={index} className={voucher.enabled ? "" : "is-paused"}>
                        <div><span>{voucher.label.en}</span><strong>{voucher.title.en}</strong><p>{voucher.body.en}</p><small>{voucher.type === "fixed" ? `RM${voucher.value} discount` : voucher.type === "second_dog_percent" ? `${voucher.value}% off second pet` : `RM${voucher.value} per night`} · Minimum RM{voucher.minSpend}</small></div>
                        <aside><small>{voucher.enabled ? "Active code" : "Paused"}</small><b>{voucher.code}</b><button type="button" onClick={() => editVoucherCampaign(voucher)}>Edit</button><button type="button" onClick={() => void toggleVoucherCampaign(voucher)}>{voucher.enabled ? "Pause" : "Enable"}</button></aside>
                      </article>
                    ))}
                  </div>
                  {editingVoucherCode ? <div className="host-voucher-editor">
                    <div className="host-review-editor-heading"><div><span>{editingVoucherCode === "new" ? "New campaign" : "Editing campaign"}</span><strong>Customer voucher rule</strong></div><button type="button" onClick={() => { setEditingVoucherCode(""); setVoucherCampaignForm(blankVoucherCampaign()); }}>Cancel</button></div>
                    <label>Code<input value={voucherCampaignForm.code} disabled={editingVoucherCode !== "new"} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, code: event.target.value.toUpperCase() })} /></label>
                    <label>Rule<select value={voucherCampaignForm.type} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, type: event.target.value as VoucherCampaign["type"] })}><option value="fixed">Fixed RM discount</option><option value="second_dog_percent">Second pet percentage</option><option value="long_stay_flat">Long stay nightly rate</option></select></label>
                    <label>Value<input type="number" min="0" value={voucherCampaignForm.value} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, value: Number(event.target.value) })} /></label>
                    <label>Minimum spend<input type="number" min="0" value={voucherCampaignForm.minSpend} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, minSpend: Number(event.target.value) })} /></label>
                    <label>English title<input value={voucherCampaignForm.title.en} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, title: { ...voucherCampaignForm.title, en: event.target.value } })} /></label>
                    <label>Chinese title<input value={voucherCampaignForm.title.zh} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, title: { ...voucherCampaignForm.title, zh: event.target.value } })} /></label>
                    <label className="is-wide">English details<textarea value={voucherCampaignForm.body.en} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, body: { ...voucherCampaignForm.body, en: event.target.value } })} /></label>
                    <label className="is-wide">Chinese details<textarea value={voucherCampaignForm.body.zh} onChange={(event) => setVoucherCampaignForm({ ...voucherCampaignForm, body: { ...voucherCampaignForm.body, zh: event.target.value } })} /></label>
                    <button type="button" className="host-primary-action is-wide" onClick={() => void saveVoucherCampaignForm()}>Save voucher campaign</button>
                  </div> : null}
                </article>
                */}
                <article className="host-operating-card host-settings-form">
                  <div className="host-panel-heading"><div><span>Business rates</span><h2>Service pricing</h2><p>Normal and special-date rates shared by Customer and Host booking.</p></div></div>
                  <label>Boarding per night<div><span>RM</span><input inputMode="numeric" value={hostSettings.boardingRate} onChange={(event) => setHostSettings({ ...hostSettings, boardingRate: event.target.value })} /></div></label>
                  <label>Daycare per hour<div><span>RM</span><input inputMode="numeric" value={hostSettings.daycareRate} onChange={(event) => setHostSettings({ ...hostSettings, daycareRate: event.target.value })} /></div></label>
                  <div className="host-special-rates">
                    <div className="host-panel-heading"><div><span>Date overrides</span><h3>Special-date pricing</h3><p>Choose an inclusive date range. Use the same From and To date for one day. Leave a rate blank to use the normal price.</p></div><button type="button" onClick={() => setHostSettings({ ...hostSettings, specialDateRates: [...hostSettings.specialDateRates, { fromDate: "", toDate: "" }] })}>Add date range</button></div>
                    {hostSettings.specialDateRates.map((rate, index) => <div key={`${rate.fromDate}-${rate.toDate}-${index}`} className="host-special-rate-row">
                      <label>From Date<input type="date" value={rate.fromDate} onChange={(event) => setHostSettings({ ...hostSettings, specialDateRates: hostSettings.specialDateRates.map((item, itemIndex) => itemIndex === index ? { ...item, fromDate: event.target.value, toDate: !item.toDate || item.toDate < event.target.value ? event.target.value : item.toDate } : item) })} /></label>
                      <label>To Date<input type="date" min={rate.fromDate} value={rate.toDate} onChange={(event) => setHostSettings({ ...hostSettings, specialDateRates: hostSettings.specialDateRates.map((item, itemIndex) => itemIndex === index ? { ...item, toDate: event.target.value } : item) })} /></label>
                      <label>Boarding RM<input type="number" min="0" step="0.01" value={rate.boardingRate ?? ""} onChange={(event) => setHostSettings({ ...hostSettings, specialDateRates: hostSettings.specialDateRates.map((item, itemIndex) => itemIndex === index ? { ...item, boardingRate: event.target.value === "" ? undefined : Number(event.target.value) } : item) })} /></label>
                      <label>Daycare RM/hour<input type="number" min="0" step="0.01" value={rate.daycareRate ?? ""} onChange={(event) => setHostSettings({ ...hostSettings, specialDateRates: hostSettings.specialDateRates.map((item, itemIndex) => itemIndex === index ? { ...item, daycareRate: event.target.value === "" ? undefined : Number(event.target.value) } : item) })} /></label>
                      <button type="button" aria-label={`Remove special rate ${rate.fromDate || index + 1} to ${rate.toDate || rate.fromDate || index + 1}`} onClick={() => setHostSettings({ ...hostSettings, specialDateRates: hostSettings.specialDateRates.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
                    </div>)}
                    {hostSettings.specialDateRates.length === 0 ? <p className="host-integration-note">No special dates configured. Normal rates apply to every date.</p> : null}
                  </div>
                  <button type="button" className="host-primary-action" onClick={saveHostSettings}>Save pricing</button>
                </article>
              </section>

              <section className={activeWorkspace === "notifications" ? "host-workspace grid gap-5 xl:grid-cols-[1.1fr_.9fr]" : "hidden"}>
                <article className="host-operating-card host-message-composer">
                  <div className="host-panel-heading"><div><h2>Message composer</h2><p>Send a message to the customer selected in Inbox.</p></div><button type="button" onClick={() => setActiveWorkspace("messages")}>Choose customer</button></div>
                  <div className="host-recipient-strip"><span>Recipient</span><strong>{selectedThread?.userName || "No customer selected"}</strong><small>{selectedThreadCustomer?.phone || selectedThread?.userPhone || "Choose a conversation first"}</small></div>
                  <textarea value={notificationDraft} onChange={(event) => setNotificationDraft(event.target.value)} placeholder="Write a booking update, reminder, or care message..." />
                  <div className="host-composer-actions"><button type="button" className="host-secondary-action" onClick={() => setNotificationDraft("Your Pet Villa booking is confirmed. We look forward to caring for your little one.")}>Use confirmation template</button><button type="button" className="host-primary-action" onClick={sendNotificationDraft}>Send to Inbox</button></div>
                </article>
                <aside className="host-operating-card host-channel-status">
                  <div className="host-panel-heading"><div><h2>Delivery channels</h2><p>Live status of each customer channel.</p></div></div>
                  <div><span className="is-ready"><HostIcon name="messages" /></span><strong>Website Inbox</strong><b>Connected</b><small>Messages use the existing chat data flow.</small></div>
                  <div><span><HostIcon name="notifications" /></span><strong>Push Notification</strong><b>Setup required</b><small>Firebase credentials and browser permission flow must be verified.</small></div>
                  <div><span><HostIcon name="messages" /></span><strong>WhatsApp Business</strong><b>Setup required</b><small>QR scanning alone cannot send automated confirmations from this web app.</small></div>
                </aside>
              </section>

              <section className={activeWorkspace === "settings" ? "host-workspace host-settings-workspace" : "hidden"}>
                <div className="host-settings-tabs" role="tablist" aria-label="Host settings section"><button type="button" role="tab" aria-selected={settingsTab === "business"} data-active={settingsTab === "business" || undefined} onClick={() => setSettingsTab("business")}>Business Settings</button><button type="button" role="tab" aria-selected={settingsTab === "security"} data-active={settingsTab === "security" || undefined} onClick={() => setSettingsTab("security")}>Security</button></div>
                {settingsTab === "business" ? <div className="host-settings-grid"><article className="host-operating-card host-settings-form">
                  <div className="host-panel-heading"><div><h2>Payment details</h2><p>QR and bank information shown in customer checkout.</p></div></div>
                  <label className="host-payment-qr-uploader">
                    <span>Customer payment QR</span>
                    <img src={hostSettings.paymentQrUrl} alt="Current Pet Villa payment QR" />
                    <strong>{paymentQrUploading ? "Uploading..." : "Upload replacement QR"}</strong>
                    <small>PNG, JPG or WebP. The customer checkout updates from this setting.</small>
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={paymentQrUploading} onChange={handlePaymentQrUpload} />
                  </label>
                  <label>Account name<input value={hostSettings.accountName} onChange={(event) => setHostSettings({ ...hostSettings, accountName: event.target.value })} /></label>
                  <label>Bank name<input value={hostSettings.bankName} onChange={(event) => setHostSettings({ ...hostSettings, bankName: event.target.value })} /></label>
                  <label>Account number<input value={hostSettings.accountNumber} onChange={(event) => setHostSettings({ ...hostSettings, accountNumber: event.target.value })} /></label>
                  <button type="button" className="host-primary-action" onClick={saveHostSettings}>Save payment details</button>
                </article>
                <article className="host-operating-card host-settings-form">
                  <div className="host-panel-heading"><div><h2>Communication</h2><p>Operational contact and alert preferences.</p></div></div>
                  <label>WhatsApp number<input value={hostSettings.whatsapp} onChange={(event) => setHostSettings({ ...hostSettings, whatsapp: event.target.value })} /></label>
                  <label className="host-toggle-row"><span><strong>New booking sound</strong><small>Play a professional Ding-Dong alert when a new order arrives.</small></span><input type="checkbox" checked={hostSettings.notificationSound} onChange={(event) => setHostSettings({ ...hostSettings, notificationSound: event.target.checked })} /></label>
                  <button type="button" className="host-secondary-action" onClick={() => void testHostAlert()}>Test Ding-Dong</button>
                  <label className="host-toggle-row"><span><strong>Website Inbox auto-reply</strong><small>Answers common questions about prices, hours, availability, and booking. WhatsApp automation still needs Business API.</small></span><input type="checkbox" checked={hostSettings.autoReply} onChange={(event) => setHostSettings({ ...hostSettings, autoReply: event.target.checked })} /></label>
                  <div className="host-auto-reply-summary"><strong>Reply topics</strong><span>Pricing</span><span>Check-in hours</span><span>Date availability</span><span>How to book</span><small>Unmatched questions receive an acknowledgement and remain visible for manual reply.</small></div>
                  <button type="button" className="host-primary-action" onClick={saveHostSettings}>Save communication settings</button>
                </article></div> : <HostSecurityPanel initialMode="set" />}
              </section>
            <aside className="hidden">
              <section id="messages-legacy" className="villa-card p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="card-title">Messages Inbox</h2>
                  {unreadThreads.length ? <span className="rounded-full bg-villa-primary px-2 py-1 text-xs font-black text-white">{unreadThreads.length} unread</span> : null}
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
                  <div className="grid max-h-[360px] content-start gap-2 overflow-auto pr-1">
                    {threads.map((thread) => (
                      <button key={thread.id} type="button" className={`rounded-[14px] border p-3 text-left text-xs font-black ${thread.id === selectedThreadId ? "border-villa-primary bg-villa-primary-bg text-villa-primary" : "border-villa-primary-light bg-white text-villa-text-primary"}`} onClick={() => setSelectedThreadId(thread.id)}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{thread.userName}</span>
                          {thread.messages.at(-1)?.from === "owner" ? <span className="rounded-full bg-villa-primary px-2 py-0.5 text-[10px] text-white">1</span> : null}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-villa-text-muted">{thread.messages.at(-1)?.text || "No message yet"}</span>
                        <span className="mt-1 block text-[10px] text-villa-text-muted">{thread.messages.at(-1)?.createdAt ? shortDateFromISO(thread.messages.at(-1)?.createdAt) : ""}</span>
                      </button>
                    ))}
                    {threads.length === 0 ? <p className="body-copy">No customer chats yet.</p> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="rounded-[18px] border border-villa-primary-light bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong className="block text-sm text-villa-text-primary">{selectedThread?.userName || "Select a chat"}</strong>
                          <span className="text-xs font-bold text-villa-text-secondary">{selectedThreadCustomer?.phone || selectedThread?.userPhone || "No phone"} · {selectedThreadCustomer?.email || "No email"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid max-h-[340px] gap-3 overflow-auto rounded-[18px] bg-villa-primary-bg p-3">
                      {messages.map((message) => (
                        <div key={message.id} className={`max-w-[86%] rounded-[18px] p-3 text-sm font-bold ${message.from === "host" ? "justify-self-end bg-villa-primary text-white" : "bg-white text-villa-text-primary"}`}>{message.text}</div>
                      ))}
                      {messages.length === 0 ? <p className="body-copy">Choose a customer conversation to reply.</p> : null}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input className="villa-input" disabled={replySending} value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendHostReply(); }} placeholder="Reply as host..." />
                      <button type="button" disabled={replySending || !reply.trim()} className="villa-button px-5" onClick={() => void sendHostReply()}>{replySending ? "Sending..." : "Send"}</button>
                    </div>
                  </div>
                  <aside className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                    <h3 className="card-title">Customer Card</h3>
                    {selectedThreadCustomer ? (
                      <div className="mt-3 grid gap-3 text-sm font-bold">
                        <div className="rounded-[14px] bg-villa-primary-bg p-3">
                          <strong className="block text-villa-text-primary">{selectedThreadCustomer.name}</strong>
                          <span className="block text-xs text-villa-text-secondary">{selectedThreadCustomer.phone || "No phone"}</span>
                          <span className="block text-xs text-villa-text-secondary">{selectedThreadCustomer.email || "No email"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <span className="rounded-[12px] bg-villa-primary-bg p-2"><b className="block text-base">{selectedChatDogs.length}</b>Dogs</span>
                          <span className="rounded-[12px] bg-villa-primary-bg p-2"><b className="block text-base">{selectedChatOrders.length}</b>Orders</span>
                          <span className="rounded-[12px] bg-villa-primary-bg p-2"><b className="block text-base">{money(selectedChatBalance)}</b>Balance</span>
                        </div>
                        <div className="grid gap-2">
                          <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                            setSelectedCustomerId(selectedThreadCustomer.id);
                            scrollToHostSection("customers");
                          }}>Open CRM</button>
                          <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                            setBookingSearch(selectedThreadCustomer.name);
                            setBookingStatusFilter("");
                            scrollToHostSection("booking-center");
                          }}>Open Orders</button>
                          <button type="button" className="villa-button px-3 py-2 text-xs" onClick={() => openCreateBooking(selectedThreadCustomer)}>Create Booking</button>
                        </div>
                      </div>
                    ) : (
                      <p className="body-copy mt-3 text-xs">Select a customer chat to view CRM details.</p>
                    )}
                  </aside>
                </div>
              </section>

              <section className="villa-card p-5">
                <h2 className="card-title">Recent Bookings</h2>
                <div className="mt-4 grid gap-3">
                  {orders.slice(0, 4).map((order) => (
                    <article key={orderSelectionKey(order)} className="rounded-[18px] border border-villa-primary-light bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="block text-villa-text-primary">{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</strong>
                          <span className="text-xs font-bold text-villa-text-secondary">{ownerForOrder(order).name} · {order.serviceLabel} · {orderRangeLabel(order)}</span>
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
            </aside>
          </section>
        </main>

      {bookingModalOpen ? (
        <div className="host-modal-backdrop">
          <div className="host-booking-modal">
            <div className="host-modal-head">
              <div>
                <span>Host assisted booking</span>
                <h2>Create Booking</h2>
                <p>Customer, pets, stay and payment in one guided flow.</p>
              </div>
              <button type="button" onClick={() => setBookingModalOpen(false)}>Close</button>
            </div>

            <div className="host-booking-progress"><span data-active>1 Customer</span><span>2 Pets</span><span>3 Stay</span><span>4 Payment</span></div>

            <div className="host-booking-modal-body">
              <section className="host-booking-step is-customer">
                <div className="host-booking-step-title"><span>01</span><div><h3>Customer</h3><p>Choose an existing profile or record a walk-in customer.</p></div></div>
                <div className="mt-3 flex gap-2">
                  {(["existing", "new"] as const).map((mode) => (
                    <button key={mode} type="button" className={bookingForm.mode === mode ? "villa-button px-4 py-2 text-xs" : "villa-button-outline bg-white px-4 py-2 text-xs"} onClick={() => {
                      const firstCustomer = mode === "existing" ? customers[0] : undefined;
                      const firstDog = firstCustomer?.dogs[0];
                      setBookingForm({
                        ...bookingForm,
                        mode,
                        customerId: firstCustomer?.id || "",
                        customerSource: firstCustomer?.customerSource || "host",
                        customerName: firstCustomer?.name || "",
                        customerPhone: firstCustomer?.phone || "",
                        customerEmail: firstCustomer?.email || "",
                        dogId: firstDog?.id || "",
                        dogIds: firstDog?.id ? [firstDog.id] : [],
                        dogName: "",
                        dogBreed: "",
                        dogAvatar: dogAvatarSrc(dogAvatarOptions[0].id),
                        discount: "0"
                      });
                    }}>
                      {mode === "existing" ? "Existing Customer" : "New Customer"}
                    </button>
                  ))}
                </div>
                {bookingForm.mode === "existing" ? (
                  <select className="villa-input mt-3" value={bookingForm.customerId} onChange={(event) => {
                    const customer = customers.find((item) => item.id === event.target.value);
                    const dog = customer?.dogs[0];
                    setBookingForm({
                      ...bookingForm,
                      customerId: event.target.value,
                      customerSource: customer?.customerSource || "auth",
                      customerName: customer?.name || "",
                      customerPhone: customer?.phone || "",
                      customerEmail: customer?.email || "",
                      dogId: dog?.id || "",
                      dogIds: dog?.id ? [dog.id] : [],
                      dogName: "",
                      dogBreed: "",
                      dogAvatar: dogAvatarSrc(dogAvatarOptions[0].id),
                      discount: "0"
                    });
                  }}>
                    <option value="">Select customer</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email || "No contact"}</option>)}
                  </select>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input className="villa-input" value={bookingForm.customerName} onChange={(event) => setBookingForm({ ...bookingForm, customerName: event.target.value })} placeholder="Customer name" />
                    <input className="villa-input" value={bookingForm.customerPhone} onChange={(event) => setBookingForm({ ...bookingForm, customerPhone: event.target.value })} placeholder="Phone" />
                    <input className="villa-input" value={bookingForm.customerEmail} onChange={(event) => setBookingForm({ ...bookingForm, customerEmail: event.target.value })} placeholder="Email (optional)" />
                  </div>
                )}
              </section>

              <section className="host-booking-step">
                <div className="host-booking-step-title"><span>02</span><div><h3>Pets</h3><p>Select every saved pet staying on this order.</p></div></div>
                <div className="host-booking-pet-picker">
                  {bookingForm.mode === "existing" ? dogs.filter((dog) => dog.ownerId === bookingForm.customerId).map((dog) => {
                    const selected = bookingForm.dogIds.includes(dog.id);
                    return <button key={`${dog.ownerId}-${dog.id}`} type="button" data-selected={selected || undefined} onClick={() => setBookingForm({ ...bookingForm, dogIds: selected ? bookingForm.dogIds.filter((id) => id !== dog.id) : [...bookingForm.dogIds, dog.id], dogId: selected ? "" : dog.id })}><img src={dogAvatarSrc(dog.photoDataUrl)} alt="" /><span><strong>{dog.name}</strong><small>{dog.breed || "Small dog"}</small></span><b>{selected ? "Selected" : "Add"}</b></button>;
                  }) : <p>New customer selected. Add their pet below.</p>}
                  {bookingForm.mode === "existing" && bookingForm.customerId && dogs.filter((dog) => dog.ownerId === bookingForm.customerId).length === 0 ? <p>No saved pets for this customer yet.</p> : null}
                </div>
                <div className="host-booking-new-pet">
                  <span>Add a new pet to this booking</span>
                  <input className="villa-input" value={bookingForm.dogName} onChange={(event) => setBookingForm({ ...bookingForm, dogName: event.target.value })} placeholder="New pet name (optional)" />
                  <input className="villa-input" value={bookingForm.dogBreed} onChange={(event) => setBookingForm({ ...bookingForm, dogBreed: event.target.value })} placeholder="Breed" />
                  {bookingForm.dogName.trim() ? <PetAvatarPicker value={bookingForm.dogAvatar} onChange={(dogAvatar) => setBookingForm({ ...bookingForm, dogAvatar })} /> : null}
                </div>
              </section>

              <section className="host-booking-step">
                <div className="host-booking-step-title"><span>03</span><div><h3>Service & Dates</h3><p>Set the service and verified stay window.</p></div></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <select className="villa-input" value={bookingForm.service} onChange={(event) => {
                    const service = event.target.value as HostBookingForm["service"];
                    setBookingForm({ ...bookingForm, service, endDate: service === "daycare" ? bookingForm.startDate : bookingForm.endDate });
                  }}>
                    <option value="overnight">Boarding</option>
                    <option value="daycare">Daycare</option>
                  </select>
                  <input className="villa-input" aria-label={bookingForm.service === "daycare" ? "Daycare date" : "Check-in date"} type="date" value={bookingForm.startDate} onChange={(event) => setBookingForm({ ...bookingForm, startDate: event.target.value, endDate: bookingForm.service === "daycare" ? event.target.value : bookingForm.endDate })} />
                  {bookingForm.service === "overnight" ? <input className="villa-input" aria-label="Check-out date" type="date" value={bookingForm.endDate} onChange={(event) => setBookingForm({ ...bookingForm, endDate: event.target.value })} /> : null}
                  {bookingForm.service === "daycare" ? <>
                    <select className="villa-input" aria-label="Daycare start time" value={bookingForm.startTime} onChange={(event) => setBookingForm({ ...bookingForm, startTime: event.target.value })}>{hostDaycareTimes.slice(0, -1).map((time) => <option key={time.value} value={time.value}>{time.label} start</option>)}</select>
                    <select className="villa-input" aria-label="Daycare end time" value={bookingForm.endTime} onChange={(event) => setBookingForm({ ...bookingForm, endTime: event.target.value })}>{hostDaycareTimes.slice(1).map((time) => <option key={time.value} value={time.value}>{time.label} end</option>)}</select>
                  </> : null}
                </div>
              </section>

              <section className="host-booking-step is-payment">
                <div className="host-booking-step-title"><span>04</span><div><h3>Payment</h3><p>Review the total, discount and amount received.</p></div></div>
                <div className="mt-3 grid gap-3">
                  <input className="villa-input" type="number" min="0" step="0.01" value={bookingForm.discount} onChange={(event) => setBookingForm({ ...bookingForm, discount: event.target.value })} placeholder="Manual discount RM (optional)" />
                  <input className="villa-input" inputMode="numeric" value={bookingForm.paid} onChange={(event) => setBookingForm({ ...bookingForm, paid: event.target.value })} placeholder={`Paid amount RM (deposit ${bookingDeposit})`} />
                  <div className="rounded-[18px] bg-villa-primary-bg p-4 text-sm font-bold text-villa-text-primary">
                    <div className="flex justify-between gap-3"><span>Service</span><strong>{bookingForm.service === "overnight" ? `Boarding · ${bookingDateMath.days} day(s)` : `Daycare · ${bookingDaycareHours} hour(s)`} · {bookingDogCount || 1} pet</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Subtotal</span><strong>{money(bookingSubtotal)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3 text-villa-primary"><span>Manual discount</span><strong>-{money(bookingDiscount)}</strong></div>
                    <div className="mt-3 border-t border-villa-primary-light pt-3 flex justify-between gap-3 text-base"><span>Total</span><strong>{money(bookingTotal)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Suggested Deposit</span><strong>{money(bookingDeposit)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Paid Now</span><strong>{money(bookingPaid)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Balance</span><strong>{money(bookingBalance)}</strong></div>
                  </div>
                </div>
              </section>

              <button type="button" className="host-booking-submit" disabled={hostBookingSaving} onClick={() => void saveHostBooking()}><span>{hostBookingSaving ? "Saving permanently..." : "Create Booking"}</span><small>{money(bookingTotal)} total · {money(bookingBalance)} balance</small></button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedOrder ? (
        <div className="host-order-drawer-shell">
          <aside className="host-order-drawer">
            <div className="host-order-drawer-head">
              <div>
                <span>Booking Center</span>
                <h2>Booking Detail</h2>
                <p>{selectedOrder.orderId}</p>
                {isVoidedOrder(selectedOrder) ? <b className="host-voided-badge">Voided · read-only</b> : null}
              </div>
              <button type="button" onClick={() => { setSelectedOrderId(""); setOrderEditOpen(false); setVoidOrderForm(null); setOrderChargeForm(null); }}>Close</button>
            </div>

            <div className="host-order-drawer-body">
              <section className="rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4">
                <h3 className="card-title">{selectedOrderOwner?.name || "Pet Owner"}</h3>
                <p className="mt-1 text-xs font-bold text-villa-text-secondary">{selectedOrderOwner?.phone || "No phone"} · {selectedOrderOwner?.email || "No email"}</p>
              </section>

              <section className="rounded-[18px] border border-villa-primary-light bg-white p-4 text-sm font-bold">
                <div className="grid gap-3">
                  <div className="flex justify-between gap-3"><span>Dog</span><strong>{selectedOrder.pets.map((pet) => `${pet.name} (${pet.breed || "Small dog"})`).join(", ")}</strong></div>
                  <div className="flex justify-between gap-3"><span>Service</span><strong>{selectedOrder.serviceLabel}</strong></div>
                  <div className="flex justify-between gap-3"><span>Check In</span><strong>{shortDate(getOrderDateRange(selectedOrder)?.start)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Check Out</span><strong>{shortDate(getOrderDateRange(selectedOrder)?.end)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Status</span><span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(bookingStatus(selectedOrder))}`}>{bookingStatus(selectedOrder)}</span></div>
                </div>
              </section>

              <section className="host-order-payment-summary">
                <div className="host-order-payment-heading"><div><span>Payment status</span><HostPaymentStatus order={selectedOrder} showAmounts={false} /></div><div className="host-order-payment-tools"><small>Verified order amounts</small>{!isVoidedOrder(selectedOrder) && !["cancelled", "completed"].includes(selectedOrder.status) && canManage("payments.manage") ? <button type="button" onClick={() => openOrderCharge(selectedOrder)}>+ {t({ en: "Add charge", zh: "加收费用" })}</button> : null}</div></div>
                <div className="host-order-payment-amounts">
                  <span><small>Original</small><strong>{money(originalOrderAmount(selectedOrder))}</strong></span>
                  <span><small>Discount</small><strong>{money(discountAmount(selectedOrder))}</strong></span>
                  <span><small>Total sales</small><strong>{money(getOrderPaymentDisplayStatus(selectedOrder).total)}</strong></span>
                  <span><small>Paid</small><strong>{money(getOrderPaymentDisplayStatus(selectedOrder).paid)}</strong></span>
                  <span data-balance={getOrderPaymentDisplayStatus(selectedOrder).balance > 0 || undefined}><small>Balance Due</small><strong>{money(getOrderPaymentDisplayStatus(selectedOrder).balance)}</strong></span>
                </div>
                {(selectedOrder.chargeTotal || 0) > 0 ? <div className="host-order-charge-summary"><span>{t({ en: "Additional charges", zh: "额外收费" })}</span><strong>{money(selectedOrder.chargeTotal || 0)}</strong></div> : null}
                {selectedOrder.charges?.length ? <div className="host-order-charge-history">{selectedOrder.charges.map((charge) => <article key={charge.id}><span><strong>{t({ en: "Late Checkout", zh: "延迟退房" })}</strong><small>{charge.note || t({ en: "No note", zh: "无备注" })} · {shortDateFromISO(charge.createdAt)}</small></span><b>{money(charge.amount)}</b></article>)}</div> : null}
              </section>

              {!isVoidedOrder(selectedOrder) && selectedOrder.paymentSubmission ? <section className="host-payment-submission-card"><div><span>Customer submitted payment</span><strong>{money(selectedOrder.paymentSubmission.amount)}</strong><small>{selectedOrder.paymentSubmission.method === "bank" ? "Bank transfer" : "QR payment"} · {shortDateFromISO(selectedOrder.paymentSubmission.submittedAt)}</small></div><b>Verify against your bank before approval</b></section> : null}

              {!isVoidedOrder(selectedOrder) ? <section className="host-order-editor-card">
                <div className="host-order-editor-title"><div><span>Manage stay</span><strong>Dates, service and pets</strong></div><button type="button" onClick={() => orderEditOpen ? setOrderEditOpen(false) : openOrderEditor(selectedOrder)}>{orderEditOpen ? "Done" : "Edit booking"}</button></div>
                {orderEditOpen && orderEditForm ? (
                  <div className="host-order-edit-form">
                    <label className="is-wide">Service<select value={orderEditForm.service} onChange={(event) => { const service = event.target.value as HostOrderEditForm["service"]; setOrderEditForm({ ...orderEditForm, service, endDate: service === "daycare" ? orderEditForm.startDate : orderEditForm.endDate || orderEditForm.startDate }); }}><option value="overnight">Overnight Boarding</option><option value="daycare">Daycare</option></select></label>
                    <label>{orderEditForm.service === "daycare" ? "Daycare date" : "Check in"}<input type="date" value={orderEditForm.startDate} onChange={(event) => setOrderEditForm({ ...orderEditForm, startDate: event.target.value, endDate: orderEditForm.service === "daycare" || event.target.value > orderEditForm.endDate ? event.target.value : orderEditForm.endDate })} /></label>
                    {orderEditForm.service === "overnight" ? <label>Check out<input type="date" min={orderEditForm.startDate} value={orderEditForm.endDate} onChange={(event) => setOrderEditForm({ ...orderEditForm, endDate: event.target.value })} /></label> : (
                      <>
                        <label>Start time<select value={orderEditForm.startTime} onChange={(event) => setOrderEditForm({ ...orderEditForm, startTime: event.target.value })}>{hostDaycareTimes.slice(0, -1).map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label>
                        <label>End time<select value={orderEditForm.endTime} onChange={(event) => setOrderEditForm({ ...orderEditForm, endTime: event.target.value })}>{hostDaycareTimes.slice(1).map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label>
                      </>
                    )}
                    <fieldset className="host-order-edit-pets is-wide">
                      <legend>Pets on this booking</legend>
                      <p>Select only this customer&apos;s saved pets. Removing one here does not delete its profile.</p>
                      <div>
                        {selectedOrderCustomer?.dogs.map((dog) => {
                          const checked = orderEditForm.petIds.includes(dog.id);
                          return <label key={dog.id} data-selected={checked || undefined}><input type="checkbox" checked={checked} onChange={() => setOrderEditForm({ ...orderEditForm, petIds: checked ? orderEditForm.petIds.filter((id) => id !== dog.id) : [...orderEditForm.petIds, dog.id] })} /><img src={dogAvatarSrc(dog.photoDataUrl)} alt={dog.name} /><span><strong>{dog.name}</strong><small>{dog.breed || "Small dog"}</small></span><b>{checked ? "Included" : "Add"}</b></label>;
                        })}
                      </div>
                      {!selectedOrderCustomer ? <small className="host-order-edit-warning">Customer pets could not be loaded. Refresh before editing this booking.</small> : null}
                    </fieldset>
                    <label>Manual discount RM<input type="number" min="0" step="0.01" value={orderEditForm.manualDiscount} onChange={(event) => setOrderEditForm({ ...orderEditForm, manualDiscount: event.target.value })} /></label>
                    <label className="is-wide">Special request<textarea value={orderEditForm.specialRequest} onChange={(event) => setOrderEditForm({ ...orderEditForm, specialRequest: event.target.value })} /></label>
                    <button type="button" className="host-primary-action is-wide" onClick={() => void saveOrderEdit()}>Save booking changes</button>
                  </div>
                ) : null}
              </section> : (
                <section className="host-void-audit-card">
                  <span>Safe Void audit record</span>
                  <h3>Excluded from business operations</h3>
                  <p>The original order, status and financial values remain preserved. This record no longer affects reporting, capacity, customer orders, diary eligibility or payment actions.</p>
                  <dl>
                    <div><dt>Voided at</dt><dd>{shortDateFromISO(selectedOrder.voidedAt || undefined)}</dd></div>
                    <div><dt>Reason</dt><dd>{selectedOrder.voidReasonCode ? SAFE_VOID_REASON_LABELS[selectedOrder.voidReasonCode] : "Recorded by Primary Owner"}</dd></div>
                    {selectedOrder.voidReason ? <div><dt>Internal note</dt><dd>{selectedOrder.voidReason}</dd></div> : null}
                  </dl>
                </section>
              )}

              {!isVoidedOrder(selectedOrder) ? <div className="host-order-actions">
                {selectedOrder.status === "pending_verification" ? <><button type="button" disabled={paymentConfirming} className="villa-button col-span-2 px-3 py-2 text-xs" onClick={() => void openPaymentConfirmation(selectedOrder, "submission")}>{t({ en: "Verify Payment & Approve", zh: "核实付款并批准" })}</button><button type="button" disabled={paymentConfirming} className="villa-button-outline col-span-2 border-red-200 bg-white px-3 py-2 text-xs text-red-600" onClick={() => void rejectHostPayment(selectedOrder)}>{t({ en: "Reject Payment", zh: "拒绝付款" })}</button></> : null}
                {["confirmed", "balance"].includes(selectedOrder.status) ? <button type="button" disabled={!canMoveOrderTo(selectedOrder, "staying")} title={!canMoveOrderTo(selectedOrder, "staying") ? Math.max(0, selectedOrder.paid || 0) <= 0 ? t({ en: "A verified payment is required before check-in.", zh: "须先有已核实付款，才可入住。" }) : getOrderDateRange(selectedOrder) ? `Check-in opens ${shortDate(getOrderDateRange(selectedOrder)?.start)}` : undefined : undefined} className="villa-button-outline col-span-2 bg-white px-3 py-2 text-xs" onClick={() => void moveHostOrder(selectedOrder, "staying")}>{t({ en: "Check In", zh: "办理入住" })}</button> : null}
                {isCurrentlyAtVilla(selectedOrder) && selectedOrder.balance > 0 ? <button type="button" className="villa-button col-span-2 px-3 py-2 text-xs" onClick={() => void openPaymentConfirmation(selectedOrder, "balance")}>Record {money(selectedOrder.balance)} Balance</button> : null}
                {isCurrentlyAtVilla(selectedOrder) && selectedOrder.balance <= 0 ? <button type="button" className="villa-button col-span-2 px-3 py-2 text-xs" onClick={() => void moveHostOrder(selectedOrder, "ready_pickup")}>Check Out &amp; Complete</button> : null}
                {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" ? <button type="button" disabled={!canMoveOrderTo(selectedOrder, "cancelled")} className="rounded-pill border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-500" onClick={() => void moveHostOrder(selectedOrder, "cancelled")}>Cancel Booking</button> : null}
                <button type="button" className="villa-button-outline col-span-2 bg-white px-3 py-2 text-xs" onClick={() => selectedOrderCustomer && ensureCustomerThread(selectedOrderCustomer)}>Send Message</button>
                {selectedOrderOwner?.phone ? <a className="villa-button-outline col-span-2 bg-white px-3 py-2 text-center text-xs" href={`https://wa.me/${selectedOrderOwner.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Pet Villa booking ${selectedOrder.orderId}: ${selectedOrder.dateLabel}. Please let us know if you need any help.`)}`} target="_blank" rel="noreferrer">WhatsApp Customer</a> : null}
              </div> : null}

              {!isVoidedOrder(selectedOrder) && isPrimaryOwner ? (
                <section className="host-void-danger-zone">
                  <div><span>Primary Owner only</span><h3>Safe Void</h3><p>Use only for a test, duplicate, invalid or created-in-error record. This does not cancel, refund or delete the order.</p></div>
                  <button type="button" onClick={() => openSafeVoid(selectedOrder)}>Void record</button>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {selectedOrder && voidOrderForm && typeof document !== "undefined" ? createPortal(
        <div className="host-modal-backdrop host-void-confirm-backdrop" onClick={() => { if (!voidOrderSaving) setVoidOrderForm(null); }}>
          <div className="host-void-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="safe-void-title" onClick={(event) => event.stopPropagation()}>
            <div className="host-void-confirm-head">
              <div><span>Primary Owner · permanent audit action</span><h2 id="safe-void-title">Safe Void record</h2><p>{selectedOrder.orderId}</p></div>
              <button type="button" disabled={voidOrderSaving} onClick={() => setVoidOrderForm(null)}>Close</button>
            </div>
            <div className="host-void-warning"><strong>This is not Cancel or Refund.</strong><p>The original order row, status, total, paid and balance values will be preserved. The record will be excluded from business operations and customer actions.</p></div>
            <label>Reason<select value={voidOrderForm.reasonCode} onChange={(event) => setVoidOrderForm({ ...voidOrderForm, reasonCode: event.target.value as SafeVoidReasonCode })}>{SAFE_VOID_REASON_CODES.map((code) => <option key={code} value={code}>{SAFE_VOID_REASON_LABELS[code]}</option>)}</select></label>
            <label>Internal reason {voidOrderForm.reasonCode === "other" ? "(required)" : "(optional)"}<textarea value={voidOrderForm.reason} onChange={(event) => setVoidOrderForm({ ...voidOrderForm, reason: event.target.value })} placeholder="Private Host audit note. Customers cannot see this." /></label>
            <label>Type {SAFE_VOID_CONFIRMATION} to confirm<input autoComplete="off" value={voidOrderForm.confirmation} onChange={(event) => setVoidOrderForm({ ...voidOrderForm, confirmation: event.target.value })} placeholder={SAFE_VOID_CONFIRMATION} /></label>
            <label className="host-void-acknowledgement"><input type="checkbox" checked={voidOrderForm.acknowledged} onChange={(event) => setVoidOrderForm({ ...voidOrderForm, acknowledged: event.target.checked })} /><span>{SAFE_VOID_ACKNOWLEDGEMENT}</span></label>
            <div className="host-void-confirm-actions"><button type="button" disabled={voidOrderSaving} onClick={() => setVoidOrderForm(null)}>Keep record</button><button type="button" disabled={voidOrderSaving || voidOrderForm.confirmation !== SAFE_VOID_CONFIRMATION || !voidOrderForm.acknowledged} onClick={() => void confirmSafeVoid()}>{voidOrderSaving ? "Voiding..." : "Permanently mark as void"}</button></div>
          </div>
        </div>,
        document.body
      ) : null}

      {selectedOrder && orderChargeForm && typeof document !== "undefined" ? createPortal(
        <div className="host-modal-backdrop host-finance-modal-backdrop" onClick={() => { if (!orderChargeSaving) setOrderChargeForm(null); }}>
          <div className="host-finance-modal" role="dialog" aria-modal="true" aria-labelledby="add-charge-title" onClick={(event) => event.stopPropagation()}>
            <header><div><span>{t({ en: "Booking charge", zh: "订单加收费用" })}</span><h2 id="add-charge-title">{t({ en: "Add Charge", zh: "加收费用" })}</h2><p>{selectedOrder.orderId} · {ownerForOrder(selectedOrder).name}</p></div><button type="button" disabled={orderChargeSaving} onClick={() => setOrderChargeForm(null)} aria-label={t({ en: "Close", zh: "关闭" })}>×</button></header>
            <div className="host-finance-modal-summary"><span>{t({ en: "Current total", zh: "当前总额" })}<strong>{money(selectedOrder.total)}</strong></span><span>{t({ en: "Current balance", zh: "当前余额" })}<strong>{money(selectedOrder.balance)}</strong></span></div>
            <label><span>{t({ en: "Amount", zh: "金额" })}</span><div className="host-money-input"><b>RM</b><input type="number" min="0.01" step="0.01" inputMode="decimal" autoFocus value={orderChargeForm.amount} onChange={(event) => setOrderChargeForm({ ...orderChargeForm, amount: event.target.value })} placeholder="0.00" /></div></label>
            <label><span>{t({ en: "Reason", zh: "原因" })}</span><select value={orderChargeForm.reasonCode} disabled><option value="late_checkout">{t({ en: "Late Checkout", zh: "延迟退房" })}</option></select></label>
            <label><span>{t({ en: "Note (optional)", zh: "备注（可选）" })}</span><textarea value={orderChargeForm.note} maxLength={500} onChange={(event) => setOrderChargeForm({ ...orderChargeForm, note: event.target.value })} placeholder={t({ en: "Private operational note", zh: "内部营业备注" })} /></label>
            <div className="host-finance-modal-note"><strong>{t({ en: "Paid amount stays unchanged", zh: "已收金额保持不变" })}</strong><p>{t({ en: "This permanently increases this order's total and balance. Collect it later through the existing verified payment flow.", zh: "这会永久增加该订单的总额与余额，之后仍须通过现有核实付款流程收款。" })}</p></div>
            <footer><button type="button" disabled={orderChargeSaving} onClick={() => setOrderChargeForm(null)}>{t({ en: "Cancel", zh: "取消" })}</button><button type="button" disabled={orderChargeSaving || Number(orderChargeForm.amount) <= 0} onClick={() => void saveOrderCharge()}>{orderChargeSaving ? t({ en: "Saving...", zh: "保存中..." }) : t({ en: "Add charge", zh: "确认加收" })}</button></footer>
          </div>
        </div>,
        document.body
      ) : null}

      {expenseForm && typeof document !== "undefined" ? createPortal(
        <div className="host-modal-backdrop host-finance-modal-backdrop" onClick={() => { if (!expenseSaving) setExpenseForm(null); }}>
          <div className="host-finance-modal" role="dialog" aria-modal="true" aria-labelledby="record-expense-title" onClick={(event) => event.stopPropagation()}>
            <header><div><span>{t({ en: "Business expense", zh: "营业支出" })}</span><h2 id="record-expense-title">{t({ en: "Record Expense", zh: "记录支出" })}</h2><p>{t({ en: "Create a permanent, read-only expense record.", zh: "建立永久且只读的支出记录。" })}</p></div><button type="button" disabled={expenseSaving} onClick={() => setExpenseForm(null)} aria-label={t({ en: "Close", zh: "关闭" })}>×</button></header>
            <div className="host-finance-modal-grid">
              <label><span>{t({ en: "Expense date", zh: "支出日期" })}</span><input type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm({ ...expenseForm, expenseDate: event.target.value })} /></label>
              <label><span>{t({ en: "Amount", zh: "金额" })}</span><div className="host-money-input"><b>RM</b><input type="number" min="0.01" max="999999.99" step="0.01" inputMode="decimal" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} placeholder="0.00" /></div><small>{t({ en: "Use up to 2 decimal places.", zh: "最多输入两位小数。" })}</small></label>
            </div>
            <label><span>{t({ en: "Category", zh: "类别" })}</span><select value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value as BusinessExpenseCategory })}><option value="supplies">{t({ en: "Supplies", zh: "用品" })}</option><option value="utilities">{t({ en: "Utilities", zh: "水电杂费" })}</option><option value="maintenance">{t({ en: "Maintenance", zh: "维修" })}</option><option value="transport">{t({ en: "Transport", zh: "交通" })}</option><option value="other">{t({ en: "Other", zh: "其他" })}</option></select></label>
            <label><span>{t({ en: "Note (optional)", zh: "备注（可选）" })}</span><textarea value={expenseForm.note} maxLength={500} onChange={(event) => setExpenseForm({ ...expenseForm, note: event.target.value })} placeholder={t({ en: "What was this expense for?", zh: "这笔支出的用途" })} /></label>
            <div className="host-finance-modal-note"><strong>{t({ en: "Permanent business record", zh: "永久营业记录" })}</strong><p>{t({ en: "Once recorded, this expense cannot be edited or deleted from Host Operations.", zh: "记录后，此支出不可在 Host 后台编辑或删除。" })}</p></div>
            <footer><button type="button" disabled={expenseSaving} onClick={() => setExpenseForm(null)}>{t({ en: "Cancel", zh: "取消" })}</button><button type="button" disabled={expenseSaving || !expenseForm.expenseDate || !isValidExpenseAmount(expenseForm.amount)} onClick={() => void saveBusinessExpense()}>{expenseSaving ? t({ en: "Saving...", zh: "保存中..." }) : t({ en: "Record expense", zh: "记录支出" })}</button></footer>
          </div>
        </div>,
        document.body
      ) : null}

      {paymentConfirm ? (
        <div className="host-modal-backdrop host-payment-confirm-backdrop">
          <div className="host-payment-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="payment-confirm-title">
            <div className="host-payment-confirm-icon">RM</div>
            <span className="host-section-eyebrow">Payment verification</span>
            <h2 id="payment-confirm-title">Confirm {money(paymentConfirm.amount)} received?</h2>
            <p>{paymentConfirm.mode === "submission" ? "Check the QR or bank transaction in your account. Confirming will approve this booking and update the customer balance." : "Only continue after the balance is visible in your bank account. This order will be marked paid in full."}</p>
            <div className="host-payment-confirm-summary">
              <span>Customer<strong>{paymentConfirm.customerName}</strong></span>
              <span>Order ID<strong>{paymentConfirm.orderId}</strong></span>
              <span>Current paid<strong>{money(paymentConfirm.currentPaid)}</strong></span>
              <span>Confirm amount<strong>{money(paymentConfirm.amount)}</strong></span>
              <span>New paid<strong>{money(paymentConfirm.newPaid)}</strong></span>
              <span>Remaining<strong>{money(paymentConfirm.remaining)}</strong></span>
            </div>
            <div className="host-payment-confirm-actions"><button type="button" disabled={paymentConfirming} onClick={() => setPaymentConfirm(null)}>Not yet</button><button type="button" disabled={paymentConfirming} onClick={() => void confirmHostPayment()}>{paymentConfirming ? "Saving..." : "Yes, payment received"}</button></div>
          </div>
        </div>
      ) : null}

      {earlyCheckoutOrderId ? (() => {
        const order = orders.find((item) => item.orderId === earlyCheckoutOrderId);
        if (!order) return null;
        const range = getOrderDateRange(order);
        return (
          <div className="host-modal-backdrop host-payment-confirm-backdrop">
            <div className="host-payment-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="early-checkout-title">
              <div className="host-payment-confirm-icon">OUT</div>
              <span className="host-section-eyebrow">Owner / Admin override</span>
              <h2 id="early-checkout-title">Confirm early checkout?</h2>
              <p>This stay is booked until {shortDate(range?.end)}. Confirm only when the pet has actually left Pet Villa.</p>
              <div className="host-payment-confirm-summary"><span>Customer<strong>{ownerForOrder(order).name}</strong></span><span>Order ID<strong>{order.orderId}</strong></span></div>
              <div className="host-payment-confirm-actions"><button type="button" onClick={() => setEarlyCheckoutOrderId("")}>Keep staying</button><button type="button" onClick={() => { setEarlyCheckoutOrderId(""); void moveHostOrder(order, "ready_pickup", true); }}>Confirm checkout</button></div>
            </div>
          </div>
        );
      })() : null}

      {managedDay ? (
        <div className="host-modal-backdrop">
          <div className="host-day-modal">
            <div className="host-modal-head">
              <div>
                <span>Calendar operations</span>
                <h2>Manage Day</h2>
                <p>{managedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <button type="button" onClick={() => setManagedDay(null)}>Close</button>
            </div>
            <div className="host-day-summary">
              <div>
                <p className="text-xs font-black text-villa-text-secondary">Confirmed Pets</p>
                <strong className="text-2xl font-black">{managedPetCount}</strong>
              </div>
              <div>
                <p className="text-xs font-black text-villa-text-secondary">Status</p>
                <strong className="text-lg font-black">{managedOff ? "Full" : managedPetCount > 0 ? `${managedPetCount} confirmed` : "Available"}</strong>
              </div>
            </div>
            <div className="host-day-capacity-action">
              <div><strong>{managedOff ? "Bookings closed" : "Open for requests"}</strong><span>{managedOff ? "Customers cannot choose this date." : "Use Full when you stop accepting bookings."}</span></div>
              <button type="button" data-full={managedOff || undefined} disabled={calendarSavingDay === toDateKey(managedDay)} onClick={() => void setOffDay(managedDay, !managedOff)}>{calendarSavingDay === toDateKey(managedDay) ? "Saving..." : managedOff ? "Reopen Date" : "Mark as Full"}</button>
            </div>
            <h3 className="host-day-bookings-title">Bookings on this day</h3>
            <div className="host-day-bookings">
              {managedOrders.map((order) => (
                <article key={orderSelectionKey(order)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{ownerForOrder(order).name}</strong>
                      <p className="mt-1 text-xs text-villa-text-secondary">{order.pets.map((pet) => `${pet.name} (${pet.breed || "Small dog"})`).join(", ") || "Pet"}</p>
                      <p className="mt-1 text-xs text-villa-text-muted">{order.serviceLabel} · {orderRangeLabel(order)} · {order.pets.length} pet(s)</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(bookingStatus(order))}`}>{bookingStatus(order)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => {
                      setSelectedOrderId(orderSelectionKey(order));
                      setManagedDay(null);
                    }}>Open Booking</button>
                    <button type="button" onClick={() => {
                      const owner = ownerForOrder(order);
                      setSelectedCustomerId(owner.id);
                      setManagedDay(null);
                      scrollToHostSection("customers");
                    }}>Open Customer</button>
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

export default function HostPage() {
  return <HostAccessGate><HostConsole /></HostAccessGate>;
}
