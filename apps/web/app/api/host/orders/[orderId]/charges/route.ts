import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../../_lib/authorizeHost";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const chargeSchema = z.object({
  requestId: z.string().uuid(),
  amount: z.number().positive().max(999999.99),
  reasonCode: z.literal("late_checkout"),
  note: z.string().trim().max(1000).default("")
});

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeHostRequest(request, "payments.manage");
  if (!authorization.ok) return authorization.response;

  const { orderId } = await context.params;
  if (!UUID_PATTERN.test(orderId)) {
    return NextResponse.json({ error: "A permanent order identity is required." }, { status: 400 });
  }
  const parsed = chargeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid charge." }, { status: 400 });
  }

  const { data, error } = await authorization.admin.rpc("add_host_order_charge", {
    p_request_id: parsed.data.requestId,
    p_order_row_id: orderId,
    p_actor_user_id: authorization.user.id,
    p_amount_rm: parsed.data.amount,
    p_reason_code: parsed.data.reasonCode,
    p_note: parsed.data.note
  });
  if (error || !data) {
    console.error("[host/orders/:id/charges] charge failed", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });
    return NextResponse.json({ error: "The charge could not be saved to this order." }, { status: 500 });
  }
  const result = data as Record<string, unknown>;
  return NextResponse.json({
    charge: { id: String(result.charge_id || ""), amount: Number(result.amount || 0) },
    order: {
      total: Number(result.total || 0),
      paid: Number(result.paid || 0),
      balance: Number(result.balance || 0),
      chargeTotal: Number(result.charge_total || 0)
    }
  });
}
