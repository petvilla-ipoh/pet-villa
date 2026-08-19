"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser, getCurrentUserId, type PetProfile } from "./petProfiles";
import { getSupabaseBrowserClient } from "./supabase";
import { fetchAuthenticatedCustomerJson, getAuthenticatedSupabaseContext, retrySupabaseRead } from "./dataReliability";
import { markVoucherUsed, restoreVoucherForOrder, type AppliedVoucher } from "./vouchers";
import { isBusinessOrder, isVoidedOrder, type SafeVoidReasonCode } from "./safeVoid";

export type BookingDraft = {
  id: string;
  bookingId?: string;
  service: "overnight" | "daycare";
  serviceLabel: string;
  dateLabel: string;
  startDateISO?: string;
  endDateISO?: string;
  startTime?: string;
  endTime?: string;
  nights: number;
  hours: number;
  pets: Array<Pick<PetProfile, "id" | "name" | "breed" | "weight" | "photoDataUrl">>;
  total: number;
  subtotal?: number;
  voucherId?: string;
  voucherCode?: string;
  voucherTitle?: string;
  voucherDiscount?: number;
  manualDiscount?: number;
  appliedVouchers?: AppliedVoucher[];
  deposit: number;
  balance: number;
  specialRequest: string;
  operationalWhatsappConsentLanguage?: "en" | "zh";
  createdAt: string;
};

export type VillaOrder = BookingDraft & {
  orderRowId?: string;
  orderId: string;
  customerId?: string;
  customerSource?: "auth" | "host";
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paid: number;
  chargeTotal?: number;
  charges?: OrderCharge[];
  status: "pending_verification" | "balance" | "active" | "confirmed" | "staying" | "awaiting_checkout" | "ready_pickup" | "completed" | "cancelled";
  cancelledAt?: string;
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidReasonCode?: SafeVoidReasonCode | null;
  voidReason?: string | null;
  photosAvailable: number;
  paymentSubmission?: {
    id?: string;
    amount: number;
    method: "qr" | "bank";
    submittedAt: string;
  };
  completedAt?: string | null;
  checkedInAt?: string | null;
  checkedInBusinessDate?: string | null;
  paymentVerifications?: Array<{
    amount: number;
    mode: "submission" | "balance";
    verifiedAt: string;
  }>;
  legacyCollectionAttributions?: Array<{
    amount: number;
    businessMonth: string;
    precision: "month_only";
    attributedAt: string;
  }>;
  review?: {
    stars: number;
    body: string;
    createdAt: string;
  };
};

export type OrderCharge = {
  id: string;
  amount: number;
  reasonCode: "late_checkout";
  note: string;
  createdAt: string;
  createdBy?: string | null;
};

