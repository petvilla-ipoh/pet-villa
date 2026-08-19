import { NextResponse } from "next/server";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

export async function GET(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.admin
    .from("bookings")
    .select("id, client_draft_id, service, service_label, date_label, start_date, end_date, nights, hours, pets, subtotal_rm, total_rm, deposit_rm, balance_rm, voucher_id, voucher_code, voucher_title, voucher_discount_rm, special_request, draft_payload, created_at")
    .eq("owner_id", authorization.user.id)
    .eq("web_status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Customer booking draft query failed.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Your booking could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ booking: data || null });
}
