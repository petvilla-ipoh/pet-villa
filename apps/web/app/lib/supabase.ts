"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserAuthCookieStorage } from "./authCookieStorage";

const SUPABASE_COOKIE_KEY = "sb-pet-villa-auth-token";
const AUTH_PERSISTENCE_KEY = "pet-villa-auth-persistence";
let browserClient: SupabaseClient | null = null;
let googleOAuthClient: SupabaseClient | null = null;

const cookieStorage = createBrowserAuthCookieStorage(AUTH_PERSISTENCE_KEY);

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

export function getSupabaseGoogleOAuthClient() {
  if (!isSupabaseConfigured()) return null;
  if (!googleOAuthClient) {
    googleOAuthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
          persistSession: true,
          storage: cookieStorage,
          storageKey: SUPABASE_COOKIE_KEY
        }
      }
    );
  }
  return googleOAuthClient;
}

export function setAuthPersistence(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_PERSISTENCE_KEY, remember ? "persistent" : "session");
}

export function clearAuthPersistence() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_PERSISTENCE_KEY);
}
