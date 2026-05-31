"use client";

export type AvatarKind = "poodle" | "frenchie" | "maltese" | "shiba" | "corgi" | "golden" | "pomeranian" | "paw";

export const avatarOptions: Array<{ id: AvatarKind; en: string; zh: string }> = [
  { id: "poodle", en: "Poodle", zh: "贵宾犬" },
  { id: "frenchie", en: "French Bulldog", zh: "法斗" },
  { id: "maltese", en: "Maltese", zh: "马尔济斯" },
  { id: "shiba", en: "Shiba", zh: "柴犬" },
  { id: "corgi", en: "Corgi", zh: "柯基" },
  { id: "golden", en: "Golden Retriever", zh: "金毛" },
  { id: "pomeranian", en: "Pomeranian", zh: "博美" },
  { id: "paw", en: "Dog Paw", zh: "狗掌印" }
];

export function getAvatarStorageKey(userId: string) {
  return `pet-villa-profile-avatar:${userId || "guest"}`;
}

function svgData(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function avatarToImageSrc(value?: string) {
  if (!value) return systemAvatarSrc("poodle");
  if (value.startsWith("data:")) return value;
  if (value.startsWith("system:")) return systemAvatarSrc(value.replace("system:", "") as AvatarKind);
  return value;
}

export function readProfileAvatar(userId: string, fallback?: string) {
  if (typeof window === "undefined") return fallback || "system:poodle";
  return window.localStorage.getItem(getAvatarStorageKey(userId)) || fallback || "system:poodle";
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

export function systemAvatarSrc(kind: AvatarKind) {
  const palette: Record<AvatarKind, { fur: string; ear: string; accent: string; mark?: string }> = {
    poodle: { fur: "#f1b06f", ear: "#d48a4d", accent: "#e8927c" },
    frenchie: { fur: "#fff8f5", ear: "#c7824f", accent: "#e8927c", mark: "#3d1f0d" },
    maltese: { fur: "#fffaf7", ear: "#eaded7", accent: "#f5c4b3" },
    shiba: { fur: "#d28a4d", ear: "#b66a36", accent: "#fff8f5" },
    corgi: { fur: "#e6a45f", ear: "#c8783e", accent: "#fff8f5" },
    golden: { fur: "#e8b66f", ear: "#cc8a46", accent: "#f5c4b3" },
    pomeranian: { fur: "#f0b982", ear: "#d9965a", accent: "#fff8f5" },
    paw: { fur: "#e8927c", ear: "#e8927c", accent: "#fff8f5" }
  };
  const color = palette[kind] || palette.poodle;
  if (kind === "paw") {
    return svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="28" fill="#fff8f5"/><ellipse cx="48" cy="57" rx="20" ry="17" fill="${color.fur}"/><ellipse cx="25" cy="37" rx="10" ry="13" fill="${color.fur}"/><ellipse cx="40" cy="26" rx="10" ry="13" fill="${color.fur}"/><ellipse cx="56" cy="26" rx="10" ry="13" fill="${color.fur}"/><ellipse cx="71" cy="37" rx="10" ry="13" fill="${color.fur}"/></svg>`);
  }
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="28" fill="#fff8f5"/><circle cx="48" cy="51" r="26" fill="${color.fur}"/><path d="M25 42c-11 3-14 17-8 25 6 7 18 4 22-4M71 42c11 3 14 17 8 25-6 7-18 4-22-4" fill="${color.ear}"/><circle cx="38" cy="50" r="3.5" fill="#3d1f0d"/><circle cx="58" cy="50" r="3.5" fill="#3d1f0d"/><ellipse cx="48" cy="61" rx="7" ry="5" fill="#3d1f0d"/><path d="M41 69c5 4 9 4 14 0" fill="none" stroke="#3d1f0d" stroke-width="3" stroke-linecap="round"/><path d="M24 76c14 9 35 9 48 0" fill="none" stroke="${color.accent}" stroke-width="5" stroke-linecap="round" opacity=".5"/>${color.mark ? `<path d="M57 27c9 2 16 9 17 19-11-4-19-9-17-19Z" fill="${color.mark}"/>` : ""}</svg>`);
}
