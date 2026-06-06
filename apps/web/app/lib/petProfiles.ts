"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

export type PetProfile = {
  id: string;
  name: string;
  breed: string;
  weight: string;
  age: string;
  gender: string;
  coatColor: string;
  vaccinated: boolean;
  neutered: boolean;
  friendly: boolean;
  calm: boolean;
  foodBrand: string;
  mealsPerDay: string;
  allergies: string;
  medication: string;
  specialNotes: string;
  photoDataUrl?: string;
  photoPath?: string;
};

type PetRow = {
  id: string;
  owner_id: string;
  name: string | null;
  breed: string | null;
  weight_kg: number | string | null;
  age_text: string | null;
  gender: string | null;
  coat_color: string | null;
  vaccinated: boolean | null;
  neutered: boolean | null;
  friendly: boolean | null;
  calm: boolean | null;
  food_brand: string | null;
  meals_per_day: string | null;
  allergies: string | null;
  medication: string | null;
  special_notes: string | null;
  photo_url: string | null;
  photo_path: string | null;
};

const PET_PHOTO_BUCKET = "pet-photos";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    const session = JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}");
    return session?.user || null;
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  return getCurrentUser()?.id || "guest";
}

export function getPetStorageKey(userId = getCurrentUserId()) {
  return `pet-villa-pets:${userId}`;
}

function getPetMigrationKey(userId = getCurrentUserId()) {
  return `pet-villa-pets-supabase-migrated:${userId}`;
}

export function readPetProfiles(userId = getCurrentUserId()): PetProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getPetStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writePetProfiles(pets: PetProfile[], userId = getCurrentUserId(), notify = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getPetStorageKey(userId), JSON.stringify(pets));
  if (notify) window.dispatchEvent(new Event("pet-villa-pets"));
}

