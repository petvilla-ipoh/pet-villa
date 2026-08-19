"use client";

import { getAuthenticatedSupabaseContext } from "./dataReliability";

const hostOffDayKey = "pet-villa-host-off-days";
const allowDevelopmentFallback = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type PublicAvailabilityResponse = {
  fullDates?: unknown;
  error?: unknown;
};

async function getSupabaseContext() {
  return getAuthenticatedSupabaseContext();
}

export function readHostOffDays(): string[] {
  if (!allowDevelopmentFallback || typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(hostOffDayKey) || "[]") as string[];
  } catch {
    return [];
  }
}

export async function setHostOffDay(day: string, full: boolean) {
  if (typeof window === "undefined") throw new Error("Calendar is only available in the Host browser session.");
  const context = await getSupabaseContext();
  if (!context) throw new Error("A verified Host session is required to update Calendar availability.");
  const { data: sessionData, error: sessionError } = await context.supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Your Host session expired. Please sign in again.");

  const response = await fetch("/api/host/calendar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ day, full })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Calendar availability could not be updated.");

  window.dispatchEvent(new Event("pet-villa-availability"));
  return loadHostOffDays();
}

export async function loadHostOffDays() {
  const fallback = allowDevelopmentFallback ? readHostOffDays() : [];
  try {
    const response = await fetch("/api/public/availability", { cache: "no-store" });
    const body = await response.json().catch(() => ({})) as PublicAvailabilityResponse;
    if (!response.ok) {
      throw Object.assign(new Error(
        typeof body.error === "string" ? body.error : "Booking availability could not be loaded."
      ), { status: response.status });
    }
    if (!Array.isArray(body.fullDates) || body.fullDates.some((day) => typeof day !== "string" || !BUSINESS_DATE_PATTERN.test(day))) {
      throw new Error("Booking availability returned an invalid response.");
    }
    const days = Array.from(new Set(body.fullDates as string[])).sort();
    if (allowDevelopmentFallback && typeof window !== "undefined") {
      window.localStorage.setItem(hostOffDayKey, JSON.stringify(days));
    }
    return days;
  } catch (error) {
    if (allowDevelopmentFallback) {
      console.warn("Supabase host off days load failed; using the explicit development fallback.", error);
      return fallback;
    }
    console.error("Public availability load failed.", error);
    throw new Error("Booking availability could not be refreshed.");
  }
}

export function isHostOffDay(dateKey: string, offDays = readHostOffDays()) {
  return offDays.includes(dateKey);
}
