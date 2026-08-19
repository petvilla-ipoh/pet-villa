import { NextResponse } from "next/server";
import { validateSafeVoidRequest, type SafeVoidRequest } from "../../../../../lib/safeVoid";
import { authorizeHostRequest } from "../../../_lib/authorizeHost";

const PRIMARY_OWNER_EMAIL = "canyonfsp@gmail.com";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeHostRequest(request, "bookings.manage");
  if (!authorization.ok) return authorization.response;

  if (
    authorization.accessRole !== "owner"
    || authorization.staffStatus !== "active"
    || authorization.user.email?.trim().toLowerCase() !== PRIMARY_OWNER_EMAIL
  ) {
    return NextResponse.json({ error: "Only the active Primary Owner can void an order." }, { status: 403 });
  }

  const { orderId: orderRowId } = await context.params;
  const normalizedOrderRowId = decodeURIComponent(orderRowId || "").trim();
  if (!UUID_PATTERN.test(normalizedOrderRowId)) {
    return NextResponse.json({ error: "A valid order row ID is required." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as SafeVoidRequest;
  const validationError = validateSafeVoidRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data: order, error: orderError } = await authorization.admin
    .from("orders")
    .select("id,order_id,voided_at")
    .eq("id", normalizedOrderRowId)
    .maybeSingle();

  if (orderError) {
    console.error("[host/orders/void] order lookup failed", {
      message: orderError.message,
      code: orderError.code,
      details: orderError.details,
      hint: orderError.hint,
      orderRowId: normalizedOrderRowId,
      actorId: authorization.user.id
    });
    return NextResponse.json({ error: "This order could not be located." }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data, error } = await authorization.admin.rpc("void_order_as_primary_owner", {
    p_order_row_id: normalizedOrderRowId,
    p_actor_user_id: authorization.user.id,
    p_reason_code: body.reasonCode,
    p_reason: body.reason?.trim() || ""
  });

  if (error) {
    console.error("[host/orders/void] protected Safe Void operation failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      orderRowId: normalizedOrderRowId,
      orderId: order.order_id,
      actorId: authorization.user.id
    });
    const notConfigured = error.code === "42883" || error.code === "PGRST202" || error.code === "42P01";
    return NextResponse.json(
      { error: notConfigured ? "Safe Void database is not configured." : "This order could not be safely voided." },
      { status: notConfigured ? 503 : 409 }
    );
  }

  return NextResponse.json({ success: true, result: data });
}
