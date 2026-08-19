import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCustomerRequest } from "../../../_lib/authorizeCustomer";

const paramsSchema = z.object({ orderId: z.string().uuid() });
const bodySchema = z.object({
  amount: z.number().positive().finite(),
  method: z.enum(["qr", "bank"]),
  idempotencyKey: z.string().uuid()
});

function paymentMutationStatus(error: { code?: string } | null) {
  return error?.code === "P0001" || error?.code === "23505" ? 409 : 500;
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;
  const params = paramsSchema.safeParse(await context.params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) {
    return NextResponse.json({ error: "Invalid payment submission." }, { status: 400 });
  }

  const { data, error } = await authorization.admin.rpc("submit_customer_order_payment", {
    p_order_row_id: params.data.orderId,
    p_owner_user_id: authorization.user.id,
    p_amount: body.data.amount,
    p_method: body.data.method,
    p_idempotency_key: body.data.idempotencyKey
  });
  if (!error) return NextResponse.json({ ok: true, result: data || null });
  console.error("[customer/orders/payment-submission] C1B RPC failed", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
  });
  return NextResponse.json(
    { error: paymentMutationStatus(error) === 409 ? "This payment submission cannot be completed in its current order state." : "Payment submission could not be saved. No payment was verified." },
    { status: paymentMutationStatus(error) }
  );
}
