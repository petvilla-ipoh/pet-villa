import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

const orderColumns = "id, owner_id, host_customer_id, booking_id, order_id, client_draft_id, customer_name, customer_phone, customer_email, service, service_label, date_label, start_date, end_date, nights, hours, pets, subtotal_rm, total_rm, deposit_rm, balance_rm, paid_rm, voucher_id, voucher_code, voucher_title, voucher_discount_rm, manual_discount_rm, charge_total_rm, special_request, status, cancelled_at, voided_at, photos_available, review, order_payload, created_at";

const onlinePetSchema = z.object({
  id: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(100),
  breed: z.string().trim().max(100),
  weight: z.string().trim().max(50).optional(),
  photoDataUrl: z.string().trim().max(1000).optional()
});

const createOnlineOrderSchema = z.object({
  consentLanguage: z.enum(["en", "zh"]),
  order: z.object({
    id: z.string().trim().min(1).max(200),
    bookingId: z.string().uuid(),
    orderId: z.string().trim().min(1).max(160),
    service: z.enum(["overnight", "daycare"]),
    serviceLabel: z.string().trim().min(1).max(100),
    dateLabel: z.string().trim().min(1).max(200),
    startDateISO: z.string().date(),
    endDateISO: z.string().date(),
    nights: z.number().int().min(0).max(366),
    hours: z.number().finite().min(0).max(10000),
    pets: z.array(onlinePetSchema).min(1).max(20),
    subtotal: z.number().finite().min(0).max(1000000),
    total: z.number().finite().min(0).max(1000000),
    deposit: z.number().finite().min(0).max(1000000),
    voucherId: z.string().trim().max(200).nullable().optional(),
    voucherCode: z.string().trim().max(200).nullable().optional(),
    voucherTitle: z.string().trim().max(300).nullable().optional(),
    voucherDiscount: z.number().finite().min(0).max(1000000).optional(),
    specialRequest: z.string().max(2000).optional(),
    photosAvailable: z.number().int().min(0).max(1000).optional()
  }).superRefine((order, context) => {
    if (order.deposit > order.total) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["deposit"], message: "Deposit cannot exceed the booking total." });
    }
    if (order.service === "overnight" && order.endDateISO < order.startDateISO) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDateISO"], message: "Check-out date cannot be before check-in date." });
    }
    if (order.service === "daycare" && order.endDateISO !== order.startDateISO) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDateISO"], message: "Daycare uses one service date." });
    }
  })
});

function onlineOrderMutationStatus(error: { code?: string } | null) {
  return error?.code === "P0001" || error?.code === "23505" || error?.code === "22P02" ? 409 : 500;
}

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

export async function POST(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const parsed = createOnlineOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid online booking." }, { status: 400 });
  }

  const { data, error } = await authorization.admin.rpc("create_customer_online_order_with_operational_whatsapp_consent", {
    p_owner_user_id: authorization.user.id,
    p_order: parsed.data.order,
    p_language: parsed.data.consentLanguage
  });
  if (!error) return NextResponse.json({ ok: true, result: data || null });

  console.error("[customer/orders] protected online booking creation failed", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
  });
  return NextResponse.json(
    { error: onlineOrderMutationStatus(error) === 409 ? "This online booking cannot be saved in its current state." : "Your booking could not be saved. Please try again." },
    { status: onlineOrderMutationStatus(error) }
  );
}
