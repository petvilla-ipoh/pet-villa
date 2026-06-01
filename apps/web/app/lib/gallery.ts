"use client";

export type GuestPhoto = {
  id: string;
  imageUrl?: string;
  petName: string;
  breed: string;
  caption: string;
  uploadedAt: string;
  visibleOnHome: boolean;
  color: string;
};

const seedGuestPhotos: GuestPhoto[] = [
  { id: "guest-poodle", petName: "Mochi", breed: "Poodle", caption: "Cozy nap after playtime.", uploadedAt: "2026-05-28T09:00:00.000Z", visibleOnHome: true, color: "#f0b46e" },
  { id: "guest-frenchie", petName: "Bobo", breed: "French Bulldog", caption: "Happy in the living room.", uploadedAt: "2026-05-27T09:00:00.000Z", visibleOnHome: true, color: "#fff3e6" },
  { id: "guest-maltese", petName: "Luna", breed: "Maltese", caption: "Fresh and calm under AC.", uploadedAt: "2026-05-26T09:00:00.000Z", visibleOnHome: true, color: "#fffaf2" },
  { id: "guest-corgi", petName: "Cookie", breed: "Corgi", caption: "Gentle supervised play.", uploadedAt: "2026-05-25T09:00:00.000Z", visibleOnHome: true, color: "#e8a45d" },
  { id: "guest-shih", petName: "Nana", breed: "Shih Tzu", caption: "Dinner finished happily.", uploadedAt: "2026-05-24T09:00:00.000Z", visibleOnHome: true, color: "#d8b28a" },
  { id: "guest-pom", petName: "Teddy", breed: "Pomeranian", caption: "Tiny guest, big smile.", uploadedAt: "2026-05-23T09:00:00.000Z", visibleOnHome: true, color: "#efc27e" }
];

const galleryKey = "pet-villa-happy-guests";

export function readGuestPhotos(): GuestPhoto[] {
  if (typeof window === "undefined") return seedGuestPhotos;
  try {
    const raw = window.localStorage.getItem(galleryKey);
    const uploaded = raw ? (JSON.parse(raw) as GuestPhoto[]) : [];
    return [...uploaded, ...seedGuestPhotos].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch {
    return seedGuestPhotos;
  }
}

export function readHomeGuestPhotos(limit = 6) {
  return readGuestPhotos().filter((photo) => photo.visibleOnHome).slice(0, limit);
}

export function saveGuestPhoto(photo: Omit<GuestPhoto, "id" | "uploadedAt">) {
  if (typeof window === "undefined") return;
  const current = readGuestPhotos().filter((item) => !item.id.startsWith("guest-"));
  const next: GuestPhoto = { ...photo, id: `upload-${Date.now()}`, uploadedAt: new Date().toISOString() };
  window.localStorage.setItem(galleryKey, JSON.stringify([next, ...current]));
  window.dispatchEvent(new Event("pet-villa-gallery"));
}
