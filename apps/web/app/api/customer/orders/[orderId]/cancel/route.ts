import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { authorizeCustomerRequest } from "../../../_lib/authorizeCustomer";

const paramsSchema = z.object({ orderId: z.string().uuid() });

function isMissingRpc(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST202" || error?.code === "42883" || /function .* does not exist/i.test(error?.message || "");
}

async function cancelWithProtectedServerFallback(admin: SupabaseClient, orderRowId: string, ownerId: string) {
  const { data: order, error: readError } = await admin
    .from("orders")
    .select("id,status,voided_at,order_payload")
    .eq("id", orderRowId)
    .eq("owner_id", ownerId)
    .is("host_customer_id", null)
    .maybeSingle();
  if (readError) throw readError;
  if (!order) return { error: "Order not found.", status: 404 } as const;
  if (order.voided_at) return { error: "This order is not available for customer actions.", status: 409 } as const;
  if (order.status === "cancelled") return { ok: true, alreadyCancelled: true } as const;
  if (!["confirmed", "pending_verification"].includes(order.status)) {
    return { error: "This booking can no longer be cancelled online.", status: 409 } as const;
  }
  const cancelledAt = new Date().toISOString();
  const payload = (order.order_payload || {}) as Record<string, unknown>;
  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      order_payload: { ...payload, status: "cancelled", cancelledAt }
    })
    .eq("id", orderRowId)
    .eq("owner_id", ownerId)
    .is("host_customer_id", null);
  if (updateError) throw updateError;
  return { ok: true, alreadyCancelled: false } as const;
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return NextResponse.json({ error: "Invalid cancellation request." }, { status: 400 });

  const { data, error } = await authorization.admin.rpc("cancel_customer_order", {
    p_order_row_id: params.data.orderId,
    p_owner_user_id: authorization.user.id
  });
  if (!error) return NextResponse.json({ ok: true, result: data || null });

  if (isMissingRpc(error)) {
    try {
      const fallback = await cancelWithProtectedServerFallback(authorization.admin, params.data.orderId, authorization.user.id);
      if ("error" in fallback) return NextResponse.json({ error: fallback.error }, { status: fallback.status });
      return NextResponse.json(fallback);
    } catch (fallbackError) {
      console.error("[customer/orders/cancel] protected fallback failed", fallbackError);
    }
  } else {
    console.error("[customer/orders/cancel] RPC failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
  return NextResponse.json({ error: "Booking cancellation could not be saved." }, { status: 500 });
}
