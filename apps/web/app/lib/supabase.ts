"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_COOKIE_KEY = "sb-pet-villa-auth-token";
let browserClient: SupabaseClient | null = null;

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${encodeURIComponent(name)}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

const cookieStorage = {
  getItem(key: string) {
    return getCookie(key);
  },
  setItem(key: string, value: string) {
    setCookie(key, value);
  },
  removeItem(key: string) {
    removeCookie(key);
  }
};

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          storage: cookieStorage,
          storageKey: SUPABASE_COOKIE_KEY
        }
      }
    );
  }
  return browserClient;
}
