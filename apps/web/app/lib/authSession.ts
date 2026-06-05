"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";

type LocalSessionUser = {
  id: string;
  role: "owner" | "host" | "admin";
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
    role: (metadata.role as LocalSessionUser["role"]) || "owner",
    name: String(metadata.full_name || metadata.name || user.email || "Pet Owner"),
    email: String(user.email || metadata.email || ""),
    phone: String(metadata.phone || user.phone || ""),
    phoneVerified: Boolean(metadata.phone_verified),
    emailVerified: Boolean(user.email_confirmed_at || metadata.email_verified)
  };
}

export function readLocalSessionUser(): LocalSessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user || null;
  } catch {
    return null;
  }
}

export function writeLocalSessionUser(user: LocalSessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("pet-villa-session", JSON.stringify({ user }));
  window.dispatchEvent(new Event("pet-villa-auth"));
}

export async function upsertSupabaseProfile(user: User, extra?: Partial<LocalSessionUser>) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const localUser = { ...localUserFromSupabase(user), ...extra };
  await supabase.from("profiles").upsert({
    id: user.id,
    full_name: localUser.name,
    phone: localUser.phone,
    email: localUser.email,
    role: localUser.role,
    phone_verified: localUser.phoneVerified,
    email_verified: localUser.emailVerified,
    updated_at: new Date().toISOString()
  });
}

export async function syncSupabaseSessionToLocalStorage() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return readLocalSessionUser();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return readLocalSessionUser();
  const localUser = localUserFromSupabase(user);
  writeLocalSessionUser(localUser);
  void upsertSupabaseProfile(user, localUser);
  return localUser;
}

export async function hasAuthSession() {
  if (readLocalSessionUser()) return true;
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
