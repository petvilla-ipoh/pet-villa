"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser, getCurrentUserId, type PetProfile } from "./petProfiles";
import { getSupabaseBrowserClient } from "./supabase";
import { completeReferralRewardForFirstOrder, markVoucherUsed } from "./vouchers";

export type BookingDraft = {
  id: string;
  bookingId?: string;
  service: "overnight" | "daycare";
  serviceLabel: string;
  dateLabel: string;
  startDateISO?: string;
  endDateISO?: string;
  nights: number;
  hours: number;
  pets: Array<Pick<PetProfile, "id" | "name" | "breed" | "weight" | "photoDataUrl">>;
  total: number;
  subtotal?: number;
  voucherId?: string;
  voucherCode?: string;
  voucherTitle?: string;
  voucherDiscount?: number;
  deposit: number;
  balance: number;
  specialRequest: string;
  createdAt: string;
};

export type VillaOrder = BookingDraft & {
  orderId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paid: number;
  status: "balance" | "active" | "confirmed" | "staying" | "awaiting_checkout" | "ready_pickup" | "completed" | "cancelled";
  cancelledAt?: string;
  photosAvailable: number;
  review?: {
    stars: number;
    body: string;
    createdAt: string;
  };
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
  owner_id: string;
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
  special_request: string | null;
  status: VillaOrder["status"];
  cancelled_at: string | null;
  photos_available: number | null;
  review: VillaOrder["review"] | null;
  order_payload: VillaOrder | null;
  created_at: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function draftKey(userId = getCurrentUserId()) {
  return `pet-villa-booking-draft:${userId}`;
}

function orderKey(userId = getCurrentUserId()) {
  return `pet-villa-orders:${userId}`;
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
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
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

export function saveBookingDraft(draft: BookingDraft, userId = getCurrentUserId()) {
  writeBookingDraft(draft, userId);
  void upsertSupabaseBookingDraft(draft)
    .then((bookingId) => {
      if (!bookingId) return;
      writeBookingDraft({ ...draft, bookingId }, userId, false);
      window.localStorage.setItem(bookingMigrationKey(userId), "true");
    })
    .catch((error) => console.warn("Supabase booking draft save failed; using localStorage fallback.", error));
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
  if (!context) return fallback;

  try {
    if (fallback) {
      const bookingId = await upsertSupabaseBookingDraft(fallback, "draft", context.userId);
      const synced = bookingId ? { ...fallback, bookingId } : fallback;
      writeBookingDraft(synced, context.userId, false);
      window.localStorage.setItem(bookingMigrationKey(context.userId), "true");
      return synced;
    }

    const { data, error } = await context.supabase
      .from("bookings")
      .select("id, client_draft_id, service, service_label, date_label, start_date, end_date, nights, hours, pets, subtotal_rm, total_rm, deposit_rm, balance_rm, voucher_id, voucher_code, voucher_title, voucher_discount_rm, special_request, draft_payload, created_at")
      .eq("web_status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const draft = draftFromRow(data as BookingRow);
    writeBookingDraft(draft, context.userId, false);
    window.localStorage.setItem(bookingMigrationKey(context.userId), "true");
    return draft;
  } catch (error) {
    console.warn("Supabase booking draft load failed; using localStorage fallback.", error);
    return fallback;
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
    orderId: row.order_id,
    customerId: row.owner_id,
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
    specialRequest: row.special_request || payload.specialRequest || "",
    status: row.status,
    cancelledAt: row.cancelled_at || payload.cancelledAt,
    photosAvailable: row.photos_available ?? payload.photosAvailable ?? 0,
    review: row.review || payload.review,
    createdAt: payload.createdAt || row.created_at
  };
}

async function listSupabaseOrders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, owner_id, booking_id, order_id, client_draft_id, customer_name, customer_phone, customer_email, service, service_label, date_label, start_date, end_date, nights, hours, pets, subtotal_rm, total_rm, deposit_rm, balance_rm, paid_rm, voucher_id, voucher_code, voucher_title, voucher_discount_rm, special_request, status, cancelled_at, photos_available, review, order_payload, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as OrderRow[]).map(orderFromRow);
}

export async function saveOrderSnapshotToSupabase(order: VillaOrder, ownerId?: string) {
  const context = await getSupabaseContext();
  const userId = (isUuid(ownerId) ? ownerId : undefined) || (isUuid(order.customerId) ? order.customerId : undefined) || context?.userId;
  if (!context || !userId || !isUuid(userId)) return null;

  let bookingId = order.bookingId;
  if (!bookingId && order.id && userId === context.userId) {
    bookingId = await upsertSupabaseBookingDraft(order, "ordered", userId) || undefined;
  }

  if (userId !== context.userId) {
    const { data, error } = await context.supabase
      .from("orders")
      .update(orderPayload({ ...order, bookingId }, userId, bookingId))
      .eq("owner_id", userId)
      .eq("order_id", order.orderId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data?.id as string | undefined;
  }

  const { data, error } = await context.supabase
    .from("orders")
    .upsert(orderPayload({ ...order, bookingId }, userId, bookingId), { onConflict: "owner_id,order_id" })
    .select("id")
    .single();
  if (error) throw error;

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
  if (!context) return fallback;

  try {
    const migrationKey = orderMigrationKey(context.userId);
    const migrationDone = window.localStorage.getItem(migrationKey) === "true";
    let orders = await listSupabaseOrders(context.supabase);
    if (!migrationDone && orders.length === 0 && fallback.length > 0) {
      await migrateLocalOrdersToSupabase(fallback, context.userId);
      orders = await listSupabaseOrders(context.supabase);
    }
    writeOrders(orders, context.userId, false);
    window.localStorage.setItem(migrationKey, "true");
    return orders;
  } catch (error) {
    console.warn("Supabase orders load failed; using localStorage fallback.", error);
    return fallback;
  }
}

function readAllLocalOrders(): VillaOrder[] {
  if (typeof window === "undefined") return [];
  const orders: VillaOrder[] = [];
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-orders:"))
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
  if (!context) return readAllLocalOrders();

  try {
    const orders = await listSupabaseOrders(context.supabase);
    const grouped = new Map<string, VillaOrder[]>();
    for (const order of orders) {
      if (!order.customerId) continue;
      grouped.set(order.customerId, [...(grouped.get(order.customerId) || []), order]);
    }
    grouped.forEach((items, ownerId) => writeOrders(items, ownerId, false));
    return orders;
  } catch (error) {
    console.warn("Supabase host orders load failed; using localStorage fallback.", error);
    return readAllLocalOrders();
  }
}

export async function createOrderFromDraft(draft: BookingDraft, paid: number, userId = getCurrentUserId()) {
  const orders = readOrders(userId);
  const orderId = `order-${Date.now()}`;
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
  writeOrders([order, ...orders], userId);
  if (draft.voucherId && (draft.voucherDiscount || 0) > 0 && paid > 0) {
    markVoucherUsed(draft.voucherId, orderId, draft.voucherDiscount || 0, draft.dateLabel, userId);
  }
  try {
    const bookingId = await upsertSupabaseBookingDraft(draft, "ordered");
    await saveOrderSnapshotToSupabase({ ...order, bookingId });
    window.localStorage.setItem(orderMigrationKey(userId), "true");
  } catch (error) {
    console.warn("Supabase order create failed; using localStorage fallback.", error);
  }
  return order;
}

export async function updateOrder(orderId: string, updater: (order: VillaOrder) => VillaOrder, userId = getCurrentUserId()) {
  const current = readOrders(userId);
  const previous = current.find((order) => order.orderId === orderId);
  const next = current.map((order) => (order.orderId === orderId ? updater(order) : order));
  writeOrders(next, userId);
  const updated = next.find((order) => order.orderId === orderId);
  if (updated) {
    try {
      await saveOrderSnapshotToSupabase(updated);
    } catch (error) {
      console.warn("Supabase order update failed; using localStorage fallback.", error);
    }
  }
  if (updated?.status === "completed" && previous?.status !== "completed") {
    completeReferralRewardForFirstOrder(orderId, userId);
  }
  return next;
}
