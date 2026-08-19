"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

export type GuestPhoto = {
  id: string;
  imageUrl?: string;
  storagePath?: string;
  petName: string;
  breed: string;
  caption: string;
  uploadedAt: string;
  visibleOnHome: boolean;
  color: string;
  featured?: boolean;
};

type GalleryPhotoRow = {
  id: string;
  pet_name: string | null;
  breed: string | null;
  caption: string | null;
  image_url: string | null;
  storage_path: string | null;
  visible_on_home: boolean | null;
  featured: boolean | null;
  color: string | null;
  created_at: string;
};

const seedGuestPhotos: GuestPhoto[] = [
  { id: "guest-poodle", imageUrl: "/hero-dogs.webp", petName: "Mochi", breed: "Poodle", caption: "Cozy nap after playtime.", uploadedAt: "2026-05-28T09:00:00.000Z", visibleOnHome: true, color: "#f0b46e" },
  { id: "guest-frenchie", imageUrl: "/hero-dogs.webp", petName: "Bobo", breed: "French Bulldog", caption: "Happy in the living room.", uploadedAt: "2026-05-27T09:00:00.000Z", visibleOnHome: true, color: "#fff3e6" },
  { id: "guest-maltese", imageUrl: "/hero-dogs.webp", petName: "Luna", breed: "Maltese", caption: "Fresh and calm under AC.", uploadedAt: "2026-05-26T09:00:00.000Z", visibleOnHome: true, color: "#fffaf2" },
  { id: "guest-corgi", imageUrl: "/hero-dogs.webp", petName: "Cookie", breed: "Corgi", caption: "Gentle supervised play.", uploadedAt: "2026-05-25T09:00:00.000Z", visibleOnHome: true, color: "#e8a45d" },
  { id: "guest-shih", imageUrl: "/hero-dogs.webp", petName: "Nana", breed: "Shih Tzu", caption: "Dinner finished happily.", uploadedAt: "2026-05-24T09:00:00.000Z", visibleOnHome: true, color: "#d8b28a" },
  { id: "guest-pom", imageUrl: "/hero-dogs.webp", petName: "Teddy", breed: "Pomeranian", caption: "Tiny guest, big smile.", uploadedAt: "2026-05-23T09:00:00.000Z", visibleOnHome: true, color: "#efc27e" }
];

const galleryKey = "pet-villa-happy-guests";
const galleryMigrationKey = "pet-villa-gallery-supabase-migrated";
const GALLERY_BUCKET = "gallery-photos";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowGalleryDevelopmentFallback = process.env.NODE_ENV !== "production"
  && process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true";

function sortPhotos(photos: GuestPhoto[]) {
  return photos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

function readLocalUploadedPhotos() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(galleryKey);
    return raw ? (JSON.parse(raw) as GuestPhoto[]) : [];
  } catch {
    return [];
  }
}

function writeLocalUploadedPhotos(photos: GuestPhoto[], notify = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(galleryKey, JSON.stringify(sortPhotos(photos)));
  if (notify) window.dispatchEvent(new Event("pet-villa-gallery"));
}

function readSessionRole() {
  if (typeof window === "undefined") return "";
  try {
    return JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user?.role || "";
  } catch {
    return "";
  }
}

function isHostSession() {
  const role = readSessionRole();
  return role === "host" || role === "admin";
}

async function getSupabaseContext() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

function galleryPhotoFromRow(row: GalleryPhotoRow): GuestPhoto {
  return {
    id: row.id,
    imageUrl: row.image_url || "/hero-dogs.webp",
    storagePath: row.storage_path || undefined,
    petName: row.pet_name || "Happy guest",
    breed: row.breed || "Small dog",
    caption: row.caption || "Happy guest at Pet Villa.",
    uploadedAt: row.created_at,
    visibleOnHome: row.visible_on_home ?? true,
    color: row.color || "#f0b46e",
    featured: Boolean(row.featured)
  };
}

