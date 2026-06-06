"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "./petProfiles";
import { getSupabaseBrowserClient } from "./supabase";

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

type VoucherRow = {
  id: string;
  owner_id: string;
  code: string;
  voucher_type: VoucherType;
  value_rm: number | string | null;
  min_spend_rm: number | string | null;
  source: "promotion" | "referral";
  title: { en?: string; zh?: string } | null;
  body: { en?: string; zh?: string } | null;
  label: { en?: string; zh?: string } | null;
  status: VoucherStatus;
  claimed_at: string;
  used_at: string | null;
  restored_at: string | null;
  order_id: string | null;
  discount_amount_rm: number | string | null;
  booking_date_range: string | null;
  voucher_payload: Partial<UserVoucher> | null;
};

type ReferralCodeRow = {
  owner_id: string;
  code: string;
};

export const VOUCHER_DEFINITIONS: VoucherDefinition[] = [
  {
    code: "WELCOME10",
    type: "fixed",
    value: 10,
    minSpend: 35,
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
    minSpend: 35,
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

function couponKey(userId = getCurrentUserId()) {
  return `pet-villa-coupons:${userId}`;
}

function referralMapKey() {
  return "pet-villa-referral-code-map";
}

function pendingReferralKey(userId = getCurrentUserId()) {
  return `pet-villa-pending-referral:${userId}`;
}

function voucherMigrationKey(userId = getCurrentUserId()) {
  return `pet-villa-vouchers-supabase-migrated:${userId}`;
}

function getSessionUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user || null;
  } catch {
    return null;
  }
}

