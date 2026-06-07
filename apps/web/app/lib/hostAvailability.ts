"use client";

import { getSupabaseBrowserClient } from "./supabase";

const hostOffDayKey = "pet-villa-host-off-days";

type HostOffDayRow = {
  day: string;
};

async function getSupabaseContext() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return { supabase, userId: error ? null : data.user?.id || null };
}

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
  void saveHostOffDaysToSupabase(days).catch((error) => console.warn("Supabase host off days save failed; using localStorage fallback.", error));
}

export async function loadHostOffDays() {
  const fallback = readHostOffDays();
  try {
    const context = await getSupabaseContext();
    if (!context) return fallback;
    const { data, error } = await context.supabase.from("host_off_days").select("day").order("day", { ascending: true });
    if (error) throw error;
    const days = ((data || []) as HostOffDayRow[]).map((row) => row.day).filter(Boolean);
    if (typeof window !== "undefined") window.localStorage.setItem(hostOffDayKey, JSON.stringify(days));
    return days;
  } catch (error) {
    console.warn("Supabase host off days load failed; using localStorage fallback.", error);
    return fallback;
  }
}

async function saveHostOffDaysToSupabase(days: string[]) {
  const context = await getSupabaseContext();
  if (!context) return;
  const uniqueDays = Array.from(new Set(days)).sort();
  const { data, error } = await context.supabase.from("host_off_days").select("day");
  if (error) throw error;
  const currentDays = ((data || []) as HostOffDayRow[]).map((row) => row.day);
  const currentSet = new Set(currentDays);
  const nextSet = new Set(uniqueDays);
  const additions = uniqueDays.filter((day) => !currentSet.has(day));
  const removals = currentDays.filter((day) => !nextSet.has(day));

  if (additions.length > 0) {
    const { error: insertError } = await context.supabase.from("host_off_days").upsert(
      additions.map((day) => ({ day, created_by: context.userId })),
      { onConflict: "day" }
    );
    if (insertError) throw insertError;
  }

  await Promise.all(
    removals.map(async (day) => {
      const { error: deleteError } = await context.supabase.from("host_off_days").delete().eq("day", day);
      if (deleteError) throw deleteError;
    })
  );
}

export function isHostOffDay(dateKey: string, offDays = readHostOffDays()) {
  return offDays.includes(dateKey);
}
