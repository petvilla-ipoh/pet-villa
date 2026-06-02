"use client";

export type ReviewCopy = {
  en: string;
  zh: string;
};

export type PublicReview = {
  id: string;
  name: string;
  pet: string;
  date: string;
  rating: number;
  quote: ReviewCopy;
  source: "host" | "customer";
  hidden?: boolean;
  orderId?: string;
};

export type HostReview = Omit<PublicReview, "source">;

const hostReviewsKey = "pet-villa-host-reviews";
const hiddenReviewsKey = "pet-villa-hidden-reviews";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("pet-villa-reviews"));
}

export function readHostReviews(): HostReview[] {
  return readJson<HostReview[]>(hostReviewsKey, []);
}

export function saveHostReview(review: Omit<HostReview, "id" | "date">) {
  const next: HostReview = {
    ...review,
    hidden: false,
    id: `host-review-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10)
  };
  writeJson(hostReviewsKey, [next, ...readHostReviews()]);
}

export function deleteHostReview(reviewId: string) {
  writeJson(hostReviewsKey, readHostReviews().filter((review) => review.id !== reviewId));
}

export function readHiddenReviewIds(): string[] {
  return readJson<string[]>(hiddenReviewsKey, []);
}

export function hideReview(reviewId: string) {
  const hidden = new Set(readHiddenReviewIds());
  hidden.add(reviewId);
  writeJson(hiddenReviewsKey, Array.from(hidden));
}

export function showReview(reviewId: string) {
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

export function readCustomerOrderReviews(): PublicReview[] {
  if (typeof window === "undefined") return [];
  const reviews: PublicReview[] = [];
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-orders:"))
    .forEach((key) => {
      const orders = readJson<any[]>(key, []);
      orders.forEach((order) => {
        if (!order?.review) return;
        const rating = Number(order.review.rating || order.review.stars || 0);
        const text = normalizeQuote(order.review.text || order.review.quote || order.review.comment);
        if (!rating || (!text.en && !text.zh)) return;
        const petNames = Array.isArray(order.pets) ? order.pets.map((pet: any) => pet.name).filter(Boolean).join(", ") : "Pet";
        reviews.push({
          id: `customer-review-${order.orderId}`,
          orderId: order.orderId,
          name: order.customerName || order.ownerName || "Pet Owner",
          pet: petNames || "Pet",
          date: order.review.createdAt?.slice?.(0, 10) || order.updatedAt?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
          rating,
          quote: text,
          source: "customer"
        });
      });
    });
  return reviews;
}

export function readPublicReviews(options: { includeHidden?: boolean } = {}): PublicReview[] {
  const hidden = new Set(readHiddenReviewIds());
  const hostReviews = readHostReviews().map<PublicReview>((review) => ({ ...review, source: "host", hidden: hidden.has(review.id) || review.hidden }));
  const customerReviews = readCustomerOrderReviews().map<PublicReview>((review) => ({ ...review, hidden: hidden.has(review.id) }));
  const merged = [...hostReviews, ...customerReviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return options.includeHidden ? merged : merged.filter((review) => !review.hidden);
}
