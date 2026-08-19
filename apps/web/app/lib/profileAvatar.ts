"use client";

export type AvatarKind =
  | "human-01"
  | "human-02"
  | "human-03"
  | "human-04"
  | "human-05"
  | "human-06"
  | "human-07"
  | "human-08"
  | "human-09"
  | "human-10"
  | "human-11"
  | "human-12";

export const avatarOptions: Array<{ id: AvatarKind; en: string; zh: string; tone: "female" | "male" }> = [
  { id: "human-01", en: "Ari", zh: "Ari", tone: "female" },
  { id: "human-02", en: "Mia", zh: "Mia", tone: "female" },
  { id: "human-03", en: "Sofia", zh: "Sofia", tone: "female" },
  { id: "human-04", en: "Jia", zh: "Jia", tone: "female" },
  { id: "human-05", en: "Luna", zh: "Luna", tone: "female" },
  { id: "human-06", en: "Mei", zh: "Mei", tone: "female" },
  { id: "human-07", en: "Ryan", zh: "Ryan", tone: "male" },
  { id: "human-08", en: "Kai", zh: "Kai", tone: "male" },
  { id: "human-09", en: "Jay", zh: "Jay", tone: "male" },
  { id: "human-10", en: "Leo", zh: "Leo", tone: "male" },
  { id: "human-11", en: "Jun", zh: "Jun", tone: "male" },
  { id: "human-12", en: "Alex", zh: "Alex", tone: "male" }
];

const DEFAULT_AVATAR: AvatarKind = "human-01";

export function getAvatarStorageKey(userId: string) {
  return `pet-villa-profile-avatar:${userId || "guest"}`;
}

export function avatarToImageSrc(value?: string) {
  if (!value) return systemAvatarSrc(DEFAULT_AVATAR);
  if (value.startsWith("data:")) return value;
  if (value.startsWith("/")) return value;
  if (value.startsWith("system:")) return systemAvatarSrc(value.replace("system:", ""));
  return value;
}

export function readProfileAvatar(userId: string, fallback?: string) {
  if (typeof window === "undefined") return fallback || `system:${DEFAULT_AVATAR}`;
  return window.localStorage.getItem(getAvatarStorageKey(userId)) || fallback || `system:${DEFAULT_AVATAR}`;
}

export function saveProfileAvatar(userId: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getAvatarStorageKey(userId), value);
  try {
    const session = JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}");
    if (session.user) {
      session.user.profileAvatar = value;
      window.localStorage.setItem("pet-villa-session", JSON.stringify(session));
    }
  } catch {
    // Session may not exist yet.
  }
  window.dispatchEvent(new Event("pet-villa-auth"));
}

export function systemAvatarSrc(kind: string) {
  const normalized = avatarOptions.some((option) => option.id === kind) ? kind : DEFAULT_AVATAR;
  return `/avatars/${normalized}.png`;
}
