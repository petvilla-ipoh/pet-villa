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
};

export type HostDogRecord = PetProfile & {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  phone_verified: boolean | null;
  email_verified: boolean | null;
  created_at: string | null;
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

async function getSupabaseClient() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
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
    emailVerified: Boolean(row.email_verified)
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

export async function loadHostProfiles(fallback: HostProfileRecord[] = []) {
  const supabase = await getSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email, phone_verified, email_verified, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data || []) as ProfileRow[]).map(profileFromRow);
  } catch (error) {
    console.warn("Supabase host profiles load failed; using localStorage fallback.", error);
    return fallback;
  }
}

export async function loadHostPets(owners: HostProfileRecord[] = [], fallback: HostDogRecord[] = []) {
  const supabase = await getSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from("pets")
      .select("id, owner_id, name, breed, weight_kg, age_text, gender, coat_color, vaccinated, neutered, friendly, calm, food_brand, meals_per_day, allergies, medication, special_notes, photo_url, photo_path")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const ownerMap = new Map(owners.map((owner) => [owner.id || "", owner]));
    return ((data || []) as PetRow[]).map((row) => petFromRow(row, ownerMap.get(row.owner_id)));
  } catch (error) {
    console.warn("Supabase host pets load failed; using localStorage fallback.", error);
    return fallback;
  }
}
