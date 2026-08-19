"use client";

import { getSupabaseBrowserClient } from "./supabase";
import type { PetProfile } from "./petProfiles";

export type HostProfileRecord = {
  id?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  registeredAt?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  isTemporary?: boolean;
  customerSource?: "auth" | "host";
};

export type HostDogRecord = PetProfile & {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  customerSource?: "auth" | "host";
};

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  phone_verified: boolean | null;
  email_verified: boolean | null;
  created_at: string | null;
  customer_source?: "auth" | "host";
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
  customer_source?: "auth" | "host";
};

const allowDevelopmentFallback = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true";

async function getSupabaseSession() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) return null;
  return data.session;
}

function profileFromRow(row: ProfileRow): HostProfileRecord {
  return {
    id: row.id,
    fullName: row.full_name || "",
    name: row.full_name || "",
    phone: row.phone || "",
    email: row.email || "",
    registeredAt: row.created_at || undefined,
    phoneVerified: Boolean(row.phone_verified),
    emailVerified: Boolean(row.email_verified),
    customerSource: row.customer_source || "auth"
  };
}

function weightLabel(weight: PetRow["weight_kg"]) {
  if (weight === null || weight === undefined || weight === "") return "";
  return `${String(weight).replace(/\.00$/, "")}kg`;
}

function petFromRow(row: PetRow, owner?: HostProfileRecord): HostDogRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: owner?.fullName || owner?.name || "Pet Owner",
    ownerPhone: owner?.phone || "",
    ownerEmail: owner?.email || "",
    customerSource: row.customer_source || owner?.customerSource || "auth",
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

export async function loadHostCrmData(
  fallbackProfiles: HostProfileRecord[] = [],
  fallbackPets: HostDogRecord[] = []
) {
  try {
    const session = await getSupabaseSession();
    if (!session) throw new Error("Your Host session expired. Please sign in again.");
    const response = await fetch("/api/host/customers", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store"
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Customer records could not be loaded.");

    const profiles = ((body.customers || []) as ProfileRow[]).map(profileFromRow);
    const profileIds = new Set(profiles.map((profile) => profile.id));
    const temporary = allowDevelopmentFallback
      ? fallbackProfiles.filter((profile) => profile.isTemporary && profile.id && !profileIds.has(profile.id))
      : [];
    const owners = [...profiles, ...temporary];
    const ownerMap = new Map(owners.map((owner) => [owner.id || "", owner]));
    const pets = ((body.pets || []) as PetRow[]).map((row) => petFromRow(row, ownerMap.get(row.owner_id)));
    const persistedPetIds = new Set(pets.map((pet) => pet.id));
    const developmentPets = allowDevelopmentFallback
      ? fallbackPets.filter((pet) => pet.id && !persistedPetIds.has(pet.id))
      : [];

    return { profiles: owners, pets: [...pets, ...developmentPets] };
  } catch (error) {
    if (allowDevelopmentFallback) return { profiles: fallbackProfiles, pets: fallbackPets };
    throw error;
  }
}
