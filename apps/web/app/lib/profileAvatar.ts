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
  if (kind === "paw") {
    return svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="28" fill="#fff8f5"/><ellipse cx="48" cy="57" rx="20" ry="17" fill="#e8927c"/><ellipse cx="25" cy="37" rx="10" ry="13" fill="#e8927c"/><ellipse cx="40" cy="26" rx="10" ry="13" fill="#e8927c"/><ellipse cx="56" cy="26" rx="10" ry="13" fill="#e8927c"/><ellipse cx="71" cy="37" rx="10" ry="13" fill="#e8927c"/></svg>`);
  }
  const breeds: Record<Exclude<AvatarKind, "paw">, string> = {
    poodle: `<g fill="#efb372"><circle cx="48" cy="48" r="22"/><circle cx="30" cy="42" r="11"/><circle cx="66" cy="42" r="11"/><circle cx="38" cy="28" r="9"/><circle cx="50" cy="25" r="10"/><circle cx="61" cy="30" r="8"/><ellipse cx="25" cy="53" rx="11" ry="17"/><ellipse cx="71" cy="53" rx="11" ry="17"/></g>`,
    frenchie: `<path d="M25 20 11 8c-2 18 4 31 16 35M71 20 85 8c2 18-4 31-16 35" fill="#f5c4b3"/><circle cx="48" cy="50" r="25" fill="#fffaf7"/><path d="M57 28c11 1 20 9 20 22-12-3-22-10-20-22Z" fill="#3d1f0d"/>`,
    maltese: `<circle cx="48" cy="50" r="25" fill="#fff"/><path d="M25 35c-12 13-13 34-1 44 3-14 8-26 17-35M71 35c12 13 13 34 1 44-3-14-8-26-17-35" fill="#f3ebe5"/><path d="M28 32c8-10 32-10 40 0-12 3-28 3-40 0Z" fill="#fff"/>`,
    shiba: `<path d="M28 26 20 8l23 13M68 26 76 8 53 21" fill="#c76f35"/><circle cx="48" cy="50" r="25" fill="#d88945"/><path d="M31 56c6 15 28 15 34 0-9 5-25 5-34 0Z" fill="#fff8f5"/>`,
    corgi: `<path d="M29 27 19 6l26 16M67 27 77 6 51 22" fill="#d88b45"/><circle cx="48" cy="51" r="24" fill="#e6a45f"/><path d="M32 55c5 13 27 13 32 0-10 4-22 4-32 0Z" fill="#fff8f5"/><rect x="31" y="72" width="10" height="8" rx="4" fill="#d88b45"/><rect x="55" y="72" width="10" height="8" rx="4" fill="#d88b45"/>`,
    golden: `<circle cx="48" cy="49" r="25" fill="#e4ad67"/><path d="M22 40c-12 7-12 27-3 34 10-6 13-20 8-34M74 40c12 7 12 27 3 34-10-6-13-20-8-34" fill="#c98445"/><path d="M31 59c7 10 27 10 34 0" fill="#f5c4b3"/>`,
    pomeranian: `<path d="M48 14 55 27 70 21 66 38 82 45 66 53 72 70 55 63 48 80 41 63 24 70 30 53 14 45 30 38 26 21 41 27Z" fill="#eead68"/><circle cx="48" cy="50" r="21" fill="#f5bf82"/>`
  };
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="28" fill="#fff8f5"/>${breeds[kind as Exclude<AvatarKind, "paw">] || breeds.poodle}<circle cx="39" cy="50" r="3.5" fill="#3d1f0d"/><circle cx="57" cy="50" r="3.5" fill="#3d1f0d"/><ellipse cx="48" cy="61" rx="7" ry="5" fill="#3d1f0d"/><path d="M41 69c5 4 9 4 14 0" fill="none" stroke="#3d1f0d" stroke-width="3" stroke-linecap="round"/></svg>`);
}
