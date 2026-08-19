"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";

const OBSOLETE_PASSWORD_STORAGE_KEYS = ["pet-villa-registered-user", "pet-villa-registered-users"] as const;

type LocalSessionUser = {
  id: string;
  role: "customer" | "owner" | "host" | "admin";
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
};

function localUserFromSupabase(user: User): LocalSessionUser {
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    role: (metadata.role as LocalSessionUser["role"]) || "customer",
    name: String(metadata.full_name || metadata.name || user.email || "Pet Owner"),
    email: String(user.email || metadata.email || ""),
    phone: String(metadata.phone || user.phone || ""),
    phoneVerified: Boolean(metadata.phone_verified),
    emailVerified: Boolean(user.email_confirmed_at || metadata.email_verified)
  };
}

export function clearObsoleteCustomerPasswordStorage() {
  if (typeof window === "undefined") return;
  for (const key of OBSOLETE_PASSWORD_STORAGE_KEYS) window.localStorage.removeItem(key);
}

export function writeLocalSessionUser(user: LocalSessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("pet-villa-session", JSON.stringify({ user }));
  window.dispatchEvent(new Event("pet-villa-auth"));
}

export async function syncSupabaseSessionToLocalStorage() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  try {
    let data: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"] | null = null;
    let lastError: unknown;
    for (const delay of [0, 250, 750]) {
      if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
      try {
        const result = await supabase.auth.getSession();
        if (result.error) throw result.error;
        data = result.data;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!data) throw lastError || new Error("Supabase session check failed.");
    const user = data.session?.user;
    if (!user) {
      window.localStorage.removeItem("pet-villa-session");
      return null;
    }
    const localUser = localUserFromSupabase(user);
    clearObsoleteCustomerPasswordStorage();
    writeLocalSessionUser(localUser);
    return localUser;
  } catch (error) {
    console.error("Supabase session hydration failed.", error);
    return null;
  }
}

export async function hasAuthSession() {
  if (!isSupabaseConfigured()) return false;
  const user = await syncSupabaseSessionToLocalStorage();
  return Boolean(user);
}

export async function signOutAuth() {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("pet-villa-session");
    window.dispatchEvent(new Event("pet-villa-auth"));
  }
}
