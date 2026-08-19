import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../../_lib/authorizeHost";

const paramsSchema = z.object({ orderId: z.string().uuid() });

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeHostRequest(request, "payments.manage");
  if (!authorization.ok) return authorization.response;
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return NextResponse.json({ error: "Invalid order identity." }, { status: 400 });

  const { data, error } = await authorization.admin.rpc("materialize_host_order_payment_submission", {
    p_order_row_id: params.data.orderId,
    p_actor_user_id: authorization.user.id
  });
  if (error) {
    console.error("[host/orders/payment-submission] preparation failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    const status = error.code === "P0001" || error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? "This pending payment cannot be prepared in its current order state." : "The payment submission could not be prepared." },
      { status }
    );
  }
  return NextResponse.json({ paymentSubmission: data || null });
}