function galleryPayload(photo: Omit<GuestPhoto, "id" | "uploadedAt">, createdBy?: string, uploaded?: { url: string; path: string }) {
  return {
    created_by: createdBy || null,
    pet_name: photo.petName.trim(),
    breed: photo.breed.trim() || "Small dog",
    caption: photo.caption.trim() || "Happy guest at Pet Villa.",
    image_url: uploaded?.url || photo.imageUrl || "/hero-dogs.webp",
    storage_path: uploaded?.path || photo.storagePath || null,
    visible_on_home: photo.visibleOnHome,
    featured: Boolean(photo.featured),
    color: photo.color || "#f0b46e"
  };
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, contentType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { blob: new Blob([bytes], { type: contentType }), contentType, extension };
}

async function uploadGalleryPhoto(supabase: SupabaseClient, userId: string, dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return null;
  const file = dataUrlToBlob(dataUrl);
  if (!file) return null;
  const path = `${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${file.extension}`;
  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, file.blob, {
    contentType: file.contentType,
    upsert: true
  });
  if (error) throw error;
  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function listSupabaseGuestPhotos(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, pet_name, breed, caption, image_url, storage_path, visible_on_home, featured, color, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as GalleryPhotoRow[]).map(galleryPhotoFromRow);
}

async function insertSupabaseGuestPhoto(supabase: SupabaseClient, userId: string, photo: Omit<GuestPhoto, "id" | "uploadedAt">) {
  const uploaded = await uploadGalleryPhoto(supabase, userId, photo.imageUrl);
  const { data, error } = await supabase
    .from("gallery_photos")
    .insert(galleryPayload(photo, userId, uploaded || undefined))
    .select("id, pet_name, breed, caption, image_url, storage_path, visible_on_home, featured, color, created_at")
    .single();
  if (error) throw error;
  return galleryPhotoFromRow(data as GalleryPhotoRow);
}

async function migrateLocalGalleryToSupabase(supabase: SupabaseClient, userId: string, photos: GuestPhoto[]) {
  for (const photo of photos) {
    await insertSupabaseGuestPhoto(supabase, userId, photo);
  }
}

async function refreshLocalGalleryFromSupabase(supabase: SupabaseClient) {
  const photos = await listSupabaseGuestPhotos(supabase);
  writeLocalUploadedPhotos(photos, false);
  window.localStorage.setItem(galleryMigrationKey, "true");
  return [...photos, ...seedGuestPhotos];
}

function saveGuestPhotoFallback(photo: Omit<GuestPhoto, "id" | "uploadedAt">) {
  const current = readLocalUploadedPhotos();
  const next: GuestPhoto = { ...photo, id: `upload-${Date.now()}`, uploadedAt: new Date().toISOString() };
  writeLocalUploadedPhotos([next, ...current]);
  return [next, ...current, ...seedGuestPhotos];
}

export function readGuestPhotos(): GuestPhoto[] {
  if (typeof window === "undefined") return seedGuestPhotos;
  return sortPhotos([...readLocalUploadedPhotos(), ...seedGuestPhotos]);
}

export function readHomeGuestPhotos(limit = 6) {
  return readGuestPhotos().filter((photo) => photo.visibleOnHome).slice(0, limit);
}

export async function loadGuestPhotos() {
  const fallback = readGuestPhotos();
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return fallback;

  try {
    let supabasePhotos = await listSupabaseGuestPhotos(supabase);
    const localUploaded = readLocalUploadedPhotos().filter((item) => !item.id.startsWith("guest-"));
    const shouldMigrate = typeof window !== "undefined"
      && isHostSession()
      && window.localStorage.getItem(galleryMigrationKey) !== "true"
      && supabasePhotos.length === 0
      && localUploaded.length > 0;

    if (shouldMigrate) {
      const context = await getSupabaseContext();
      if (context) {
        await migrateLocalGalleryToSupabase(context.supabase, context.userId, localUploaded);
        supabasePhotos = await listSupabaseGuestPhotos(context.supabase);
      }
    }

    if (supabasePhotos.length > 0 || isHostSession()) {
      writeLocalUploadedPhotos(supabasePhotos, false);
    }
    if (typeof window !== "undefined" && (supabasePhotos.length > 0 || isHostSession())) {
      window.localStorage.setItem(galleryMigrationKey, "true");
    }
    return sortPhotos([...supabasePhotos, ...seedGuestPhotos]);
  } catch (error) {
    console.warn("Supabase gallery load failed; using localStorage fallback.", error);
    return fallback;
  }
}

