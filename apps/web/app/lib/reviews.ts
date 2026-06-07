"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

export type ReviewCopy = {
  en: string;
  zh: string;
};

export type PublicReview = {
  id: string;
  name: string;
  pet: string;
  dogName?: string;
  breed?: string;
  date: string;
  rating: number;
  quote: ReviewCopy;
  source: "host" | "customer";
  photo?: string;
  hidden?: boolean;
  orderId?: string;
  ownerId?: string;
};

export type HostReview = Omit<PublicReview, "source">;

type ReviewRow = {
  id: string;
  source: "host" | "customer";
  owner_id: string | null;
  order_id: string | null;
  reviewer_name: string | null;
  pet_name: string | null;
  dog_name: string | null;
  breed: string | null;
  rating: number | null;
  quote: Partial<ReviewCopy> | null;
  comment: string | null;
  photo_url: string | null;
  hidden: boolean | null;
  review_date: string | null;
  created_at: string;
};

type ReviewOrder = {
  orderId: string;
  customerId?: string;
  customerName?: string;
  ownerName?: string;
  serviceLabel?: string;
  updatedAt?: string;
  pets?: Array<{ name?: string; breed?: string; photo?: string; imageUrl?: string; photoDataUrl?: string }>;
  review?: {
    stars?: number;
    rating?: number;
    body?: string;
    text?: string;
    quote?: string | Partial<ReviewCopy>;
    comment?: string;
    createdAt?: string;
  };
};

const hostReviewsKey = "pet-villa-host-reviews";
const hiddenReviewsKey = "pet-villa-hidden-reviews";
const reviewMigrationKey = "pet-villa-reviews-supabase-migrated";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T, notify = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  if (notify) window.dispatchEvent(new Event("pet-villa-reviews"));
}

function readSessionUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user || null;
  } catch {
    return null;
  }
}