async function getSupabaseContext() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function copyValue(value: { en?: string; zh?: string } | null | undefined, fallback: { en: string; zh: string }) {
  return {
    en: value?.en || fallback.en,
    zh: value?.zh || fallback.zh
  };
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

function writeClaimedCoupons(vouchers: UserVoucher[], userId = getCurrentUserId()) {
  if (typeof window === "undefined") return;
  const promotionCodes = vouchers.filter((voucher) => voucher.source === "promotion").map((voucher) => voucher.code);
  window.localStorage.setItem(couponKey(userId), JSON.stringify(Array.from(new Set(promotionCodes))));
}

function makeNamePrefix(name: string) {
  const cleaned = name.trim().replace(/[^a-zA-Z]/g, "");
  if (!cleaned) return "PV";
  return cleaned.slice(0, 3).toUpperCase();
}

function buildReferralCode(userId = getCurrentUserId()) {
  const user = getSessionUser();
  const name = user?.name || user?.fullName || "";
  const phoneDigits = `${user?.phone || ""}`.replace(/\D/g, "");
  const fallbackSource = `${userId || "0000"}`.replace(/[^a-zA-Z0-9]/g, "");
  const suffix = phoneDigits ? phoneDigits.slice(-4).padStart(4, "0") : fallbackSource.slice(-4).toUpperCase().padStart(4, "0");
  return `PETVILLA-${makeNamePrefix(name)}${suffix}`;
}

function rememberReferralCode(code: string, userId = getCurrentUserId()) {
  const map = readReferralMap();
  if (userId && userId !== "guest" && map[code] !== userId) {
    writeReferralMap({ ...map, [code]: userId });
  }
}

function voucherFromRow(row: VoucherRow): UserVoucher {
  const definition = VOUCHER_DEFINITIONS.find((voucher) => voucher.code === row.code);
  const fallback = definition || VOUCHER_DEFINITIONS[0];
  return {
    code: row.code,
    type: row.voucher_type || fallback.type,
    value: toNumber(row.value_rm) || fallback.value,
    minSpend: toNumber(row.min_spend_rm),
    claimable: definition?.claimable ?? row.source === "promotion",
    source: row.source || fallback.source,
    title: copyValue(row.title, fallback.title),
    body: copyValue(row.body, fallback.body),
    label: copyValue(row.label, fallback.label),
    id: row.id,
    status: row.status,
    claimedAt: row.claimed_at,
    usedAt: row.used_at || undefined,
    restoredAt: row.restored_at || undefined,
    orderId: row.order_id || undefined,
    discountAmount: toNumber(row.discount_amount_rm) || undefined,
    bookingDateRange: row.booking_date_range || undefined
  };
}

function rowFromVoucher(voucher: UserVoucher, ownerId: string) {
  return {
    id: voucher.id,
    owner_id: ownerId,
    code: voucher.code,
    voucher_type: voucher.type,
    value_rm: voucher.value,
    min_spend_rm: voucher.minSpend,
    source: voucher.source,
    title: voucher.title,
    body: voucher.body,
    label: voucher.label,
    status: voucher.status,
    claimed_at: voucher.claimedAt,
    used_at: voucher.usedAt || null,
    restored_at: voucher.restoredAt || null,
    order_id: voucher.orderId || null,
    discount_amount_rm: voucher.discountAmount || null,
    booking_date_range: voucher.bookingDateRange || null,
    voucher_payload: voucher
  };
}

async function listSupabaseVouchers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("vouchers")
    .select("id, owner_id, code, voucher_type, value_rm, min_spend_rm, source, title, body, label, status, claimed_at, used_at, restored_at, order_id, discount_amount_rm, booking_date_range, voucher_payload")
    .order("claimed_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as VoucherRow[]).map(voucherFromRow);
}

async function migrateLocalVouchersToSupabase(supabase: SupabaseClient, ownerId: string, vouchers: UserVoucher[]) {
  if (vouchers.length === 0) return;
  const { error } = await supabase.from("vouchers").upsert(vouchers.map((voucher) => rowFromVoucher(voucher, ownerId)), { onConflict: "id" });
  if (error) throw error;
}

async function refreshLocalVouchersFromSupabase(supabase: SupabaseClient, userId: string) {
  const vouchers = await listSupabaseVouchers(supabase);
  writeVouchers(vouchers, userId, false);
  writeClaimedCoupons(vouchers, userId);
  window.localStorage.setItem(voucherMigrationKey(userId), "true");
  return vouchers;
}

async function syncReferralCodeToSupabase(code: string, userId = getCurrentUserId()) {
  const context = await getSupabaseContext();
  if (!context || context.userId !== userId) return null;
  const { data, error } = await context.supabase.rpc("upsert_referral_code", { p_code: code });
  if (error) throw error;
  return data as ReferralCodeRow | null;
}

async function savePendingReferralToSupabase(code: string, userId = getCurrentUserId()) {
  const context = await getSupabaseContext();
  if (!context || context.userId !== userId) return false;
  const { data, error } = await context.supabase.rpc("save_pending_referral", { p_referral_code: code });
  if (error) throw error;
  return Boolean(data);
}

async function completeReferralRewardInSupabase(orderId: string, userId = getCurrentUserId()) {
  const context = await getSupabaseContext();
  if (!context || context.userId !== userId) return false;
  const { data, error } = await context.supabase.rpc("complete_referral_reward", { p_order_id: orderId });
  if (error) throw error;
  await refreshLocalVouchersFromSupabase(context.supabase, context.userId);
  return Boolean(data);
}

async function markVoucherUsedInSupabase(voucherId: string, orderId: string, discountAmount: number, bookingDateRange: string, userId = getCurrentUserId()) {
  const context = await getSupabaseContext();
  if (!context || context.userId !== userId) return null;
  const { error } = await context.supabase.rpc("mark_voucher_used", {
    p_voucher_id: voucherId,
    p_order_id: orderId,
    p_discount_amount: discountAmount,
    p_booking_date_range: bookingDateRange
  });
  if (error) throw error;
  return refreshLocalVouchersFromSupabase(context.supabase, context.userId);
}

async function restoreVoucherForOrderInSupabase(orderId: string, userId = getCurrentUserId()) {
  const context = await getSupabaseContext();
  if (!context || context.userId !== userId) return null;
  const { error } = await context.supabase.rpc("restore_voucher_for_order", { p_order_id: orderId });
  if (error) throw error;
  return refreshLocalVouchersFromSupabase(context.supabase, context.userId);
}

export function getReferralCode(userId = getCurrentUserId()) {
  const code = buildReferralCode(userId);
  rememberReferralCode(code, userId);
  void syncReferralCodeToSupabase(code, userId).catch((error) => console.warn("Supabase referral code save failed; using localStorage fallback.", error));
  return code;
}

export async function loadReferralCode(userId = getCurrentUserId()) {
  const fallbackCode = getReferralCode(userId);
  const context = await getSupabaseContext();
  if (!context || context.userId !== userId) return fallbackCode;

  try {
    const { data, error } = await context.supabase.from("referral_codes").select("owner_id, code").eq("owner_id", context.userId).maybeSingle();
    if (error) throw error;
    if (data?.code) {
      rememberReferralCode(data.code, context.userId);
      return data.code;
    }
    const saved = await syncReferralCodeToSupabase(fallbackCode, context.userId);
    return saved?.code || fallbackCode;
  } catch (error) {
    console.warn("Supabase referral code load failed; using localStorage fallback.", error);
    return fallbackCode;
  }
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
  void savePendingReferralToSupabase(normalized, userId).catch((error) => console.warn("Supabase pending referral save failed; using localStorage fallback.", error));
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

export function writeVouchers(vouchers: UserVoucher[], userId = getCurrentUserId(), notify = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(voucherKey(userId), JSON.stringify(vouchers));
  writeClaimedCoupons(vouchers, userId);
  if (notify) window.dispatchEvent(new Event("pet-villa-vouchers"));
}

export async function loadVouchers() {
  const fallbackUserId = getCurrentUserId();
  const fallback = readVouchers(fallbackUserId);
  const context = await getSupabaseContext();
  if (!context) return fallback;

  try {
    const migrationKey = voucherMigrationKey(context.userId);
    const migrationDone = window.localStorage.getItem(migrationKey) === "true";
    let vouchers = await listSupabaseVouchers(context.supabase);
    if (!migrationDone && vouchers.length === 0 && fallback.length > 0) {
      await migrateLocalVouchersToSupabase(context.supabase, context.userId, fallback);
      vouchers = await listSupabaseVouchers(context.supabase);
    }
    writeVouchers(vouchers, context.userId, false);
    window.localStorage.setItem(migrationKey, "true");
    return vouchers;
  } catch (error) {
    console.warn("Supabase vouchers load failed; using localStorage fallback.", error);
    return fallback;
  }
}

function addReferralVoucher(userId: string, orderId: string) {
  const definition = VOUCHER_DEFINITIONS.find((voucher) => voucher.code === "REFER10");
  if (!definition) return;
  const current = readVouchers(userId);
  if (current.some((voucher) => voucher.code === "REFER10" && voucher.id.includes(orderId))) return;
  const nextVoucher: UserVoucher = {
    ...definition,
    id: `REFER10-${orderId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: "available",
    claimedAt: new Date().toISOString()
  };
  writeVouchers([nextVoucher, ...current], userId);
}

export function completeReferralRewardForFirstOrder(orderId: string, userId = getCurrentUserId()) {
  const pending = readPendingReferralCode(userId);
  void completeReferralRewardInSupabase(orderId, userId).catch((error) => console.warn("Supabase referral reward failed; using localStorage fallback.", error));
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

export async function claimVoucherOnline(code: string, userId = getCurrentUserId()) {
  if (!userId || userId === "guest") {
    return { ok: false as const, reason: "login" as const };
  }

  const definition = VOUCHER_DEFINITIONS.find((voucher) => voucher.code === code);
  if (!definition) return { ok: false as const, reason: "missing" as const };
  if (!definition.claimable) return { ok: false as const, reason: "referral_only" as const };

  const context = await getSupabaseContext();
  if (!context || context.userId !== userId) {
    return claimVoucher(code, userId);
  }

  try {
    const payload = {
      ...definition,
      id: `${code}-${Date.now()}`
    };
    const { data, error } = await context.supabase.rpc("claim_voucher", { p_code: code, p_voucher_payload: payload });
    if (error) {
      const message = error.message || "";
      if (message.includes("duplicate_voucher_claim") || message.includes("duplicate key")) {
        await refreshLocalVouchersFromSupabase(context.supabase, context.userId);
        return { ok: false as const, reason: "duplicate" as const };
      }
      throw error;
    }
    const voucher = voucherFromRow(data as VoucherRow);
    const vouchers = await refreshLocalVouchersFromSupabase(context.supabase, context.userId);
    return { ok: true as const, voucher: vouchers.find((item) => item.id === voucher.id) || voucher };
  } catch (error) {
    console.warn("Supabase voucher claim failed; using localStorage fallback.", error);
    return claimVoucher(code, userId);
  }
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

export async function validateVoucherForBooking(voucher: UserVoucher | null | undefined, context: VoucherContext) {
  const localDiscount = getVoucherDiscount(voucher, context);
  if (!voucher) return { ok: true as const, discount: 0 };
  if (localDiscount <= 0) return { ok: false as const, reason: getVoucherIneligibility(voucher, context) || "Voucher is not available.", discount: 0 };

  const supabaseContext = await getSupabaseContext();
  if (!supabaseContext) return { ok: true as const, discount: localDiscount };

  try {
    const { data, error } = await supabaseContext.supabase.rpc("validate_voucher_for_booking", {
      p_voucher_id: voucher.id,
      p_subtotal: context.subtotal,
      p_selected_pet_count: context.selectedPetCount,
      p_unit_total: context.unitTotal
    });
    if (error) throw error;
    if (!data?.ok) {
      await refreshLocalVouchersFromSupabase(supabaseContext.supabase, supabaseContext.userId);
      return { ok: false as const, reason: String(data?.reason || "voucher_unavailable"), discount: 0 };
    }
    return { ok: true as const, discount: toNumber(data.discount) || localDiscount };
  } catch (error) {
    console.warn("Supabase voucher validation failed; using localStorage fallback.", error);
    return { ok: true as const, discount: localDiscount };
  }
}

export function markVoucherUsed(voucherId: string, orderId: string, discountAmount: number, bookingDateRange: string, userId = getCurrentUserId()) {
  const next = readVouchers(userId).map((voucher) =>
    voucher.id === voucherId
      ? {
          ...voucher,
          status: "used" as const,
          usedAt: new Date().toISOString(),
          restoredAt: undefined,
          orderId,
          discountAmount,
          bookingDateRange
        }
      : voucher
  );
  writeVouchers(next, userId);
  void markVoucherUsedInSupabase(voucherId, orderId, discountAmount, bookingDateRange, userId).catch((error) => console.warn("Supabase voucher use failed; using localStorage fallback.", error));
}

export function restoreVoucherForOrder(orderId: string, userId = getCurrentUserId()) {
  const next = readVouchers(userId).map((voucher) =>
    voucher.orderId === orderId && voucher.status === "used"
      ? {
          ...voucher,
          status: "available" as const,
          restoredAt: new Date().toISOString(),
          usedAt: undefined,
          orderId: undefined,
          discountAmount: undefined,
          bookingDateRange: undefined
        }
      : voucher
  );
  writeVouchers(next, userId);
  void restoreVoucherForOrderInSupabase(orderId, userId).catch((error) => console.warn("Supabase voucher restore failed; using localStorage fallback.", error));
}
