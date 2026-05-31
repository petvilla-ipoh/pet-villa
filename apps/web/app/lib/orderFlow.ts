"use client";

import { getCurrentUserId, type PetProfile } from "./petProfiles";

export type BookingDraft = {
  id: string;
  service: "overnight" | "daycare";
  serviceLabel: string;
  dateLabel: string;
  nights: number;
  hours: number;
  pets: Array<Pick<PetProfile, "id" | "name" | "breed" | "weight" | "photoDataUrl">>;
  total: number;
  deposit: number;
  balance: number;
  specialRequest: string;
  createdAt: string;
};

export type VillaOrder = BookingDraft & {
  orderId: string;
  paid: number;
  status: "balance" | "active" | "confirmed" | "completed" | "cancelled";
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
  const order: VillaOrder = {
    ...draft,
    orderId: `order-${Date.now()}`,
    paid,
    balance: Math.max(0, draft.total - paid),
    status: paid >= draft.total ? "confirmed" : "balance",
    photosAvailable: 0
  };
  writeOrders([order, ...orders], userId);
  return order;
}

export function updateOrder(orderId: string, updater: (order: VillaOrder) => VillaOrder, userId = getCurrentUserId()) {
  const next = readOrders(userId).map((order) => (order.orderId === orderId ? updater(order) : order));
  writeOrders(next, userId);
  return next;
}
