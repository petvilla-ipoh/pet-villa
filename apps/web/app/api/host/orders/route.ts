import { NextResponse } from "next/server";
import { authorizeHostRequest } from "../_lib/authorizeHost";

const ORDER_FIELDS = "id, owner_id, host_customer_id, booking_id, order_id, client_draft_id, customer_name, customer_phone, customer_email, service, service_label, date_label, start_date, end_date, nights, hours, pets, subtotal_rm, total_rm, deposit_rm, balance_rm, paid_rm, voucher_id, voucher_code, voucher_title, voucher_discount_rm, manual_discount_rm, charge_total_rm, special_request, status, cancelled_at, voided_at, voided_by, photos_available, review, order_payload, created_at";

export async function GET(request: Request) {
  const authorization = await authorizeHostRequest(request, "bookings.view");
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.admin
    .from("orders")
    .select(ORDER_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[host/orders] orders query failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Host orders could not be loaded." }, { status: 500 });
  }

  const [authPetsResult, hostPetsResult] = await Promise.all([
    authorization.admin
      .from("pets")
      .select("id,owner_id,name,breed,weight_kg,photo_url"),
    authorization.admin
      .from("host_customer_pets")
      .select("id,host_customer_id,name,breed,weight_kg,photo_url")
  ]);

  const petQueryError = authPetsResult.error || hostPetsResult.error;
  if (petQueryError) {
    console.error("[host/orders] current pet profiles query failed", {
      message: petQueryError.message,
      code: petQueryError.code,
      details: petQueryError.details,
      hint: petQueryError.hint
    });
    return NextResponse.json({ error: "Host pet profiles could not be loaded." }, { status: 500 });
  }

  const currentPets = [
    ...(authPetsResult.data || []).map((pet) => ({
      ...pet,
      customer_source: "auth" as const,
      customer_id: pet.owner_id
    })),
    ...(hostPetsResult.data || []).map((pet) => ({
      ...pet,
      customer_source: "host" as const,
      customer_id: pet.host_customer_id
    }))
  ];
  const currentPetByKey = new Map(currentPets.map((pet) => [`${pet.customer_source}:${pet.id}`, pet]));

  const baseOrders = (data || []).map((order) => {
    const customerSource = order.host_customer_id ? "host" : "auth";
    const customerId = order.host_customer_id || order.owner_id || "";
    const pets = Array.isArray(order.pets)
      ? order.pets.map((snapshot) => {
          if (!snapshot || typeof snapshot !== "object") return snapshot;
          const pet = snapshot as { id?: string; name?: string; breed?: string; weight?: string; photoDataUrl?: string };
          const currentPet = (pet.id ? currentPetByKey.get(`${customerSource}:${pet.id}`) : undefined)
            || currentPets.find((candidate) => candidate.customer_source === customerSource
              && candidate.customer_id === customerId
              && candidate.name.trim().toLowerCase() === (pet.name || "").trim().toLowerCase());
          if (!currentPet) return pet;
          return {
            ...pet,
            name: currentPet.name || pet.name,
            breed: currentPet.breed || pet.breed,
            weight: currentPet.weight_kg == null ? pet.weight : String(currentPet.weight_kg),
            photoDataUrl: currentPet.photo_url || ""
          };
        })
      : order.pets;
    return { ...order, pets, order_row_id: order.id };
  });

  const orderRowIds = baseOrders.map((order) => order.id);
  let orders = baseOrders;
  if (orderRowIds.length) {
    const [auditResult, chargeResult, pendingPaymentResult] = await Promise.all([
      authorization.admin
        .from("host_audit_log")
        .select("action,entity_id,details,created_at")
        .eq("entity_type", "order")
        .in("action", ["order.payment_verified", "order.legacy_collection_attributed", "booking.status_updated"])
        .in("entity_id", orderRowIds)
        .order("created_at", { ascending: true }),
      authorization.admin
        .from("order_charges")
        .select("id,order_row_id,amount_rm,reason_code,note,created_by,created_at")
        .in("order_row_id", orderRowIds)
        .order("created_at", { ascending: true }),
      authorization.admin
        .from("payment_submissions")
        .select("id,order_row_id,amount_rm,method,submitted_at")
        .in("order_row_id", orderRowIds)
        .eq("status", "pending")
    ]);
    const { data: auditEvents, error: auditError } = auditResult;

    if (auditError) {
      console.error("[host/orders] business event query failed", {
        message: auditError.message,
        code: auditError.code,
        details: auditError.details,
        hint: auditError.hint
      });
      return NextResponse.json({ error: "Host business report events could not be loaded." }, { status: 500 });
    }
    if (chargeResult.error) {
      console.error("[host/orders] order charge query failed", {
        message: chargeResult.error.message,
        code: chargeResult.error.code,
        details: chargeResult.error.details,
        hint: chargeResult.error.hint
      });
      return NextResponse.json({ error: "Host order charges could not be loaded." }, { status: 500 });
    }
    if (pendingPaymentResult.error) {
      console.error("[host/orders] pending payment submission query failed", {
        message: pendingPaymentResult.error.message,
        code: pendingPaymentResult.error.code,
        details: pendingPaymentResult.error.details,
        hint: pendingPaymentResult.error.hint
      });
      return NextResponse.json({ error: "Host payment submissions could not be loaded." }, { status: 500 });
    }

    const completedAtByOrder = new Map<string, string>();
    const checkedInAtByOrder = new Map<string, string>();
    const checkedInBusinessDateByOrder = new Map<string, string>();
    const paymentVerificationsByOrder = new Map<string, Array<{
      amount: number;
      mode: "submission" | "balance";
      verifiedAt: string;
    }>>();
    const legacyCollectionAttributionsByOrder = new Map<string, Array<{
      amount: number;
      businessMonth: string;
      precision: "month_only";
      attributedAt: string;
    }>>();
    const chargesByOrder = new Map<string, typeof chargeResult.data>();
    const pendingPaymentByOrder = new Map((pendingPaymentResult.data || []).map((submission) => [submission.order_row_id, submission]));
    for (const charge of chargeResult.data || []) {
      chargesByOrder.set(charge.order_row_id, [...(chargesByOrder.get(charge.order_row_id) || []), charge]);
    }

    for (const event of auditEvents || []) {
      if (!event.entity_id || !event.created_at) continue;
      const details = event.details && typeof event.details === "object" && !Array.isArray(event.details)
        ? event.details as Record<string, unknown>
        : {};
      if (event.action === "booking.status_updated" && details.toStatus === "completed") {
        if (!completedAtByOrder.has(event.entity_id)) completedAtByOrder.set(event.entity_id, event.created_at);
        continue;
      }
      if (event.action === "booking.status_updated" && ["staying", "checked_in"].includes(String(details.toStatus))) {
        if (!checkedInAtByOrder.has(event.entity_id)) checkedInAtByOrder.set(event.entity_id, event.created_at);
        if (typeof details.historicalBusinessDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(details.historicalBusinessDate)) {
          checkedInBusinessDateByOrder.set(event.entity_id, details.historicalBusinessDate);
        }
        continue;
      }
      if (event.action === "order.legacy_collection_attributed") {
        const amount = Number(details.amount);
        const businessMonth = typeof details.business_month === "string"
          ? details.business_month
          : typeof details.businessMonth === "string" ? details.businessMonth : "";
        if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}$/.test(businessMonth) || details.precision !== "month_only") continue;
        legacyCollectionAttributionsByOrder.set(event.entity_id, [
          ...(legacyCollectionAttributionsByOrder.get(event.entity_id) || []),
          { amount, businessMonth, precision: "month_only", attributedAt: event.created_at }
        ]);
        continue;
      }
      if (event.action !== "order.payment_verified") continue;
      const amount = Number(details.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const verification = {
        amount,
        mode: details.mode === "balance" ? "balance" as const : "submission" as const,
        verifiedAt: event.created_at
      };
      paymentVerificationsByOrder.set(event.entity_id, [
        ...(paymentVerificationsByOrder.get(event.entity_id) || []),
        verification
      ]);
    }

    orders = baseOrders.map((order) => {
      const pendingSubmission = pendingPaymentByOrder.get(order.id);
      const existingPayload = order.order_payload && typeof order.order_payload === "object" && !Array.isArray(order.order_payload)
        ? order.order_payload as Record<string, unknown>
        : {};
      return {
        ...order,
        order_payload: pendingSubmission ? {
          ...existingPayload,
          paymentSubmission: {
            id: pendingSubmission.id,
            amount: Number(pendingSubmission.amount_rm),
            method: pendingSubmission.method,
            submittedAt: pendingSubmission.submitted_at
          }
        } : order.order_payload,
        completed_at: completedAtByOrder.get(order.id) || null,
        checked_in_at: checkedInAtByOrder.get(order.id) || null,
        checked_in_business_date: checkedInBusinessDateByOrder.get(order.id) || null,
        payment_verifications: paymentVerificationsByOrder.get(order.id) || [],
        legacy_collection_attributions: legacyCollectionAttributionsByOrder.get(order.id) || [],
        order_charges: chargesByOrder.get(order.id) || []
      };
    });
  }

  const voidedOrderIds = orders.filter((order) => order.voided_at).map((order) => order.id);
  if (!voidedOrderIds.length) return NextResponse.json({ orders });

  const { data: voidRecords, error: voidError } = await authorization.admin
    .from("order_void_records")
    .select("order_row_id,reason_code,reason")
    .in("order_row_id", voidedOrderIds);

  if (voidError) {
    console.error("[host/orders] Safe Void audit query failed", {
      message: voidError.message,
      code: voidError.code,
      details: voidError.details,
      hint: voidError.hint
    });
    return NextResponse.json({ error: "Host order audit details could not be loaded." }, { status: 500 });
  }

  const auditByOrder = new Map((voidRecords || []).map((record) => [record.order_row_id, record]));
  return NextResponse.json({
    orders: orders.map((order) => {
      const audit = auditByOrder.get(order.id);
      return {
        ...order,
        void_reason_code: audit?.reason_code || null,
        void_reason: audit?.reason || null
      };
    })
  });
}