export async function loadHomeGuestPhotos(limit = 6) {
  const photos = await loadGuestPhotos();
  return photos.filter((photo) => photo.visibleOnHome).slice(0, limit);
}

export async function saveGuestPhoto(photo: Omit<GuestPhoto, "id" | "uploadedAt">) {
  const context = await getSupabaseContext();
  if (!context) {
    if (allowGalleryDevelopmentFallback) return saveGuestPhotoFallback(photo);
    throw new Error("A verified Host session is required to publish Gallery photos.");
  }

  try {
    await insertSupabaseGuestPhoto(context.supabase, context.userId, photo);
    const photos = await refreshLocalGalleryFromSupabase(context.supabase);
    window.dispatchEvent(new Event("pet-villa-gallery"));
    return photos;
  } catch (error) {
    if (allowGalleryDevelopmentFallback) {
      console.warn("Supabase gallery save failed; using the explicit development fallback.", error);
      return saveGuestPhotoFallback(photo);
    }
    console.error("Supabase gallery save failed.", error);
    throw new Error("Gallery photo could not be published to Supabase.");
  }
}

// Marketing gallery admin helpers. Customer-facing pages only read these photos.
export async function updateGuestPhoto(photoId: string, updates: Partial<Omit<GuestPhoto, "id" | "uploadedAt">>) {
  if (typeof window === "undefined") return [];
  const current = readLocalUploadedPhotos();
  const next = current.map((photo) => (photo.id === photoId ? { ...photo, ...updates } : photo));

  const context = await getSupabaseContext();
  if (!context || photoId.startsWith("guest-") || !UUID_PATTERN.test(photoId)) {
    if (allowGalleryDevelopmentFallback) {
      writeLocalUploadedPhotos(next);
      return readGuestPhotos();
    }
    throw new Error("This Gallery photo is not a verified Supabase record.");
  }

  try {
    const { error } = await context.supabase
      .from("gallery_photos")
      .update({
        pet_name: updates.petName,
        breed: updates.breed,
        caption: updates.caption,
        image_url: updates.imageUrl,
        visible_on_home: updates.visibleOnHome,
        featured: updates.featured,
        color: updates.color
      })
      .eq("id", photoId);
    if (error) throw error;
    const photos = await refreshLocalGalleryFromSupabase(context.supabase);
    window.dispatchEvent(new Event("pet-villa-gallery"));
    return photos;
  } catch (error) {
    if (allowGalleryDevelopmentFallback) {
      writeLocalUploadedPhotos(next);
      console.warn("Supabase gallery update failed; using the explicit development fallback.", error);
      return readGuestPhotos();
    }
    console.error("Supabase gallery update failed.", error);
    throw new Error("Gallery changes could not be saved to Supabase.");
  }
}

export async function deleteGuestPhoto(photoId: string) {
  if (typeof window === "undefined") return [];
  const current = readLocalUploadedPhotos();
  const target = current.find((photo) => photo.id === photoId);
  const next = current.filter((photo) => !photo.id.startsWith("guest-") && photo.id !== photoId);

  const context = await getSupabaseContext();
  if (!context || photoId.startsWith("guest-") || !UUID_PATTERN.test(photoId)) {
    if (allowGalleryDevelopmentFallback) {
      writeLocalUploadedPhotos(next);
      return readGuestPhotos();
    }
    throw new Error("This Gallery photo is not a verified Supabase record.");
  }

  try {
    if (target?.storagePath) {
      await context.supabase.storage.from(GALLERY_BUCKET).remove([target.storagePath]);
    }
    const { error } = await context.supabase.from("gallery_photos").delete().eq("id", photoId);
    if (error) throw error;
    const photos = await refreshLocalGalleryFromSupabase(context.supabase);
    window.dispatchEvent(new Event("pet-villa-gallery"));
    return photos;
  } catch (error) {
    if (allowGalleryDevelopmentFallback) {
      writeLocalUploadedPhotos(next);
      console.warn("Supabase gallery delete failed; using the explicit development fallback.", error);
      return readGuestPhotos();
    }
    console.error("Supabase gallery delete failed.", error);
    throw new Error("Gallery photo could not be deleted from Supabase.");
  }
}
