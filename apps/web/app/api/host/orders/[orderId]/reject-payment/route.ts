import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../../_lib/authorizeHost";

const paramsSchema = z.object({ orderId: z.string().uuid() });
const bodySchema = z.object({
  paymentSubmissionId: z.string().uuid(),
  reasonCode: z.enum(["not_received", "incorrect_amount", "other"]),
  reason: z.string().trim().max(500).optional()
});

function paymentMutationStatus(error: { code?: string } | null) {
  return error?.code === "P0001" || error?.code === "23505" ? 409 : 500;
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeHostRequest(request, "payments.manage");
  if (!authorization.ok) return authorization.response;
  const params = paramsSchema.safeParse(await context.params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) {
    return NextResponse.json({ error: "Invalid payment rejection request." }, { status: 400 });
  }

  const { data, error } = await authorization.admin.rpc("reject_host_order_payment", {
    p_order_row_id: params.data.orderId,
    p_payment_submission_id: body.data.paymentSubmissionId,
    p_actor_user_id: authorization.user.id,
    p_reason_code: body.data.reasonCode,
    p_reason: body.data.reason || null
  });
  if (error) {
    console.error("[host/orders/reject-payment] rejection failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json(
      { error: paymentMutationStatus(error) === 409 ? "This payment cannot be rejected in its current order state. No order amounts were changed." : "Payment rejection could not be saved. No order amounts were changed." },
      { status: paymentMutationStatus(error) }
    );
  }

  const result = (data || {}) as { already_rejected?: boolean; paid?: number; balance?: number; status?: string };
  return NextResponse.json({
    alreadyRejected: Boolean(result.already_rejected),
    paid: Number(result.paid || 0),
    balance: Number(result.balance || 0),
    status: result.status || null
  });
}
