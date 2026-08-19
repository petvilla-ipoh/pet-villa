import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCustomerRequest } from "../../../_lib/authorizeCustomer";

const paramsSchema = z.object({ orderId: z.string().uuid() });
const bodySchema = z.object({ language: z.enum(["en", "zh"]) });

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;
  const params = paramsSchema.safeParse(await context.params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) {
    return NextResponse.json({ error: "Invalid operational WhatsApp consent." }, { status: 400 });
  }

  const { data, error } = await authorization.admin.rpc("record_operational_whatsapp_consent", {
    p_order_row_id: params.data.orderId,
    p_owner_user_id: authorization.user.id,
    p_language: body.data.language
  });
  if (error) {
    console.error("[customer/orders/operational-whatsapp-consent] RPC failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    const status = error.code === "P0001" || error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? "Operational WhatsApp consent cannot be recorded for this booking." : "Operational WhatsApp consent could not be saved." },
      { status }
    );
  }
  return NextResponse.json({ ok: true, result: data || null });
}
