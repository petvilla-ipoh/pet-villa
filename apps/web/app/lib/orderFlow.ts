"use client";

import { getCurrentUserId, type PetProfile } from "./petProfiles";
import { completeReferralRewardForFirstOrder, markVoucherUsed } from "./vouchers";

export type BookingDraft = {
  id: string;
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

function draftKey(userId = getCurrentUserId()) {
  return `pet-villa-booking-draft:${userId}`;
}

function orderKey(userId = getCurrentUserId()) {
  return `pet-villa-orders:${userId}`;
}

export function saveBookingDraft(draft: BookingDraft, userId = getCurrentUserId()) {
  window.localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  window.dispatchEvent(new Event("pet-villa-booking-draft"));
}

export function readBookingDraft(userId = getCurrentUserId()): BookingDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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

export function writeOrders(orders: VillaOrder[], userId = getCurrentUserId()) {
  window.localStorage.setItem(orderKey(userId), JSON.stringify(orders));
  window.dispatchEvent(new Event("pet-villa-orders"));
}

export function createOrderFromDraft(draft: BookingDraft, paid: number, userId = getCurrentUserId()) {
  const orders = readOrders(userId);
  const orderId = `order-${Date.now()}`;
  const order: VillaOrder = {
    ...draft,
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
  return order;
}

export function updateOrder(orderId: string, updater: (order: VillaOrder) => VillaOrder, userId = getCurrentUserId()) {
  const current = readOrders(userId);
  const previous = current.find((order) => order.orderId === orderId);
  const next = current.map((order) => (order.orderId === orderId ? updater(order) : order));
  writeOrders(next, userId);
  const updated = next.find((order) => order.orderId === orderId);
  if (updated?.status === "completed" && previous?.status !== "completed") {
    completeReferralRewardForFirstOrder(orderId, userId);
  }
  return next;
}
