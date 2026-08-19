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
const reviewEditsKey = "pet-villa-review-edits";
const reviewMigrationKey = "pet-villa-reviews-supabase-migrated";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowReviewDevelopmentFallback = process.env.NODE_ENV !== "production"
  && (process.env.NEXT_PUBLIC_ENABLE_HOST_LOCAL_FALLBACK === "true"
    || process.env.NEXT_PUBLIC_ENABLE_CUSTOMER_LOCAL_FALLBACK === "true");

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

function readReviewEdits(): Record<string, PublicReview> {
  return readJson<Record<string, PublicReview>>(reviewEditsKey, {});
}

function writeReviewEdit(review: PublicReview) {
  const current = readReviewEdits();
  writeJson(reviewEditsKey, { ...current, [review.id]: review });
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
  const edits = readReviewEdits();
  const hostReviews = readHostReviews().map<PublicReview>((review) => ({ ...review, source: "host", hidden: hidden.has(review.id) || review.hidden }));
  const customerReviews = readCustomerOrderReviews().map<PublicReview>((review) => ({ ...review, hidden: hidden.has(review.id) }));
  const merged = [...hostReviews, ...customerReviews]
    .map((review) => edits[review.id] ? { ...review, ...edits[review.id], hidden: review.hidden } : review)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return options.includeHidden ? merged : merged.filter((review) => !review.hidden);
}

function rowFromPublicReview(review: PublicReview, ownerId?: string) {
  const reviewPayload = { ...review };
  delete reviewPayload.photo;
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
    photo_url: review.photo?.startsWith("data:") ? null : review.photo || null,
    hidden: Boolean(review.hidden),
    review_date: review.date || new Date().toISOString().slice(0, 10),
    review_payload: reviewPayload
  };
}

