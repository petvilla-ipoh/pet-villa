"use client";

const hostOffDayKey = "pet-villa-host-off-days";

export function readHostOffDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(hostOffDayKey) || "[]") as string[];
  } catch {
    return [];
  }
}

export function writeHostOffDays(days: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(hostOffDayKey, JSON.stringify(days));
  window.dispatchEvent(new Event("pet-villa-availability"));
}

export function isHostOffDay(dateKey: string, offDays = readHostOffDays()) {
  return offDays.includes(dateKey);
}