export function createEmptyPet(): PetProfile {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pet-${Date.now()}`,
    name: "",
    breed: "",
    weight: "",
    age: "",
    gender: "",
    coatColor: "",
    vaccinated: false,
    neutered: false,
    friendly: true,
    calm: true,
    foodBrand: "",
    mealsPerDay: "",
    allergies: "",
    medication: "",
    specialNotes: ""
  };
}

export function upsertPetProfile(pet: PetProfile, userId = getCurrentUserId()) {
  const current = readPetProfiles(userId);
  const exists = current.some((item) => item.id === pet.id);
  const next = exists ? current.map((item) => (item.id === pet.id ? pet : item)) : [...current, pet];
  writePetProfiles(next, userId);
  return next;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function parseWeightKg(weight: string) {
  const normalized = weight.replace(/kg/gi, "").trim();
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function weightLabel(weight: PetRow["weight_kg"]) {
  if (weight === null || weight === undefined || weight === "") return "";
  return `${String(weight).replace(/\.00$/, "")}kg`;
}

function sexFromGender(gender: string) {
  const value = gender.toLowerCase();
  if (value === "male" || value === "female") return value;
  return "unknown";
}

function petFromRow(row: PetRow): PetProfile {
  return {
    id: row.id,
    name: row.name || "",
    breed: row.breed || "",
    weight: weightLabel(row.weight_kg),
    age: row.age_text || "",
    gender: row.gender || "",
    coatColor: row.coat_color || "",
    vaccinated: Boolean(row.vaccinated),
    neutered: Boolean(row.neutered),
    friendly: row.friendly ?? true,
    calm: row.calm ?? true,
    foodBrand: row.food_brand || "",
    mealsPerDay: row.meals_per_day || "",
    allergies: row.allergies || "",
    medication: row.medication || "",
    specialNotes: row.special_notes || "",
    photoDataUrl: row.photo_url || undefined,
    photoPath: row.photo_path || undefined
  };
}

function rowFromPet(pet: PetProfile, ownerId: string, photo?: { url?: string; path?: string }) {
  const weightKg = parseWeightKg(pet.weight);
  return {
    owner_id: ownerId,
    name: pet.name.trim(),
    species: "dog",
    breed: pet.breed.trim(),
    weight_kg: weightKg,
    age_text: pet.age.trim(),
    gender: pet.gender,
    sex: sexFromGender(pet.gender),
    vaccine_status: pet.vaccinated ? "valid" : "unknown",
    vaccinated: pet.vaccinated,
    neutered: pet.neutered,
    friendly: pet.friendly,
    calm: pet.calm,
    food_brand: pet.foodBrand,
    meals_per_day: pet.mealsPerDay,
    allergies: pet.allergies,
    medication: pet.medication,
    special_notes: pet.specialNotes,
    feeding_instructions: [pet.foodBrand, pet.mealsPerDay].filter(Boolean).join("; ") || null,
    medical_notes: [pet.allergies, pet.medication].filter(Boolean).join("; ") || null,
    photo_url: photo?.url ?? pet.photoDataUrl ?? null,
    photo_path: photo?.path ?? pet.photoPath ?? null
  };
}

async function getSupabaseContext() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
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

async function uploadPetPhoto(supabase: SupabaseClient, ownerId: string, petId: string, dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return null;
  const file = dataUrlToBlob(dataUrl);
  if (!file) return null;
  const path = `${ownerId}/${petId}/${Date.now()}.${file.extension}`;
  const { error } = await supabase.storage.from(PET_PHOTO_BUCKET).upload(path, file.blob, {
    contentType: file.contentType,
    upsert: true
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PET_PHOTO_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function listSupabasePets(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("pets")
    .select("id, owner_id, name, breed, weight_kg, age_text, gender, coat_color, vaccinated, neutered, friendly, calm, food_brand, meals_per_day, allergies, medication, special_notes, photo_url, photo_path")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as PetRow[]).map(petFromRow);
}

async function saveSupabasePet(supabase: SupabaseClient, userId: string, pet: PetProfile) {
  let photo: { path: string; url: string } | null = null;
  if (isUuid(pet.id)) {
    photo = await uploadPetPhoto(supabase, userId, pet.id, pet.photoDataUrl);
  }

  const payload = rowFromPet(pet, userId, photo || undefined);
  const mutation = isUuid(pet.id)
    ? supabase.from("pets").upsert({ id: pet.id, ...payload }, { onConflict: "id" })
    : supabase.from("pets").insert(payload);
  let { data, error } = await mutation
    .select("id, owner_id, name, breed, weight_kg, age_text, gender, coat_color, vaccinated, neutered, friendly, calm, food_brand, meals_per_day, allergies, medication, special_notes, photo_url, photo_path")
    .single();
  if (error) throw error;

  if (!photo && data?.id && pet.photoDataUrl?.startsWith("data:")) {
    photo = await uploadPetPhoto(supabase, userId, data.id, pet.photoDataUrl);
    if (photo) {
      const result = await supabase
        .from("pets")
        .update({ photo_url: photo.url, photo_path: photo.path })
        .eq("id", data.id)
        .select("id, owner_id, name, breed, weight_kg, age_text, gender, coat_color, vaccinated, neutered, friendly, calm, food_brand, meals_per_day, allergies, medication, special_notes, photo_url, photo_path")
        .single();
      if (result.error) throw result.error;
      data = result.data;
    }
  }

  return petFromRow(data as PetRow);
}

async function migrateLocalPetsToSupabase(supabase: SupabaseClient, userId: string, localPets: PetProfile[]) {
  const migrated: PetProfile[] = [];
  for (const pet of localPets) {
    migrated.push(await saveSupabasePet(supabase, userId, pet));
  }
  return migrated;
}

export async function loadPetProfiles() {
  const fallbackUserId = getCurrentUserId();
  const fallbackPets = readPetProfiles(fallbackUserId);
  const context = await getSupabaseContext();
  if (!context) return fallbackPets;

  try {
    const migrationKey = getPetMigrationKey(context.userId);
    const migrationDone = window.localStorage.getItem(migrationKey) === "true";
    const supabasePets = await listSupabasePets(context.supabase);
    if (!migrationDone && supabasePets.length === 0 && fallbackPets.length > 0) {
      const migrated = await migrateLocalPetsToSupabase(context.supabase, context.userId, fallbackPets);
      writePetProfiles(migrated, context.userId, false);
      window.localStorage.setItem(migrationKey, "true");
      return migrated;
    }
    writePetProfiles(supabasePets, context.userId, false);
    window.localStorage.setItem(migrationKey, "true");
    return supabasePets;
  } catch (error) {
    console.warn("Supabase pets unavailable; using localStorage fallback.", error);
    return fallbackPets;
  }
}

export async function savePetProfile(pet: PetProfile) {
  const fallbackUserId = getCurrentUserId();
  const context = await getSupabaseContext();
  if (!context) return upsertPetProfile(pet, fallbackUserId);

  try {
    const savedPet = await saveSupabasePet(context.supabase, context.userId, pet);
    const pets = await listSupabasePets(context.supabase);
    const next = pets.some((item) => item.id === savedPet.id) ? pets : [savedPet, ...pets];
    writePetProfiles(next, context.userId);
    window.localStorage.setItem(getPetMigrationKey(context.userId), "true");
    return next;
  } catch (error) {
    console.warn("Supabase pet save failed; using localStorage fallback.", error);
    return upsertPetProfile(pet, fallbackUserId);
  }
}

export async function deletePetProfile(petId: string) {
  const fallbackUserId = getCurrentUserId();
  const fallbackNext = readPetProfiles(fallbackUserId).filter((pet) => pet.id !== petId);
  const context = await getSupabaseContext();
  if (!context) {
    writePetProfiles(fallbackNext, fallbackUserId);
    return fallbackNext;
  }

  try {
    const current = await listSupabasePets(context.supabase);
    const pet = current.find((item) => item.id === petId);
    if (pet?.photoPath) {
      await context.supabase.storage.from(PET_PHOTO_BUCKET).remove([pet.photoPath]);
    }
    const { error } = await context.supabase.from("pets").delete().eq("id", petId);
    if (error) throw error;
    const next = await listSupabasePets(context.supabase);
    writePetProfiles(next, context.userId);
    window.localStorage.setItem(getPetMigrationKey(context.userId), "true");
    return next;
  } catch (error) {
    console.warn("Supabase pet delete failed; using localStorage fallback.", error);
    writePetProfiles(fallbackNext, fallbackUserId);
    return fallbackNext;
  }
}