async function listSupabaseReviews(supabase: SupabaseClient, includeHidden = false) {
  let query = supabase
    .from("reviews")
    .select("id, source, owner_id, order_id, reviewer_name, pet_name, dog_name, breed, rating, quote, comment, photo_url, hidden, review_date, created_at")
    .order("review_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (!includeHidden) query = query.eq("hidden", false);
  const { data, error } = await query;
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
  if (!supabase) return allowReviewDevelopmentFallback ? fallback : [];

  try {
    let reviews = await listSupabaseReviews(supabase, Boolean(options.includeHidden));
    const shouldMigrate = typeof window !== "undefined"
      && allowReviewDevelopmentFallback
      && isHostSession()
      && window.localStorage.getItem(reviewMigrationKey) !== "true"
      && reviews.length === 0
      && readPublicReviews({ includeHidden: true }).length > 0;
    if (shouldMigrate) {
      const context = await getSupabaseContext();
      if (context) {
        await migrateLocalReviewsToSupabase(context.supabase, context.userId);
        reviews = await listSupabaseReviews(context.supabase, Boolean(options.includeHidden));
      }
    }
    if (typeof window !== "undefined" && (reviews.length > 0 || isHostSession())) {
      window.localStorage.setItem(reviewMigrationKey, "true");
    }
    return options.includeHidden ? reviews : reviews.filter((review) => !review.hidden);
  } catch (error) {
    console.warn("Supabase reviews load failed.", error);
    if (allowReviewDevelopmentFallback) return fallback;
    throw new Error("Reviews could not be refreshed.");
  }
}

export async function saveCustomerOrderReview(order: ReviewOrder) {
  const localReview = orderReviewToPublicReview(order);
  if (!localReview) return readPublicReviews();
  const context = await getSupabaseContext();
  if (!context) {
    if (allowReviewDevelopmentFallback) return readPublicReviews();
    throw new Error("Review service is unavailable. Your review was not published.");
  }

  try {
    const { error } = await context.supabase
      .from("reviews")
      .upsert(rowFromPublicReview(localReview, context.userId), { onConflict: "owner_id,order_id,source" });
    if (error) throw error;
    return loadPublicReviews();
  } catch (error) {
    if (allowReviewDevelopmentFallback) return readPublicReviews();
    console.error("Supabase customer review save failed.", error);
    throw new Error("Your review could not be published. Please try again.");
  }
}

export async function saveHostReview(review: Omit<HostReview, "id"> & { date?: string }) {
  const next: HostReview = {
    ...review,
    hidden: false,
    id: `host-review-${Date.now()}`,
    date: review.date || new Date().toISOString().slice(0, 10)
  };

  const context = await getSupabaseContext();
  if (!context) {
    if (!allowReviewDevelopmentFallback) throw new Error("Review service is unavailable. Nothing was published.");
    writeHostReviews([next, ...readHostReviews()]);
    return readPublicReviews({ includeHidden: true });
  }

  try {
    const publicReview: PublicReview = { ...next, source: "host" };
    const { error } = await context.supabase.from("reviews").insert(rowFromPublicReview(publicReview));
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    if (allowReviewDevelopmentFallback) {
      writeHostReviews([next, ...readHostReviews()]);
      return readPublicReviews({ includeHidden: true });
    }
    console.error("Supabase host review save failed.", error);
    throw new Error("Review could not be published. Nothing was saved.");
  }
}

function updateReviewLocal(review: PublicReview) {
  writeReviewEdit(review);
  if (review.source !== "host") return;
  const hostReviews = readHostReviews();
  const nextHostReview: HostReview = {
    id: review.id,
    name: review.name,
    pet: review.pet,
    dogName: review.dogName,
    breed: review.breed,
    date: review.date,
    rating: review.rating,
    quote: review.quote,
    photo: review.photo,
    hidden: review.hidden,
    orderId: review.orderId,
    ownerId: review.ownerId
  };
  writeHostReviews(hostReviews.map((item) => item.id === review.id ? nextHostReview : item));
}

export async function updateReview(review: PublicReview) {
  const context = await getSupabaseContext();
  if (!context || !UUID_PATTERN.test(review.id)) {
    if (!allowReviewDevelopmentFallback) throw new Error("Review changes could not be saved.");
    updateReviewLocal(review);
    return readPublicReviews({ includeHidden: true });
  }

  try {
    const { error } = await context.supabase
      .from("reviews")
      .update(rowFromPublicReview(review, review.ownerId))
      .eq("id", review.id);
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    if (allowReviewDevelopmentFallback) {
      updateReviewLocal(review);
      return readPublicReviews({ includeHidden: true });
    }
    console.error("Supabase review update failed.", error);
    throw new Error("Review changes could not be saved.");
  }
}

export async function hideReview(reviewId: string) {
  const context = await getSupabaseContext();
  if (!context || !UUID_PATTERN.test(reviewId)) {
    if (!allowReviewDevelopmentFallback) throw new Error("Review visibility could not be changed.");
    hideReviewLocal(reviewId);
    return readPublicReviews({ includeHidden: true });
  }

  try {
    const { error } = await context.supabase.from("reviews").update({ hidden: true }).eq("id", reviewId);
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    if (allowReviewDevelopmentFallback) {
      hideReviewLocal(reviewId);
      return readPublicReviews({ includeHidden: true });
    }
    console.error("Supabase review hide failed.", error);
    throw new Error("Review visibility could not be changed.");
  }
}

export async function showReview(reviewId: string) {
  const context = await getSupabaseContext();
  if (!context || !UUID_PATTERN.test(reviewId)) {
    if (!allowReviewDevelopmentFallback) throw new Error("Review visibility could not be changed.");
    showReviewLocal(reviewId);
    return readPublicReviews({ includeHidden: true });
  }

  try {
    const { error } = await context.supabase.from("reviews").update({ hidden: false }).eq("id", reviewId);
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    if (allowReviewDevelopmentFallback) {
      showReviewLocal(reviewId);
      return readPublicReviews({ includeHidden: true });
    }
    console.error("Supabase review show failed.", error);
    throw new Error("Review visibility could not be changed.");
  }
}

export async function deleteReview(review: Pick<PublicReview, "id" | "source" | "orderId">) {
  const context = await getSupabaseContext();
  if (!context || !UUID_PATTERN.test(review.id)) {
    if (!allowReviewDevelopmentFallback) throw new Error("Review could not be deleted.");
    if (review.source === "host") deleteHostReview(review.id);
    else deleteCustomerReviewLocal(review);
    return readPublicReviews({ includeHidden: true });
  }

  try {
    const { error } = await context.supabase.from("reviews").delete().eq("id", review.id);
    if (error) throw error;
    return loadPublicReviews({ includeHidden: true });
  } catch (error) {
    if (allowReviewDevelopmentFallback) {
      if (review.source === "host") deleteHostReview(review.id);
      else deleteCustomerReviewLocal(review);
      return readPublicReviews({ includeHidden: true });
    }
    console.error("Supabase review delete failed.", error);
    throw new Error("Review could not be deleted.");
  }
}
