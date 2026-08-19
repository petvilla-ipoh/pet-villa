import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../../_lib/authorizeHost";

const paramsSchema = z.object({ orderId: z.string().uuid() });
const bodySchema = z.object({
  mode: z.enum(["submission", "balance"]),
  paymentSubmissionId: z.string().uuid().optional()
}).superRefine((value, context) => {
  if (value.mode === "submission" && !value.paymentSubmissionId) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "A specific submitted payment is required." });
  }
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
    return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
  }

  const { data, error } = await authorization.admin.rpc("verify_host_order_payment", {
    p_order_row_id: params.data.orderId,
    p_actor_user_id: authorization.user.id,
    p_mode: body.data.mode,
    p_payment_submission_id: body.data.paymentSubmissionId || null
  });
  if (error) {
    console.error("[host/orders/verify-payment] verification failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json(
      { error: paymentMutationStatus(error) === 409 ? "This payment cannot be verified in its current order state. No order amounts were changed." : "Payment verification could not be saved. No order amounts were changed." },
      { status: paymentMutationStatus(error) }
    );
  }
  const result = (data || {}) as {
    already_verified?: boolean;
    order_row_id?: string;
    amount?: number;
    paid?: number;
    balance?: number;
    status?: string;
  };
  return NextResponse.json({
    alreadyVerified: Boolean(result.already_verified),
    orderRowId: result.order_row_id || params.data.orderId,
    amount: Number(result.amount || 0),
    paid: Number(result.paid || 0),
    balance: Number(result.balance || 0),
    status: result.status || null
  });
}
