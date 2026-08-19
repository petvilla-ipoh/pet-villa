"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser, getCurrentUserId } from "./petProfiles";
import { fetchAuthenticatedCustomerJson, getAuthenticatedSupabaseContext, retrySupabaseRead } from "./dataReliability";

export type PetDiaryMedia = {
  type: "image" | "video";
  url: string;
  storagePath?: string;
  name?: string;
};

export type PetDiaryUpdate = {
  id: string;
  ownerId: string;
  orderId: string;
  bookingId?: string;
  petId: string;
  petName: string;
  customerName: string;
  mood: string;
  mealNotes: string;
  waterNotes: string;
  activityNotes: string;
  toiletNotes: string;
  healthNotes: string;
  medicationNotes: string;
  careNotes: string;
  reminderNotes: string;
  body: string;
  healthAlert: boolean;
  media: PetDiaryMedia[];
  createdAt: string;
};

export type NewPetDiaryUpdate = Omit<PetDiaryUpdate, "id" | "createdAt" | "media">;

type DiaryRow = {
  id: string;
  owner_id: string;
  order_id: string;
  booking_id: string | null;
  pet_id: string;
  pet_name: string;
  customer_name: string;
  mood: string;
  meal_notes: string;
  water_notes: string;
  activity_notes: string;
  toilet_notes: string;
  health_notes: string;
  medication_notes: string;
  care_notes: string;
  reminder_notes: string;
  body: string;
  health_alert: boolean;
  media: Array<{ type: "image" | "video"; path?: string; url?: string; name?: string }> | null;
  created_at: string;
};

const localKey = "pet-villa-diary-updates";
const mediaBucket = "pet-diary-media";
const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);
const allowDevelopmentFallback = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true";
const signedUrlTtlSeconds = 3600;
const signedUrlRefreshBufferMs = 5 * 60 * 1000;
const signedMediaUrlCache = new Map<string, { url: string; expiresAt: number }>();

function diaryError(error: unknown) {
  const candidate = error as { message?: string; code?: string; statusCode?: string | number; error?: string };
  const message = candidate?.message || candidate?.error || "Unknown Supabase error";
  if (candidate?.code === "42P01" || /bucket not found|relation .*pet_diary_updates.* does not exist/i.test(message)) {
    return new Error("Private Diary database is not configured. Apply migration 202608060001_create_supabase_pet_diary.sql.");
  }
  return new Error(`Private Diary could not be saved: ${message}`);
}

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function readLocal(): PetDiaryUpdate[] {
  if (typeof window === "undefined") return [];
  try {
    const entries = JSON.parse(window.localStorage.getItem(localKey) || "[]") as PetDiaryUpdate[];
    return entries.map((entry) => ({
      ...entry,
      waterNotes: entry.waterNotes || "",
      toiletNotes: entry.toiletNotes || "",
      healthNotes: entry.healthNotes || "",
      medicationNotes: entry.medicationNotes || "",
      careNotes: entry.careNotes || "",
      reminderNotes: entry.reminderNotes || ""
    }));
  } catch {
    return [];
  }
}

function writeLocal(entries: PetDiaryUpdate[], notify = true) {
  if (typeof window === "undefined") return;
  if (allowDevelopmentFallback) window.localStorage.setItem(localKey, JSON.stringify(entries));
  if (notify) window.dispatchEvent(new Event("pet-villa-diary"));
}

async function context() {
  return getAuthenticatedSupabaseContext();
}

function cleanFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "pet-update";
}

