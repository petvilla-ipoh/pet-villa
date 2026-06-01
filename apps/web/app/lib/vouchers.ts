"use client";

import { getCurrentUserId } from "./petProfiles";

export type VoucherStatus = "available" | "used" | "expired";
export type VoucherType = "fixed" | "second_dog_half";

export type VoucherDefinition = {
  code: string;
  type: VoucherType;
  value: number;
  minSpend: number;
  claimable: boolean;
  source: "promotion" | "referral";
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
    claimable: true,
    source: "promotion",
    label: { en: "New Guest", zh: "新客专享" },
    title: { en: "RM10 OFF", zh: "RM10 OFF" },
    body: { en: "First boarding discount", zh: "首次寄宿优惠" }
  },
  {
    code: "SECOND50",
    type: "second_dog_half",
    value: 50,
    minSpend: 0,
    claimable: true,
    source: "promotion",
    label: { en: "Multi-dog", zh: "多只狗狗优惠" },
    title: { en: "50% OFF", zh: "50% OFF" },
    body: { en: "Second dog half price", zh: "第二只狗狗半价" }
  },
  {
    code: "REFER10",
    type: "fixed",
    value: 10,
    minSpend: 40,
    claimable: false,
    source: "referral",
    label: { en: "Referral Program", zh: "推荐奖励" },
    title: { en: "RM10 Voucher", zh: "RM10 Voucher" },
    body: {
      en: "Issued only after your friend verifies email and completes their first order.",
      zh: "好友验证邮箱并完成第一笔订单后才发放。"
    }
  }
];

function voucherKey(userId = getCurrentUserId()) {
  return `pet-villa-vouchers:${userId}`;
}

function referralMapKey() {
  return "pet-villa-referral-code-map";
}

function pendingReferralKey(userId = getCurrentUserId()) {
  return `pet-villa-pending-referral:${userId}`;
}

function getSessionUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user || null;
  } catch {
    return null;
  }
}

function readReferralMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(referralMapKey()) || "{}");
  } catch {
    return {};
  }
}

function writeReferralMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(referralMapKey(), JSON.stringify(map));
}

function makeNamePrefix(name: string) {
  const cleaned = name.trim().replace(/[^a-zA-Z]/g, "");
  if (!cleaned) return "PV";
  return cleaned.slice(0, 3).toUpperCase();
}

export function getReferralCode(userId = getCurrentUserId()) {
  const user = getSessionUser();
  const name = user?.name || user?.fullName || "";
  const phoneDigits = `${user?.phone || ""}`.replace(/\D/g, "");
  const fallbackSource = `${userId || "0000"}`.replace(/[^a-zA-Z0-9]/g, "");
  const suffix = phoneDigits ? phoneDigits.slice(-4).padStart(4, "0") : fallbackSource.slice(-4).toUpperCase().padStart(4, "0");
  const code = `PETVILLA-${makeNamePrefix(name)}${suffix}`;
  const map = readReferralMap();
  if (userId && userId !== "guest" && map[code] !== userId) {
    writeReferralMap({ ...map, [code]: userId });
  }
  return code;
}

export function savePendingReferralCode(code: string, userId = getCurrentUserId()) {
  if (typeof window === "undefined") return;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  window.localStorage.setItem(pendingReferralKey(userId), JSON.stringify({
    code: normalized,
    registeredAt: new Date().toISOString(),
    emailVerified: true,
    firstOrderCompleted: false,
    rewarded: false
  }));
}

export function readPendingReferralCode(userId = getCurrentUserId()) {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(pendingReferralKey(userId)) || "null") as null | {
      code: string;
      registeredAt: string;
      emailVerified: boolean;
      firstOrderCompleted: boolean;
      rewarded: boolean;
    };
  } catch {
    return null;
  }
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

function addReferralVoucher(userId: string, orderId: string) {
  const definition = VOUCHER_DEFINITIONS.find((voucher) => voucher.code === "REFER10");
  if (!definition) return;
  const current = readVouchers(userId);
  if (current.some((voucher) => voucher.code === "REFER10" && voucher.orderId === orderId)) return;
  const nextVoucher: UserVoucher = {
    ...definition,
    id: `REFER10-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: "available",
    claimedAt: new Date().toISOString()
  };
  writeVouchers([nextVoucher, ...current], userId);
}

export function completeReferralRewardForFirstOrder(orderId: string, userId = getCurrentUserId()) {
  const pending = readPendingReferralCode(userId);
  if (!pending || pending.rewarded || !pending.emailVerified) return false;
  const referrerId = readReferralMap()[pending.code];
  if (!referrerId || referrerId === userId) return false;

  addReferralVoucher(userId, orderId);
  addReferralVoucher(referrerId, orderId);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(pendingReferralKey(userId), JSON.stringify({
      ...pending,
      firstOrderCompleted: true,
      rewarded: true,
      rewardedAt: new Date().toISOString(),
      orderId
    }));
  }
  return true;
}

export function claimVoucher(code: string, userId = getCurrentUserId()) {
  if (!userId || userId === "guest") {
    return { ok: false as const, reason: "login" as const };
  }
  const definition = VOUCHER_DEFINITIONS.find((voucher) => voucher.code === code);
  if (!definition) {
    return { ok: false as const, reason: "missing" as const };
  }
  if (!definition.claimable) {
    return { ok: false as const, reason: "referral_only" as const };
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
