"use client";

import { getSupabaseBrowserClient } from "./supabase";
import { retrySupabaseRead } from "./dataReliability";
import { normalizeSpecialDateRates, type SpecialDateRate } from "./pricing";

export type BusinessSettings = {
  boardingRate: string;
  daycareRate: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  whatsapp: string;
  notificationSound: boolean;
  autoReply: boolean;
  paymentQrUrl: string;
  paymentQrPath?: string;
  specialDateRates: SpecialDateRate[];
};

type BusinessSettingsRow = {
  boarding_rate_rm: number | string | null;
  daycare_rate_rm: number | string | null;
  account_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  whatsapp_number: string | null;
  notification_sound: boolean | null;
  auto_reply_enabled: boolean | null;
  payment_qr_url: string | null;
  payment_qr_path: string | null;
  special_date_rates: unknown;
};

export const BUSINESS_SETTINGS_KEY = "pet-villa-host-settings";

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  boardingRate: "35",
  daycareRate: "5",
  accountName: "SAM KAH YEE",
  bankName: "Bank Transfer",
  accountNumber: "Pending setup",
  whatsapp: "601163830339",
  notificationSound: true,
  autoReply: false,
  paymentQrUrl: "/petvilla-payment-qr-scan.jpg",
  specialDateRates: []
};

const allowBusinessDevelopmentFallback = process.env.NODE_ENV !== "production"
  && process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true";

function readLocalSettings() {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_SETTINGS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(BUSINESS_SETTINGS_KEY) || "null") as Partial<BusinessSettings> | null;
    return { ...DEFAULT_BUSINESS_SETTINGS, ...(saved || {}) };
  } catch {
    return DEFAULT_BUSINESS_SETTINGS;
  }
}

function writeLocalSettings(settings: BusinessSettings, notify = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(settings));
  if (notify) window.dispatchEvent(new Event("pet-villa-host-settings"));
}

function authoritativeRate(value: number | string | null, field: string) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error(`Pet Villa ${field} pricing is unavailable.`);
  }
  return String(rate);
}

function settingsFromRow(row: BusinessSettingsRow): BusinessSettings {
  return {
    boardingRate: authoritativeRate(row.boarding_rate_rm, "boarding"),
    daycareRate: authoritativeRate(row.daycare_rate_rm, "daycare"),
    accountName: row.account_name || DEFAULT_BUSINESS_SETTINGS.accountName,
    bankName: row.bank_name || DEFAULT_BUSINESS_SETTINGS.bankName,
    accountNumber: row.account_number || DEFAULT_BUSINESS_SETTINGS.accountNumber,
    whatsapp: row.whatsapp_number || DEFAULT_BUSINESS_SETTINGS.whatsapp,
    notificationSound: row.notification_sound ?? DEFAULT_BUSINESS_SETTINGS.notificationSound,
    autoReply: row.auto_reply_enabled ?? DEFAULT_BUSINESS_SETTINGS.autoReply,
    paymentQrUrl: row.payment_qr_url || DEFAULT_BUSINESS_SETTINGS.paymentQrUrl,
    paymentQrPath: row.payment_qr_path || undefined,
    specialDateRates: normalizeSpecialDateRates(row.special_date_rates)
  };
}

export async function loadBusinessSettings() {
  const fallback = readLocalSettings();
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    if (allowBusinessDevelopmentFallback) return fallback;
    throw new Error("Pet Villa business settings are unavailable.");
  }

  try {
    const data = await retrySupabaseRead(async () => {
      const result = await supabase
        .from("business_settings")
        .select("boarding_rate_rm, daycare_rate_rm, account_name, bank_name, account_number, whatsapp_number, notification_sound, auto_reply_enabled, payment_qr_url, payment_qr_path, special_date_rates")
        .eq("id", "pet-villa")
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    });
    if (!data) {
      if (allowBusinessDevelopmentFallback) return fallback;
      throw new Error("Pet Villa business settings have not been configured.");
    }
    const settings = settingsFromRow(data as BusinessSettingsRow);
    writeLocalSettings(settings, false);
    return settings;
  } catch (error) {
    if (allowBusinessDevelopmentFallback) {
      console.warn("Business settings are using the explicit development fallback.", error);
      return fallback;
    }
    console.error("Supabase business settings load failed.", error);
    throw new Error("Pet Villa business settings could not be refreshed.");
  }
}

export async function saveBusinessSettings(settings: BusinessSettings) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    if (allowBusinessDevelopmentFallback) {
      writeLocalSettings(settings);
      return { settings, persisted: false };
    }
    throw new Error("Supabase is not configured for Production business settings.");
  }

  try {
    const { error } = await supabase.from("business_settings").upsert({
      id: "pet-villa",
      boarding_rate_rm: Number(settings.boardingRate) || 0,
      daycare_rate_rm: Number(settings.daycareRate) || 0,
      account_name: settings.accountName,
      bank_name: settings.bankName,
      account_number: settings.accountNumber,
      whatsapp_number: settings.whatsapp,
      notification_sound: settings.notificationSound,
      auto_reply_enabled: settings.autoReply,
      payment_qr_url: settings.paymentQrUrl,
      payment_qr_path: settings.paymentQrPath || null,
      special_date_rates: normalizeSpecialDateRates(settings.specialDateRates)
    }, { onConflict: "id" });
    if (error) throw error;
    writeLocalSettings(settings);
    return { settings, persisted: true };
  } catch (error) {
    if (allowBusinessDevelopmentFallback) {
      writeLocalSettings(settings);
      console.warn("Business settings save failed; using the explicit development fallback.", error);
      return { settings, persisted: false, error };
    }
    throw new Error("Business settings could not be saved to Supabase.");
  }
}

export async function uploadBusinessPaymentQr(file: File, current: BusinessSettings) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `pet-villa/payment-qr-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("business-assets").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: true
  });
  if (error) throw error;
  const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
  const next = { ...current, paymentQrUrl: data.publicUrl, paymentQrPath: path };
  const result = await saveBusinessSettings(next);
  if (!result.persisted) throw new Error("The QR image uploaded, but business settings could not be saved.");
  return next;
}
