"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

const AUTH_RETRY_DELAYS_MS = [0, 200, 500];
const READ_RETRY_DELAYS_MS = [0, 300, 800];

type ErrorLike = {
  code?: string;
  status?: number;
  message?: string;
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function errorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? error as ErrorLike : {};
}

export function isAuthorizationFailure(error: unknown) {
  const candidate = errorLike(error);
  const message = String(candidate.message || "").toLowerCase();
  return candidate.status === 401
    || candidate.status === 403
    || candidate.code === "401"
    || candidate.code === "403"
    || message.includes("unauthorized")
    || message.includes("forbidden")
    || message.includes("permission denied")
    || message.includes("row-level security");
}

export async function getAuthenticatedSupabaseContext() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  for (let attempt = 0; attempt < AUTH_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = AUTH_RETRY_DELAYS_MS[attempt];
    if (delay) await sleep(delay);

    const { data, error } = await supabase.auth.getSession();
    if (data.session?.user) {
      return {
        supabase,
        userId: data.session.user.id,
        user: data.session.user,
        accessToken: data.session.access_token
      };
    }
    if (error && isAuthorizationFailure(error)) return null;
  }

  return null;
}

export async function fetchAuthenticatedCustomerJson<T>(path: string, init: RequestInit = {}) {
  const context = await getAuthenticatedSupabaseContext();
  if (!context?.accessToken) {
    throw Object.assign(new Error("Your customer session expired. Please sign in again."), { status: 401 });
  }

  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...init.headers,
      Authorization: `Bearer ${context.accessToken}`
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(
      new Error(typeof body.error === "string" ? body.error : "Customer data could not be loaded."),
      { status: response.status }
    );
  }
  return body as T;
}

export async function retrySupabaseRead<T>(operation: (attempt: number) => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < READ_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = READ_RETRY_DELAYS_MS[attempt];
    if (delay) await sleep(delay);
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (isAuthorizationFailure(error)) throw error;
    }
  }
  throw lastError;
}

export type AuthenticatedSupabaseContext = {
  supabase: SupabaseClient;
  userId: string;
  accessToken: string;
};
