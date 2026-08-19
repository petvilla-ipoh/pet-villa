import { NextResponse } from "next/server";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

const orderColumns = "id, owner_id, host_customer_id, booking_id, order_id, client_draft_id, customer_name, customer_phone, customer_email, service, service_label, date_label, start_date, end_date, nights, hours, pets, subtotal_rm, total_rm, deposit_rm, balance_rm, paid_rm, voucher_id, voucher_code, voucher_title, voucher_discount_rm, manual_discount_rm, charge_total_rm, special_request, status, cancelled_at, voided_at, photos_available, review, order_payload, created_at";

function customerSafePayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const {
    voidReason: _voidReason,
    voidReasonCode: _voidReasonCode,
    voidedBy: _voidedBy,
    ...safe
  } = payload as Record<string, unknown>;
  return safe;
}

export async function GET(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const { admin, user } = authorization;
  const [ordersResult, reviewsResult] = await Promise.all([
    admin
      .from("orders")
      .select(orderColumns)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("reviews")
      .select("order_id,rating,comment,quote,created_at")
      .eq("owner_id", user.id)
      .eq("source", "customer")
  ]);

  if (ordersResult.error) {
    console.error("Customer orders query failed.", {
      code: ordersResult.error.code,
      message: ordersResult.error.message,
      details: ordersResult.error.details,
      hint: ordersResult.error.hint
    });
    return NextResponse.json({ error: "Your orders could not be loaded." }, { status: 500 });
  }
  if (reviewsResult.error) {
    console.error("Customer order reviews query failed.", {
      code: reviewsResult.error.code,
      message: reviewsResult.error.message,
      details: reviewsResult.error.details,
      hint: reviewsResult.error.hint
    });
    return NextResponse.json({ error: "Your order reviews could not be loaded." }, { status: 500 });
  }

  const orders = (ordersResult.data || []).map((row) => ({
    ...row,
    order_payload: customerSafePayload(row.order_payload)
  }));
  return NextResponse.json({ orders, reviews: reviewsResult.data || [] });
}
