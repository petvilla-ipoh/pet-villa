"use client";

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
};

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

export function readPetProfiles(userId = getCurrentUserId()): PetProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getPetStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writePetProfiles(pets: PetProfile[], userId = getCurrentUserId()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getPetStorageKey(userId), JSON.stringify(pets));
  window.dispatchEvent(new Event("pet-villa-pets"));
}

export function createEmptyPet(): PetProfile {
  return {
    id: `pet-${Date.now()}`,
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
