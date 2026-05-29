import Stripe from "stripe";
import type { PaymentMethod } from "@pet-villa/shared";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_missing");

export async function createStripePaymentIntent(input: {
  bookingId: string;
  amountSen: number;
  currency: string;
  method: PaymentMethod;
  stage: "deposit" | "final";
  idempotencyKey: string;
}) {
  return stripe.paymentIntents.create(
    {
      amount: input.amountSen,
      currency: input.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: input.bookingId,
        stage: input.stage,
        requestedMethod: input.method
      }
    },
    { idempotencyKey: input.idempotencyKey }
  );
}

export function constructStripeWebhookEvent(body: Buffer, signature: string | undefined) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) {
    throw new Error("Stripe webhook secret or signature is missing.");
  }

  return stripe.webhooks.constructEvent(body, signature, secret);
}