function readSessionRole() {
  return readSessionUser()?.role || "";
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

export function readHostReviews(): HostReview[] {
  return readJson<HostReview[]>(hostReviewsKey, []);
}

function writeHostReviews(reviews: HostReview[], notify = true) {
  writeJson(hostReviewsKey, reviews, notify);
}

function deleteHostReview(reviewId: string) {
  writeHostReviews(readHostReviews().filter((review) => review.id !== reviewId));
}

export function readHiddenReviewIds(): string[] {
  return readJson<string[]>(hiddenReviewsKey, []);
}

function hideReviewLocal(reviewId: string) {
  const hidden = new Set(readHiddenReviewIds());
  hidden.add(reviewId);
  writeJson(hiddenReviewsKey, Array.from(hidden));
}

function showReviewLocal(reviewId: string) {
  writeJson(hiddenReviewsKey, readHiddenReviewIds().filter((id) => id !== reviewId));
}

function normalizeQuote(value: unknown): ReviewCopy {
  if (typeof value === "string") return { en: value, zh: value };
  if (value && typeof value === "object") {
    const copy = value as Partial<ReviewCopy>;
    return {
      en: copy.en || copy.zh || "",
      zh: copy.zh || copy.en || ""
    };
  }
  return { en: "", zh: "" };
}

function quoteFromReview(order: ReviewOrder) {
  const review = order.review;
  return normalizeQuote(review?.body || review?.text || review?.quote || review?.comment);
}

function reviewFromRow(row: ReviewRow): PublicReview {
  const quote = normalizeQuote(row.quote && Object.keys(row.quote).length ? row.quote : row.comment);
  return {
    id: row.id,
    ownerId: row.owner_id || undefined,
    orderId: row.order_id || undefined,
    name: row.reviewer_name || "Pet Owner",
    pet: row.pet_name || row.dog_name || "Pet",
    dogName: row.dog_name || row.pet_name || "Pet",
    breed: row.breed || "Small dog",
    date: row.review_date || row.created_at.slice(0, 10),
    rating: Number(row.rating || 0),
    quote,
    photo: row.photo_url || undefined,
    source: row.source,
    hidden: Boolean(row.hidden)
  };
}

function orderReviewToPublicReview(order: ReviewOrder): PublicReview | null {
  if (!order?.review) return null;
  const rating = Number(order.review.rating || order.review.stars || 0);
  const quote = quoteFromReview(order);
  if (!rating || (!quote.en && !quote.zh)) return null;
  const petNames = Array.isArray(order.pets) ? order.pets.map((pet) => pet.name).filter(Boolean).join(", ") : "Pet";
  const breeds = Array.isArray(order.pets) ? order.pets.map((pet) => pet.breed).filter(Boolean).join(", ") : "";
  const firstPhoto = Array.isArray(order.pets)
    ? order.pets.find((pet) => pet.photo || pet.imageUrl || pet.photoDataUrl)?.photo
      || order.pets.find((pet) => pet.photo || pet.imageUrl || pet.photoDataUrl)?.imageUrl
      || order.pets.find((pet) => pet.photo || pet.imageUrl || pet.photoDataUrl)?.photoDataUrl
    : "";
  return {
    id: `customer-review-${order.orderId}`,
    ownerId: order.customerId,
    orderId: order.orderId,
    name: order.customerName || order.ownerName || "Pet Owner",
    pet: petNames || "Pet",
    dogName: petNames || "Pet",
    breed: breeds || order.serviceLabel || "Small dog",
    date: order.review.createdAt?.slice?.(0, 10) || order.updatedAt?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
    rating,
    quote,
    photo: firstPhoto,
    source: "customer"
  };
}

function readLocalCustomerOrders() {
  if (typeof window === "undefined") return [];
  const orders: ReviewOrder[] = [];
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-orders:"))
    .forEach((key) => {
      orders.push(...readJson<ReviewOrder[]>(key, []));
    });
  return orders;
}

function deleteCustomerReviewLocal(review: Pick<PublicReview, "id" | "orderId">) {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-orders:"))
    .forEach((key) => {
      const orders = readJson<ReviewOrder[]>(key, []);
      const nextOrders = orders.map((order) => {
        if (order.orderId !== review.orderId) return order;
        const { review: _removedReview, ...rest } = order;
        return rest;
      });
      if (JSON.stringify(orders) !== JSON.stringify(nextOrders)) {
        window.localStorage.setItem(key, JSON.stringify(nextOrders));
      }
    });
  showReviewLocal(review.id);
  window.dispatchEvent(new Event("pet-villa-orders"));
  window.dispatchEvent(new Event("pet-villa-reviews"));
}

export function readCustomerOrderReviews(): PublicReview[] {
  return readLocalCustomerOrders()
    .map(orderReviewToPublicReview)
    .filter((review): review is PublicReview => Boolean(review));
}

export function readPublicReviews(options: { includeHidden?: boolean } = {}): PublicReview[] {
  const hidden = new Set(readHiddenReviewIds());
  const hostReviews = readHostReviews().map<PublicReview>((review) => ({ ...review, source: "host", hidden: hidden.has(review.id) || review.hidden }));
  const customerReviews = readCustomerOrderReviews().map<PublicReview>((review) => ({ ...review, hidden: hidden.has(review.id) }));
  const merged = [...hostReviews, ...customerReviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return options.includeHidden ? merged : merged.filter((review) => !review.hidden);
}

function rowFromPublicReview(review: PublicReview, ownerId?: string) {
  return {
    source: review.source,
    owner_id: review.source === "customer" ? ownerId || review.ownerId || null : null,
    order_id: review.orderId || null,
    reviewer_name: review.name || "Pet Owner",
    pet_name: review.pet || review.dogName || "Pet",
    dog_name: review.dogName || review.pet || "Pet",
    breed: review.breed || "Small dog",
    rating: review.rating,
    quote: review.quote,
    comment: review.quote.en || review.quote.zh || "",
    photo_url: review.photo || null,
    hidden: Boolean(review.hidden),
    review_date: review.date || new Date().toISOString().slice(0, 10),
    review_payload: review
  };
}

async function listSupabaseReviews(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, source, owner_id, order_id, reviewer_name, pet_name, dog_name, breed, rating, quote, comment, photo_url, hidden, review_date, created_at")
    .order("review_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as ReviewRow[]).map(reviewFromRow);
}

async function migrateLocalReviewsToSupabase(supabase: SupabaseClient, userId: string) {
  const localReviews = readPublicReviews({ includeHidden: true });
  for (const review of localReviews) {
    const payload = rowFromPublicReview(review, review.source === "customer" && review.ownerId && UUID_PATTERN.test(review.ownerId) ? review.ownerId : userId);
    const mutation = review.source === "customer" && review.orderId
      ? supabase.from("reviews").upsert(payload, { onConflict: "owner_id,order_id,source" })
      : supabase.from("reviews").insert(payload);
    const { error } = await mutation;
    if (error) throw error;
  }
}

export async function loadPublicReviews(options: { includeHidden?: boolean } = {}) {
  const fallback = readPublicReviews(options);
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return fallback;

  try {
    let reviews = await listSupabaseReviews(supabase);
    const shouldMigrate = typeof window !== "undefined"
      && isHostSession()
      && window.localStorage.getItem(reviewMigrationKey) !== "true"
      && reviews.length === 0
      && readPublicReviews({ includeHidden: true }).length > 0;
    if (shouldMigrate) {
      const context = await getSupabaseContext();
      if (context) {
        await migrateLocalReviewsToSupabase(context.supabase, context.userId);
        reviews = await listSupabaseReviews(context.supabase);
      }
    }
    if (typeof window !== "undefined" && (reviews.length > 0 || isHostSession())) {
      window.localStorage.setItem(reviewMigrationKey, "true");
    }
    return options.includeHidden ? reviews : reviews.filter((review) => !review.hidden);
  } catch (error) {
    console.warn("Supabase reviews load failed; using localStorage fallback.", error);
    return fallback;
  }
}

export async function saveCustomerOrderReview(order: ReviewOrder) {
  const localReview = orderReviewToPublicReview(order);
  if (!localReview) return readPublicReviews();
  const context = await getSupabaseContext();
  if (!context) return readPublicReviews();

  try {
    const { error } = await context.supabase
      .from("reviews")
      .upsert(rowFromPublicReview(localReview, context.userId), { onConflict: "owner_id,order_id,source" });
    if (error) throw error;
    return loadPublicReviews();
  } catch (error) {
    console.warn("Supabase customer review save failed; using localStorage fallback.", error);
    return readPublicReviews();
  }
}

export async function saveHostReview(review: Omit<HostReview, "id"> & { date?: string }) {
  const next: HostReview = {
    ...review,
    hidden: false,
    id: `host-review-${Date.now()}`,
    date: review.date || new Date().toISOString().slice(0, 10)
  };
  writeHostReviews([next, ...readHostReviews()]);

  const context = await getSupabaseContext();
  if (!context) return readPublicReviews({ includeHidden: true });

  try {
    const publicReview: PublicReview = { ...next, source: "host" };
    const { error } = await context.supabase.from("reviews").insert(rowFromPublicReview(publicReview));
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    console.warn("Supabase host review save failed; using localStorage fallback.", error);
    return readPublicReviews({ includeHidden: true });
  }
}

export async function hideReview(reviewId: string) {
  hideReviewLocal(reviewId);
  const context = await getSupabaseContext();
  if (!context || !UUID_PATTERN.test(reviewId)) return readPublicReviews({ includeHidden: true });

  try {
    const { error } = await context.supabase.from("reviews").update({ hidden: true }).eq("id", reviewId);
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    console.warn("Supabase review hide failed; using localStorage fallback.", error);
    return readPublicReviews({ includeHidden: true });
  }
}

export async function showReview(reviewId: string) {
  showReviewLocal(reviewId);
  const context = await getSupabaseContext();
  if (!context || !UUID_PATTERN.test(reviewId)) return readPublicReviews({ includeHidden: true });

  try {
    const { error } = await context.supabase.from("reviews").update({ hidden: false }).eq("id", reviewId);
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    console.warn("Supabase review show failed; using localStorage fallback.", error);
    return readPublicReviews({ includeHidden: true });
  }
}

export async function deleteReview(review: Pick<PublicReview, "id" | "source" | "orderId">) {
  if (review.source === "host") {
    deleteHostReview(review.id);
  } else {
    deleteCustomerReviewLocal(review);
  }

  const context = await getSupabaseContext();
  if (!context || !UUID_PATTERN.test(review.id)) return readPublicReviews({ includeHidden: true });

  try {
    const { error } = await context.supabase.from("reviews").delete().eq("id", review.id);
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    console.warn("Supabase review delete failed; using localStorage fallback.", error);
    return readPublicReviews({ includeHidden: true });
  }
}