async function uploadMedia(supabase: SupabaseClient, ownerId: string, orderId: string, files: File[]) {
  const media: Array<{ type: "image" | "video"; path: string; name: string }> = [];
  for (const [index, file] of files.entries()) {
    if (!allowedMediaTypes.has(file.type)) throw new Error(`Unsupported Diary media type: ${file.type || file.name}`);
    const path = `${ownerId}/${orderId}/${Date.now()}-${index}-${cleanFileName(file.name)}`;
    const { error } = await supabase.storage.from(mediaBucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    media.push({ type: file.type.startsWith("video/") ? "video" : "image", path, name: file.name });
  }
  return media;
}

export async function checkPrivateDiaryConfiguration() {
  const current = await context();
  if (!current) return { configured: false, error: "Sign in with a Host account to use Private Diary." };
  try {
    const { error: tableError } = await current.supabase.from("pet_diary_updates").select("id", { head: true, count: "exact" });
    if (tableError) throw tableError;
    const { error: bucketError } = await current.supabase.storage.from(mediaBucket).list(current.userId, { limit: 1 });
    if (bucketError) throw bucketError;
    return { configured: true, error: "" };
  } catch (error) {
    return { configured: false, error: diaryError(error).message };
  }
}

async function resolveMedia(supabase: SupabaseClient, media: DiaryRow["media"]): Promise<PetDiaryMedia[]> {
  return Promise.all((media || []).map(async (item) => {
    if (item.url) return { type: item.type, url: item.url, name: item.name };
    if (!item.path) return { type: item.type, url: "", name: item.name };
    const cached = signedMediaUrlCache.get(item.path);
    if (cached && cached.expiresAt - Date.now() > signedUrlRefreshBufferMs) {
      return { type: item.type, url: cached.url, storagePath: item.path, name: item.name };
    }
    const { data, error } = await supabase.storage.from(mediaBucket).createSignedUrl(item.path, signedUrlTtlSeconds);
    if (error || !data?.signedUrl) throw error || new Error(`Diary media URL could not be created for ${item.path}.`);
    signedMediaUrlCache.set(item.path, {
      url: data.signedUrl,
      expiresAt: Date.now() + signedUrlTtlSeconds * 1000
    });
    return { type: item.type, url: data.signedUrl, storagePath: item.path, name: item.name };
  }));
}

async function fromRow(supabase: SupabaseClient, row: DiaryRow): Promise<PetDiaryUpdate> {
  return {
    id: row.id,
    ownerId: row.owner_id,
    orderId: row.order_id,
    bookingId: row.booking_id || undefined,
    petId: row.pet_id,
    petName: row.pet_name,
    customerName: row.customer_name,
    mood: row.mood,
    mealNotes: row.meal_notes,
    waterNotes: row.water_notes || "",
    activityNotes: row.activity_notes,
    toiletNotes: row.toilet_notes || "",
    healthNotes: row.health_notes || "",
    medicationNotes: row.medication_notes || "",
    careNotes: row.care_notes || "",
    reminderNotes: row.reminder_notes || "",
    body: row.body,
    healthAlert: row.health_alert,
    media: await resolveMedia(supabase, row.media),
    createdAt: row.created_at
  };
}

async function listSupabase(supabase: SupabaseClient, ownerId?: string) {
  let query = supabase
    .from("pet_diary_updates")
    .select("id, owner_id, order_id, booking_id, pet_id, pet_name, customer_name, mood, meal_notes, water_notes, activity_notes, toilet_notes, health_notes, medication_notes, care_notes, reminder_notes, body, health_alert, media, created_at")
    .order("created_at", { ascending: false });
  if (ownerId && isUuid(ownerId)) query = query.eq("owner_id", ownerId);
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all(((data || []) as DiaryRow[]).map((row) => fromRow(supabase, row)));
}

export async function loadPetDiaryUpdatesForHost() {
  const fallback = allowDevelopmentFallback ? readLocal() : [];
  const current = await context();
  if (!current) {
    if (allowDevelopmentFallback) return fallback;
    throw new Error("Private Diary requires an authenticated Host session.");
  }
  try {
    const entries = await retrySupabaseRead(() => listSupabase(current.supabase));
    writeLocal(entries, false);
    return entries;
  } catch (error) {
    if (allowDevelopmentFallback) {
      console.warn("Supabase diary unavailable; using the explicit development fallback.", error);
      return fallback;
    }
    console.error("Supabase Host diary load failed.", error);
    throw new Error("Private Diary updates could not be refreshed.");
  }
}

export async function loadPetDiaryUpdatesForCustomer(ownerId = getCurrentUserId()) {
  const fallback = allowDevelopmentFallback ? readLocal().filter((entry) => entry.ownerId === ownerId) : [];
  const current = await context();
  if (!current) {
    if (allowDevelopmentFallback) return fallback;
    throw new Error("Please sign in again to view Private Diary updates.");
  }
  try {
    const entries = await retrySupabaseRead(async () => {
      const response = await fetchAuthenticatedCustomerJson<{ entries: DiaryRow[] }>("/api/customer/diary");
      return Promise.all((response.entries || []).map((row) => fromRow(current.supabase, row)));
    });
    writeLocal([...entries, ...readLocal().filter((entry) => entry.ownerId !== current.userId)], false);
    return entries;
  } catch (error) {
    if (allowDevelopmentFallback) {
      console.warn("Supabase diary unavailable; using the explicit development fallback.", error);
      return fallback;
    }
    console.error("Supabase customer diary load failed.", error);
    throw new Error("Your Private Diary could not be refreshed.");
  }
}

export async function savePetDiaryUpdate(input: NewPetDiaryUpdate, files: File[]) {
  const current = await context();
  if (!current) throw new Error("A verified Host session is required to publish Private Diary updates.");
  if (!isUuid(input.ownerId)) throw new Error("Private Diary requires a registered Supabase customer account.");

  let uploadedPaths: string[] = [];
  try {
    const media = await uploadMedia(current.supabase, input.ownerId, input.orderId, files);
    uploadedPaths = media.map((item) => item.path);
    const { data, error } = await current.supabase
      .from("pet_diary_updates")
      .insert({
        owner_id: input.ownerId,
        created_by: current.userId,
        order_id: input.orderId,
        booking_id: isUuid(input.bookingId) ? input.bookingId : null,
        pet_id: input.petId,
        pet_name: input.petName,
        customer_name: input.customerName,
        mood: input.mood,
        meal_notes: input.mealNotes,
        water_notes: input.waterNotes,
        activity_notes: input.activityNotes,
        toilet_notes: input.toiletNotes,
        health_notes: input.healthNotes,
        medication_notes: input.medicationNotes,
        care_notes: input.careNotes,
        reminder_notes: input.reminderNotes,
        body: input.body,
        health_alert: input.healthAlert,
        media
      })
      .select("id, owner_id, order_id, booking_id, pet_id, pet_name, customer_name, mood, meal_notes, water_notes, activity_notes, toilet_notes, health_notes, medication_notes, care_notes, reminder_notes, body, health_alert, media, created_at")
      .single();
    if (error) throw error;
    const saved = await fromRow(current.supabase, data as DiaryRow);
    const { count } = await current.supabase
      .from("pet_diary_updates")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", input.ownerId)
      .eq("order_id", input.orderId);
    await current.supabase
      .from("orders")
      .update({ photos_available: count || 1 })
      .eq("owner_id", input.ownerId)
      .eq("order_id", input.orderId);
    writeLocal([saved, ...readLocal().filter((entry) => entry.id !== saved.id)]);
    return { entry: saved, persisted: true };
  } catch (error) {
    if (uploadedPaths.length) await current.supabase.storage.from(mediaBucket).remove(uploadedPaths);
    console.warn("Supabase diary save failed.", error);
    throw diaryError(error);
  }
}

export async function deletePetDiaryUpdate(entry: PetDiaryUpdate) {
  const current = await context();
  if (!current) throw new Error("A verified Host session is required to delete Private Diary updates.");
  if (!isUuid(entry.id)) throw new Error("This legacy local Diary entry is not a Production record and cannot be managed here.");
  try {
    const { error } = await current.supabase.from("pet_diary_updates").delete().eq("id", entry.id);
    if (error) throw error;
    const paths = entry.media.map((item) => item.storagePath).filter(Boolean) as string[];
    if (paths.length) await current.supabase.storage.from(mediaBucket).remove(paths);
    writeLocal(readLocal().filter((item) => item.id !== entry.id));
    return { persisted: true };
  } catch (error) {
    console.warn("Supabase diary delete failed.", error);
    throw new Error("Diary update could not be deleted from Supabase.");
  }
}

export async function updatePetDiaryUpdate(entry: PetDiaryUpdate, changes: Partial<NewPetDiaryUpdate>, files: File[] = []) {
  const merged: PetDiaryUpdate = { ...entry, ...changes };
  const current = await context();
  if (!current) throw new Error("A verified Host session is required to edit Private Diary updates.");
  if (!isUuid(entry.id) || !isUuid(merged.ownerId)) throw new Error("Private Diary requires a registered Supabase customer and record.");

  try {
    const uploaded = files.length ? await uploadMedia(current.supabase, merged.ownerId, merged.orderId, files) : [];
    const media = [
      ...merged.media.map((item) => ({ type: item.type, ...(item.storagePath ? { path: item.storagePath } : { url: item.url }), name: item.name })),
      ...uploaded
    ];
    const { data, error } = await current.supabase
      .from("pet_diary_updates")
      .update({
        mood: merged.mood,
        meal_notes: merged.mealNotes,
        water_notes: merged.waterNotes,
        activity_notes: merged.activityNotes,
        toilet_notes: merged.toiletNotes,
        health_notes: merged.healthNotes,
        medication_notes: merged.medicationNotes,
        care_notes: merged.careNotes,
        reminder_notes: merged.reminderNotes,
        body: merged.body,
        health_alert: merged.healthAlert,
        media
      })
      .eq("id", entry.id)
      .select("id, owner_id, order_id, booking_id, pet_id, pet_name, customer_name, mood, meal_notes, water_notes, activity_notes, toilet_notes, health_notes, medication_notes, care_notes, reminder_notes, body, health_alert, media, created_at")
      .single();
    if (error) throw error;
    const saved = await fromRow(current.supabase, data as DiaryRow);
    writeLocal([saved, ...readLocal().filter((item) => item.id !== saved.id)]);
    return { entry: saved, persisted: true };
  } catch (error) {
    console.warn("Supabase diary update failed.", error);
    throw new Error("Diary changes were not saved to Supabase.");
  }
}

export function diaryOwnerId() {
  return getCurrentUser()?.id || getCurrentUserId();
}
