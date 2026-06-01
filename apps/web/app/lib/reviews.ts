"use client";

export type HostReview = {
  id: string;
  name: string;
  pet: string;
  date: string;
  rating: number;
  quote: {
    en: string;
    zh: string;
  };
};

const hostReviewsKey = "pet-villa-host-reviews";

export function readHostReviews(): HostReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(hostReviewsKey);
    return raw ? (JSON.parse(raw) as HostReview[]) : [];
  } catch {
    return [];
  }
}

export function saveHostReview(review: Omit<HostReview, "id" | "date">) {
  if (typeof window === "undefined") return;
  const next: HostReview = {
    ...review,
    id: `review-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10)
  };
  window.localStorage.setItem(hostReviewsKey, JSON.stringify([next, ...readHostReviews()]));
  window.dispatchEvent(new Event("pet-villa-reviews"));
}

export function deleteHostReview(reviewId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(hostReviewsKey, JSON.stringify(readHostReviews().filter((review) => review.id !== reviewId)));
  window.dispatchEvent(new Event("pet-villa-reviews"));
}
