"use client";

import type { VillaOrder } from "./orderFlow";

export type StripePaymentStage = "deposit" | "full" | "balance";

export async function startStripeCheckout(order: VillaOrder, stage: StripePaymentStage) {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: order.orderId,
      ownerId: order.customerId,
      stage
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) {
    throw new Error(data.error || "Could not start Stripe Checkout.");
  }
  window.location.href = data.url;
}
