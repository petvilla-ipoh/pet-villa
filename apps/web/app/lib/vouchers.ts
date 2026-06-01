"use client";

import { getCurrentUserId } from "./petProfiles";

export type VoucherStatus = "available" | "used" | "expired";
export type VoucherType = "fixed" | "second_dog_half";

export type VoucherDefinition = {
  code: string;
  type: VoucherType;
  value: number;
  minSpend: number;
  title: { en: string; zh: string };
  body: { en: string; zh: string };
  label: { en: string; zh: string };
};

export type UserVoucher = VoucherDefinition & {
  id: string;
  status: VoucherStatus;
  claimedAt: string;
  usedAt?: string;
  restoredAt?: string;
  orderId?: string;
  discountAmount?: number;
  bookingDateRange?: string;
};

export type VoucherContext = {
  subtotal: number;
  selectedPetCount: number;
  unitTotal: number;
};

export const VOUCHER_DEFINITIONS: VoucherDefinition[] = [
  {
    code: "WELCOME10",
    type: "fixed",
    value: 10,
    minSpend: 40,
    label: { en: "New Guest", zh: "新客专享" },
    title: { en: "RM10 OFF", zh: "RM10 OFF" },
    body: { en: "First boarding discount", zh: "首次寄宿优惠" }
  },
  {
    code: "SECOND50",
    type: "second_dog_half",
    value: 50,
    minSpend: 0,
    label: { en: "Multi-dog", zh: "多只狗狗优惠" },
    title: { en: "50% OFF", zh: "50% OFF" },
    body: { en: "Second dog half price", zh: "第二只狗狗半价" }
  },
  {
    code: "REFER10",
    type: "fixed",
    value: 10,
    minSpend: 40,
    label: { en: "Referral", zh: "推荐好友" },
    title: { en: "RM10 Voucher", zh: "RM10 Voucher" },
    body: { en: "Both sides receive RM10", zh: "双方各得 RM10 优惠" }
  }
];

function voucherKey(userId = getCurrentUserId()) {
  return `pet-villa-vouchers:${userId}`;
}

export function readVouchers(userId = getCurrentUserId()): UserVoucher[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(voucherKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeVouchers(vouchers: UserVoucher[], userId = getCurrentUserId()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(voucherKey(userId), JSON.stringify(vouchers));
  window.dispatchEvent(new Event("pet-villa-vouchers"));
}

export function claimVoucher(code: string, userId = getCurrentUserId()) {
  if (!userId || userId === "guest") {
    return { ok: false as const, reason: "login" as const };
  }
  const definition = VOUCHER_DEFINITIONS.find((voucher) => voucher.code === code);
  if (!definition) {
    return { ok: false as const, reason: "missing" as const };
  }
  const current = readVouchers(userId);
  if (current.some((voucher) => voucher.code === code && voucher.status !== "expired")) {
    return { ok: false as const, reason: "duplicate" as const };
  }
  const nextVoucher: UserVoucher = {
    ...definition,
    id: `${code}-${Date.now()}`,
    status: "available",
    claimedAt: new Date().toISOString()
  };
  writeVouchers([nextVoucher, ...current], userId);
  return { ok: true as const, voucher: nextVoucher };
}

export function getVoucherDiscount(voucher: UserVoucher | null | undefined, context: VoucherContext) {
  if (!voucher || voucher.status !== "available") return 0;
  if (context.subtotal < voucher.minSpend) return 0;
  if (voucher.type === "second_dog_half") {
    return context.selectedPetCount >= 2 ? Math.min(context.subtotal, Math.round(context.unitTotal * 0.5)) : 0;
  }
  return Math.min(context.subtotal, voucher.value);
}

export function getVoucherIneligibility(voucher: UserVoucher, context: VoucherContext) {
  if (voucher.status !== "available") return "Voucher is not available.";
  if (context.subtotal < voucher.minSpend) return `Minimum spend RM${voucher.minSpend}.`;
  if (voucher.type === "second_dog_half" && context.selectedPetCount < 2) return "Select at least 2 dogs.";
  return "";
}

export function markVoucherUsed(voucherId: string, orderId: string, discountAmount: number, bookingDateRange: string, userId = getCurrentUserId()) {
  const next = readVouchers(userId).map((voucher) =>
    voucher.id === voucherId
      ? {
          ...voucher,
          status: "used" as const,
          usedAt: new Date().toISOString(),
          orderId,
          discountAmount,
          bookingDateRange
        }
      : voucher
  );
  writeVouchers(next, userId);
}

export function restoreVoucherForOrder(orderId: string, userId = getCurrentUserId()) {
  const next = readVouchers(userId).map((voucher) =>
    voucher.orderId === orderId && voucher.status === "used"
      ? {
          ...voucher,
          status: "available" as const,
          restoredAt: new Date().toISOString(),
          usedAt: undefined,
          orderId: undefined
        }
      : voucher
  );
  writeVouchers(next, userId);
}
