import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PaymentStage = "deposit" | "full" | "balance";

type PaymentTarget = {
  order_id: string;
  owner_id: string;
  amount_rm: number | string;
  currency: string;
  description: string;
};

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(secretKey);
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase environment variables are not configured.");
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

function validStage(value: unknown): value is PaymentStage {
  return value === "deposit" || value === "full" || value === "balance";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = String(body.orderId || "");
    const ownerId = String(body.ownerId || "");
    const stage = body.stage;

    if (!orderId || !ownerId || !validStage(stage)) {
      return NextResponse.json({ error: "Missing orderId, ownerId, or payment stage." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .rpc("get_stripe_order_payment_target", {
        p_order_id: orderId,
        p_owner_id: ownerId,
        p_stage: stage
      })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Payment target not found." }, { status: 400 });
    }

    const target = data as PaymentTarget;
    const amountSen = Math.round(Number(target.amount_rm) * 100);
    if (!Number.isFinite(amountSen) || amountSen <= 0) {
      return NextResponse.json({ error: "No payable amount remaining." }, { status: 400 });
    }

    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: target.currency.toLowerCase(),
            unit_amount: amountSen,
            product_data: {
              name: target.description,
              description: `Order ${target.order_id}`
            }
          }
        }
      ],
      payment_intent_data: {
        metadata: {
          orderId: target.order_id,
          ownerId: target.owner_id,
          stage,
          amountRm: String(target.amount_rm)
        }
      },
      metadata: {
        orderId: target.order_id,
        ownerId: target.owner_id,
        stage
      },
      success_url: `${origin}/orders?order=${encodeURIComponent(target.order_id)}&payment=success`,
      cancel_url: `${origin}/payment?payment=cancelled`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create Stripe Checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