type BookingRow = {
  id: string;
  client_draft_id: string | null;
  service: BookingDraft["service"] | null;
  service_label: string | null;
  date_label: string | null;
  start_date: string | null;
  end_date: string | null;
  nights: number | null;
  hours: number | string | null;
  pets: BookingDraft["pets"] | null;
  subtotal_rm: number | string | null;
  total_rm: number | string | null;
  deposit_rm: number | string | null;
  balance_rm: number | string | null;
  voucher_id: string | null;
  voucher_code: string | null;
  voucher_title: string | null;
  voucher_discount_rm: number | string | null;
  special_request: string | null;
  draft_payload: BookingDraft | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_row_id?: string | null;
  owner_id: string | null;
  host_customer_id?: string | null;
  booking_id: string | null;
  order_id: string;
  client_draft_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service: BookingDraft["service"] | null;
  service_label: string | null;
  date_label: string | null;
  start_date: string | null;
  end_date: string | null;
  nights: number | null;
  hours: number | string | null;
  pets: BookingDraft["pets"] | null;
  subtotal_rm: number | string | null;
  total_rm: number | string | null;
  deposit_rm: number | string | null;
  balance_rm: number | string | null;
  paid_rm: number | string | null;
  voucher_id: string | null;
  voucher_code: string | null;
  voucher_title: string | null;
  voucher_discount_rm: number | string | null;
  manual_discount_rm: number | string | null;
  charge_total_rm?: number | string | null;
  order_charges?: Array<{
    id: string;
    amount_rm: number | string;
    reason_code: "late_checkout";
    note: string | null;
    created_at: string;
    created_by: string | null;
  }> | null;
  special_request: string | null;
  status: VillaOrder["status"];
  cancelled_at: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason_code?: SafeVoidReasonCode | null;
  void_reason?: string | null;
  completed_at?: string | null;
  checked_in_at?: string | null;
  checked_in_business_date?: string | null;
  payment_verifications?: VillaOrder["paymentVerifications"] | null;
  legacy_collection_attributions?: VillaOrder["legacyCollectionAttributions"] | null;
  photos_available: number | null;
  review: VillaOrder["review"] | null;
  order_payload: VillaOrder | null;
  created_at: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowHostDevelopmentFallback = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true";
const allowCustomerDevelopmentFallback = process.env.NODE_ENV !== "production"
  && process.env.NEXT_PUBLIC_ENABLE_CUSTOMER_LOCAL_FALLBACK === "true";

function draftKey(userId = getCurrentUserId()) {
  return `pet-villa-booking-draft:${userId}`;
}

function orderKey(userId = getCurrentUserId()) {
  return `pet-villa-owner-scoped-orders-v2:${userId}`;
}

function bookingMigrationKey(userId = getCurrentUserId()) {
  return `pet-villa-bookings-supabase-migrated:${userId}`;
}

function orderMigrationKey(userId = getCurrentUserId()) {
  return `pet-villa-orders-supabase-migrated:${userId}`;
}

function isUuid(value?: string) {
  return Boolean(value && UUID_PATTERN.test(value));
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSen(value: number | undefined) {
  return Math.round((value || 0) * 100);
}

async function getSupabaseContext() {
  return getAuthenticatedSupabaseContext();
}

function writeBookingDraft(draft: BookingDraft, userId = getCurrentUserId(), notify = true) {
  window.localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  if (notify) window.dispatchEvent(new Event("pet-villa-booking-draft"));
}

function bookingServiceType(service: BookingDraft["service"]) {
  return service === "overnight" ? "overnight_boarding" : "daycare";
}

function bookingPayload(draft: BookingDraft, ownerId: string, webStatus: "draft" | "ordered" = "draft") {
  return {
    owner_id: ownerId,
    client_draft_id: draft.id,
    service: draft.service,
    service_type: bookingServiceType(draft.service),
    service_label: draft.serviceLabel,
    date_label: draft.dateLabel,
    start_date: draft.startDateISO || null,
    end_date: draft.endDateISO || null,
    start_at: draft.startDateISO ? `${draft.startDateISO}T00:00:00+08:00` : null,
    end_at: draft.endDateISO ? `${draft.endDateISO}T23:59:59+08:00` : null,
    nights: draft.nights || 0,
    hours: draft.hours || 0,
    pets: draft.pets,
    subtotal_rm: draft.subtotal ?? draft.total,
    total_rm: draft.total,
    deposit_rm: draft.deposit,
    balance_rm: draft.balance,
    subtotal_sen: toSen(draft.total),
    deposit_sen: toSen(draft.deposit),
    final_payment_sen: toSen(draft.balance),
    currency: "MYR",
    voucher_id: draft.voucherId || null,
    voucher_code: draft.voucherCode || null,
    voucher_title: draft.voucherTitle || null,
    voucher_discount_rm: draft.voucherDiscount || 0,
    special_request: draft.specialRequest || "",
    owner_notes: draft.specialRequest || null,
    status: "pending_confirmation",
    web_status: webStatus,
    draft_payload: draft
  };
}

function draftFromRow(row: BookingRow): BookingDraft {
  const payload = (row.draft_payload || {}) as Partial<BookingDraft>;
  return {
    id: payload.id || row.client_draft_id || row.id,
    bookingId: row.id,
    service: row.service || payload.service || "overnight",
    serviceLabel: row.service_label || payload.serviceLabel || "",
    dateLabel: row.date_label || payload.dateLabel || "",
    startDateISO: row.start_date || payload.startDateISO,
    endDateISO: row.end_date || payload.endDateISO,
    nights: row.nights ?? payload.nights ?? 0,
    hours: toNumber(row.hours) || payload.hours || 0,
    pets: row.pets || payload.pets || [],
    total: toNumber(row.total_rm) || payload.total || 0,
    subtotal: toNumber(row.subtotal_rm) || payload.subtotal,
    voucherId: row.voucher_id || payload.voucherId,
    voucherCode: row.voucher_code || payload.voucherCode,
    voucherTitle: row.voucher_title || payload.voucherTitle,
    voucherDiscount: toNumber(row.voucher_discount_rm) || payload.voucherDiscount,
    appliedVouchers: payload.appliedVouchers,
    deposit: toNumber(row.deposit_rm) || payload.deposit || 0,
    balance: toNumber(row.balance_rm) || payload.balance || 0,
    specialRequest: row.special_request || payload.specialRequest || "",
    createdAt: payload.createdAt || row.created_at
  };
}

async function upsertSupabaseBookingDraft(draft: BookingDraft, webStatus: "draft" | "ordered" = "draft", ownerId?: string) {
  const context = await getSupabaseContext();
  const userId = ownerId || context?.userId;
  if (!context || !userId || !isUuid(userId)) return null;

  const { data, error } = await context.supabase
    .from("bookings")
    .upsert(bookingPayload(draft, userId, webStatus), { onConflict: "owner_id,client_draft_id" })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string | undefined;
}

export async function saveBookingDraft(draft: BookingDraft, userId = getCurrentUserId()) {
  const context = await getSupabaseContext();
  if (!context) {
    if (allowCustomerDevelopmentFallback) {
      writeBookingDraft(draft, userId);
      return draft;
    }
    throw new Error("Please sign in again before continuing to payment.");
  }
  try {
    const bookingId = await upsertSupabaseBookingDraft(draft, "draft", context.userId);
    if (!bookingId) throw new Error("Booking draft was not saved.");
    const synced = { ...draft, bookingId };
    writeBookingDraft(synced, context.userId, false);
    window.localStorage.setItem(bookingMigrationKey(context.userId), "true");
    window.dispatchEvent(new Event("pet-villa-booking-draft"));
    return synced;
  } catch (error) {
    if (allowCustomerDevelopmentFallback) {
      console.warn("Supabase booking draft save failed; using the explicit development fallback.", error);
      writeBookingDraft(draft, userId);
      return draft;
    }
    console.error("Supabase booking draft save failed.", error);
    throw new Error("Your booking could not be saved. Please check your connection and try again.");
  }
}

export function readBookingDraft(userId = getCurrentUserId()): BookingDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadBookingDraft() {
  const fallbackUserId = getCurrentUserId();
  const fallback = readBookingDraft(fallbackUserId);
  const context = await getSupabaseContext();
  if (!context) {
    if (allowCustomerDevelopmentFallback) return fallback;
    throw new Error("Please sign in again to continue your booking.");
  }

  try {
    if (allowCustomerDevelopmentFallback && fallback) {
      const bookingId = await upsertSupabaseBookingDraft(fallback, "draft", context.userId);
      const synced = bookingId ? { ...fallback, bookingId } : fallback;
      writeBookingDraft(synced, context.userId, false);
      window.localStorage.setItem(bookingMigrationKey(context.userId), "true");
      return synced;
    }

    const data = await retrySupabaseRead(async () => {
      const response = await fetchAuthenticatedCustomerJson<{ booking: BookingRow | null }>("/api/customer/booking-draft");
      return response.booking;
    });
    if (!data) return null;
    const draft = draftFromRow(data as BookingRow);
    writeBookingDraft(draft, context.userId, false);
    window.localStorage.setItem(bookingMigrationKey(context.userId), "true");
    return draft;
  } catch (error) {
    if (allowCustomerDevelopmentFallback) {
      console.warn("Supabase booking draft load failed; using the explicit development fallback.", error);
      return fallback;
    }
    console.error("Supabase booking draft load failed.", error);
    throw new Error("Your booking could not be loaded. Please return to Booking and try again.");
  }
}

export function readOrders(userId = getCurrentUserId()): VillaOrder[] {
  try {
    const raw = window.localStorage.getItem(orderKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeOrders(orders: VillaOrder[], userId = getCurrentUserId(), notify = true) {
  window.localStorage.setItem(orderKey(userId), JSON.stringify(orders));
  if (notify) window.dispatchEvent(new Event("pet-villa-orders"));
}

function orderPayload(order: VillaOrder, ownerId: string, bookingId?: string) {
  return {
    owner_id: ownerId,
    booking_id: bookingId || order.bookingId || null,
    order_id: order.orderId,
    client_draft_id: order.id,
    customer_name: order.customerName || getCurrentUser()?.name || "",
    customer_phone: order.customerPhone || getCurrentUser()?.phone || "",
    customer_email: order.customerEmail || getCurrentUser()?.email || "",
    service: order.service,
    service_label: order.serviceLabel,
    date_label: order.dateLabel,
    start_date: order.startDateISO || null,
    end_date: order.endDateISO || null,
    nights: order.nights || 0,
    hours: order.hours || 0,
    pets: order.pets,
    subtotal_rm: order.subtotal ?? order.total,
    total_rm: order.total,
    deposit_rm: order.deposit,
    balance_rm: order.balance,
    paid_rm: order.paid,
    currency: "MYR",
    voucher_id: order.voucherId || null,
    voucher_code: order.voucherCode || null,
    voucher_title: order.voucherTitle || null,
    voucher_discount_rm: order.voucherDiscount || 0,
    manual_discount_rm: order.manualDiscount || 0,
    charge_total_rm: order.chargeTotal || 0,
    special_request: order.specialRequest || "",
    status: order.status,
    cancelled_at: order.cancelledAt || null,
    photos_available: order.photosAvailable || 0,
    review: order.review || null,
    order_payload: order
  };
}

function orderFromRow(row: OrderRow): VillaOrder {
  const payload = (row.order_payload || {}) as Partial<VillaOrder>;
  return {
    ...payload,
    id: payload.id || row.client_draft_id || row.order_id,
    bookingId: row.booking_id || payload.bookingId,
    orderRowId: row.order_row_id || row.id,
    orderId: row.order_id,
    customerId: row.owner_id || row.host_customer_id || payload.customerId,
    customerSource: row.host_customer_id ? "host" : "auth",
    customerName: row.customer_name || payload.customerName || "",
    customerPhone: row.customer_phone || payload.customerPhone || "",
    customerEmail: row.customer_email || payload.customerEmail || "",
    service: row.service || payload.service || "overnight",
    serviceLabel: row.service_label || payload.serviceLabel || "",
    dateLabel: row.date_label || payload.dateLabel || "",
    startDateISO: row.start_date || payload.startDateISO,
    endDateISO: row.end_date || payload.endDateISO,
    nights: row.nights ?? payload.nights ?? 0,
    hours: toNumber(row.hours) || payload.hours || 0,
    pets: row.pets || payload.pets || [],
    subtotal: toNumber(row.subtotal_rm) || payload.subtotal,
    total: toNumber(row.total_rm) || payload.total || 0,
    deposit: toNumber(row.deposit_rm) || payload.deposit || 0,
    balance: toNumber(row.balance_rm),
    paid: toNumber(row.paid_rm),
    voucherId: row.voucher_id || payload.voucherId,
    voucherCode: row.voucher_code || payload.voucherCode,
    voucherTitle: row.voucher_title || payload.voucherTitle,
    voucherDiscount: toNumber(row.voucher_discount_rm) || payload.voucherDiscount,
    manualDiscount: toNumber(row.manual_discount_rm) || payload.manualDiscount || 0,
    chargeTotal: toNumber(row.charge_total_rm) || payload.chargeTotal || 0,
    charges: (row.order_charges || []).map((charge) => ({
      id: charge.id,
      amount: toNumber(charge.amount_rm),
      reasonCode: charge.reason_code,
      note: charge.note || "",
      createdAt: charge.created_at,
      createdBy: charge.created_by
    })),
    appliedVouchers: payload.appliedVouchers,
    specialRequest: row.special_request || payload.specialRequest || "",
    status: row.status,
    cancelledAt: row.cancelled_at || payload.cancelledAt,
    voidedAt: row.voided_at || payload.voidedAt || null,
    voidedBy: row.voided_by || payload.voidedBy || null,
    voidReasonCode: row.void_reason_code || payload.voidReasonCode || null,
    voidReason: row.void_reason || payload.voidReason || null,
    completedAt: row.completed_at || payload.completedAt || null,
    checkedInAt: row.checked_in_at || payload.checkedInAt || null,
    checkedInBusinessDate: row.checked_in_business_date || payload.checkedInBusinessDate || null,
    paymentVerifications: row.payment_verifications || payload.paymentVerifications || [],
    legacyCollectionAttributions: row.legacy_collection_attributions || payload.legacyCollectionAttributions || [],
    photosAvailable: row.photos_available ?? payload.photosAvailable ?? 0,
    review: row.review || payload.review,
    createdAt: payload.createdAt || row.created_at
  };
}

type CustomerOrdersResponse = {
  orders: OrderRow[];
  reviews: Array<{
    order_id: string;
    rating: number | string | null;
    comment: string | null;
    quote: { en?: string; zh?: string } | null;
    created_at: string;
  }>;
};

async function listCustomerOrders() {
  const { orders: data, reviews } = await fetchAuthenticatedCustomerJson<CustomerOrdersResponse>("/api/customer/orders");
  const reviewsByOrder = new Map<string, VillaOrder["review"]>();
  for (const review of reviews || []) {
    const quote = review.quote && typeof review.quote === "object" ? review.quote : {};
    reviewsByOrder.set(review.order_id, {
      stars: Number(review.rating || 0),
      body: review.comment || quote.en || quote.zh || "",
      createdAt: review.created_at
    });
  }
  return ((data || []) as OrderRow[]).map((row) => {
    const order = orderFromRow(row);
    return reviewsByOrder.has(order.orderId) ? { ...order, review: reviewsByOrder.get(order.orderId) } : order;
  });
}

export async function saveOrderSnapshotToSupabase(order: VillaOrder, ownerId?: string) {
  const context = await getSupabaseContext();
  const userId = (isUuid(ownerId) ? ownerId : undefined) || (isUuid(order.customerId) ? order.customerId : undefined) || context?.userId;
  if (!context || !userId || !isUuid(userId)) return null;

  let bookingId = order.bookingId;
  if (!bookingId && order.id && userId === context.userId) {
    bookingId = await upsertSupabaseBookingDraft(order, "ordered", userId) || undefined;
  }

  const { data, error } = await context.supabase
    .from("orders")
    .insert(orderPayload({ ...order, bookingId }, userId, bookingId))
    .select("id")
    .single();
  if (error) {
    if (error.code !== "23505") throw error;
    const { data: existing, error: existingError } = await context.supabase
      .from("orders")
      .select("id")
      .eq("owner_id", userId)
      .eq("order_id", order.orderId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing?.id) throw error;
    return existing.id as string;
  }

  if (bookingId) {
    await context.supabase.from("bookings").update({ web_status: "ordered" }).eq("id", bookingId);
  }
  return data?.id as string | undefined;
}

async function migrateLocalOrdersToSupabase(orders: VillaOrder[], ownerId: string) {
  for (const order of orders) {
    await saveOrderSnapshotToSupabase({ ...order, customerId: ownerId }, ownerId);
  }
}

export async function loadOrders() {
  const fallbackUserId = getCurrentUserId();
  const fallback = readOrders(fallbackUserId);
  const context = await getSupabaseContext();
  if (!context) {
    if (allowCustomerDevelopmentFallback) return fallback;
    throw new Error("Your orders could not be loaded. Please sign in again or try later.");
  }

  try {
    const migrationKey = orderMigrationKey(context.userId);
    const migrationDone = window.localStorage.getItem(migrationKey) === "true";
    let orders = await retrySupabaseRead(() => listCustomerOrders());
    if (!migrationDone && orders.length === 0 && fallback.length > 0) {
      await migrateLocalOrdersToSupabase(fallback, context.userId);
      orders = await retrySupabaseRead(() => listCustomerOrders());
    }
    orders = orders.filter(isBusinessOrder);
    writeOrders(orders, context.userId, false);
    window.localStorage.setItem(migrationKey, "true");
    return orders;
  } catch (error) {
    if (allowCustomerDevelopmentFallback) return fallback;
    console.error("Supabase orders load failed.", error);
    throw new Error("Your orders could not be loaded from Pet Villa. Please try again.");
  }
}

function readAllLocalOrders(): VillaOrder[] {
  if (typeof window === "undefined") return [];
  const orders: VillaOrder[] = [];
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-owner-scoped-orders-v2:") || key.startsWith("pet-villa-orders:"))
    .forEach((key) => {
      try {
        orders.push(...JSON.parse(window.localStorage.getItem(key) || "[]"));
      } catch {
        // Ignore malformed fallback records.
      }
    });
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function loadAllOrdersForHost() {
  const context = await getSupabaseContext();
  if (!context) {
    if (allowHostDevelopmentFallback) return readAllLocalOrders();
    throw new Error("Host orders could not be loaded. Please sign in again.");
  }

  try {
    const orders = await retrySupabaseRead(async () => {
      const { data: sessionData, error: sessionError } = await context.supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        throw Object.assign(new Error("Your Host session expired. Please sign in again."), { status: 401 });
      }

      const response = await fetch("/api/host/orders", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(
          new Error(body.error || "Host orders could not be loaded."),
          { status: response.status }
        );
      }
      return ((body.orders || []) as OrderRow[]).map(orderFromRow);
    });
    const grouped = new Map<string, VillaOrder[]>();
    for (const order of orders) {
      if (!order.customerId) continue;
      grouped.set(order.customerId, [...(grouped.get(order.customerId) || []), order]);
    }
    grouped.forEach((items, ownerId) => writeOrders(items, ownerId, false));
    return orders;
  } catch (error) {
    if (allowHostDevelopmentFallback) return readAllLocalOrders();
    console.error("Supabase host orders load failed.", error);
    throw new Error("Host orders could not be loaded from Supabase. Please try again.");
  }
}

export async function createOrderFromDraft(draft: BookingDraft, paid: number, userId = getCurrentUserId()) {
  const orders = readOrders(userId);
  // A draft keeps one stable order identity so a retried payment submission cannot
  // create a second order after an ambiguous network response.
  const orderId = `PV-${draft.id.replace(/^draft-/, "").replace(/[^a-z0-9]/gi, "").toUpperCase()}`;
  const currentUser = getCurrentUser();
  const order: VillaOrder = {
    ...draft,
    customerId: currentUser?.id || userId,
    customerName: currentUser?.name || "",
    customerPhone: currentUser?.phone || "",
    customerEmail: currentUser?.email || "",
    orderId,
    paid,
    balance: Math.max(0, draft.total - paid),
    status: paid > 0 ? "confirmed" : "balance",
    photosAvailable: 0
  };
  const appliedVouchers = paid > 0
    ? draft.appliedVouchers?.length
      ? draft.appliedVouchers
      : draft.voucherId && (draft.voucherDiscount || 0) > 0
        ? [{ id: draft.voucherId, code: draft.voucherCode || "", title: draft.voucherTitle || "", discount: draft.voucherDiscount || 0 }]
        : []
    : [];
  let reservedVoucherCount = 0;
  try {
    for (const voucher of appliedVouchers) {
      await markVoucherUsed(voucher.id, orderId, voucher.discount, draft.dateLabel, userId);
      reservedVoucherCount += 1;
    }
    const bookingId = await upsertSupabaseBookingDraft(draft, "ordered");
    const persistedId = await saveOrderSnapshotToSupabase({ ...order, bookingId: bookingId ?? undefined });
    if (!persistedId) throw new Error("Authenticated Supabase order persistence is unavailable.");
    order.orderRowId = persistedId;
    window.localStorage.setItem(orderMigrationKey(userId), "true");
  } catch (error) {
    try {
      const recovered = (await loadOrders()).find((item) => item.orderId === orderId || item.id === draft.id);
      if (recovered) return recovered;
    } catch (recoveryError) {
      console.error("Order persistence recovery check failed.", recoveryError);
    }
    if (reservedVoucherCount > 0) {
      try {
        await restoreVoucherForOrder(orderId, userId);
      } catch (restoreError) {
        console.error("Order save failed and its reserved voucher could not be restored.", restoreError);
      }
    }
    if (!allowCustomerDevelopmentFallback) throw new Error("Your booking could not be saved. Please try again.");
    console.warn("Supabase order create failed; using the explicit development fallback.", error);
  }
  writeOrders([order, ...orders], userId);
  return order;
}

export async function ensureOrderFromDraft(draft: BookingDraft, userId = getCurrentUserId()) {
  const orders = await loadOrders();
  const formalOrderId = `PV-${draft.id.replace(/^draft-/, "").replace(/[^a-z0-9]/gi, "").toUpperCase()}`;
  const existing = orders.find((order) =>
    order.id === draft.id
    || order.orderId === formalOrderId
    || order.orderId === `order-${draft.id}`
  );
  if (existing?.status === "cancelled") {
    throw new Error("This booking was cancelled. Please create a new booking before paying.");
  }
  if (existing) return existing;
  return createOrderFromDraft(draft, 0, userId);
}

async function customerOrderOperation(order: VillaOrder, operation: string, body?: unknown) {
  if (!order.orderRowId || !isUuid(order.orderRowId)) {
    throw new Error("This order is missing its secure record identity. Please refresh and try again.");
  }
  if (isVoidedOrder(order)) throw new Error("This order is no longer available for customer actions.");
  const context = await getSupabaseContext();
  if (!context) throw new Error("Please sign in again before updating this order.");
  const { data: sessionData, error: sessionError } = await context.supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Your session expired. Please sign in again.");
  const response = await fetch(`/api/customer/orders/${encodeURIComponent(order.orderRowId)}/${operation}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Your order update could not be saved.");
  return loadOrders();
}

export async function submitCustomerPayment(order: VillaOrder, amount: number, method: "qr" | "bank", idempotencyKey: string) {
  if (!isUuid(idempotencyKey)) throw new Error("This payment submission needs a secure retry key. Please try again.");
  return customerOrderOperation(order, "payment-submission", { amount, method, idempotencyKey });
}

export async function recordOperationalWhatsAppConsent(order: VillaOrder, language: "en" | "zh") {
  if (!order.orderRowId || !isUuid(order.orderRowId)) {
    throw new Error("This booking is missing its secure record identity. Please refresh and try again.");
  }
  const context = await getSupabaseContext();
  if (!context) throw new Error("Please sign in again before recording operational WhatsApp consent.");
  const { data: sessionData, error: sessionError } = await context.supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Your session expired. Please sign in again.");
  const response = await fetch(`/api/customer/orders/${encodeURIComponent(order.orderRowId)}/operational-whatsapp-consent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ language })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Operational WhatsApp consent could not be saved.");
  return result;
}

export async function cancelCustomerOrder(order: VillaOrder) {
  return customerOrderOperation(order, "cancel");
}
