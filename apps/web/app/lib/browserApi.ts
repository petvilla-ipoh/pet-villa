export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type WebSession = {
  user: {
    id: string;
    role: string;
    name: string;
    email: string;
  };
  host?: {
    id: string;
  } | null;
  token?: string;
};

const sessionKey = "pet-villa-session";
const petKey = "pet-villa-pet-id";
const hostKey = "pet-villa-host-id";
const bookingKey = "pet-villa-booking-id";

export function getSession(): WebSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey);
  return raw ? JSON.parse(raw) as WebSession : null;
}

export function saveSession(session: WebSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  if (session.host?.id) window.localStorage.setItem(hostKey, session.host.id);
}

export function clearSession() {
  window.localStorage.removeItem(sessionKey);
}

export function saveRecent(key: "pet" | "host" | "booking", value: string) {
  const storageKey = key === "pet" ? petKey : key === "host" ? hostKey : bookingKey;
  window.localStorage.setItem(storageKey, value);
}

export function getRecent(key: "pet" | "host" | "booking") {
  if (typeof window === "undefined") return "";
  const storageKey = key === "pet" ? petKey : key === "host" ? hostKey : bookingKey;
  return window.localStorage.getItem(storageKey) ?? "";
}

export async function apiRequest<T>(path: string, options: RequestInit & { userId?: string; hostId?: string; idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined)
  };

  if (options.userId) headers["x-user-id"] = options.userId;
  if (options.hostId) headers["x-host-id"] = options.hostId;
  if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "API request failed.");
  }

  return payload.data as T;
}
