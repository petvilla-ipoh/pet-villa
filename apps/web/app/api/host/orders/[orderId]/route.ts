import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../_lib/authorizeHost";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_STATUSES = ["pending_verification", "balance", "active", "confirmed", "staying", "awaiting_checkout", "ready_pickup", "completed", "cancelled"] as const;

const petSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  breed: z.string().trim().max(100),
  weight: z.string().optional(),
  photoDataUrl: z.string().optional()
});

const updateSchema = z.object({
  order: z.object({
    service: z.enum(["overnight", "daycare"]),
    serviceLabel: z.string().trim().max(100),
    dateLabel: z.string().trim().max(200),
    startDateISO: z.string().date().optional(),
    endDateISO: z.string().date().optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    nights: z.number().int().min(0),
    hours: z.number().min(0),
    pets: z.array(petSchema).min(1).max(20),
    subtotal: z.number().min(0),
    total: z.number().min(0),
    deposit: z.number().min(0),
    manualDiscount: z.number().min(0).optional(),
    specialRequest: z.string().max(2000),
    status: z.enum(ORDER_STATUSES),
    cancelledAt: z.string().datetime().nullable().optional(),
    photosAvailable: z.number().int().min(0)
  }),
  earlyCheckoutApproved: z.boolean().optional()
});

function businessDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function transitionAllowed(current: string, next: string) {
  if (current === next) return true;
  if (current === "cancelled" || current === "completed") return false;
  if (next === "cancelled") return true;
  if (next === "staying") return current === "confirmed" || current === "balance";
  if (next === "ready_pickup") return current === "active" || current === "staying";
  if (next === "completed") return current === "awaiting_checkout" || current === "ready_pickup";
  return false;
}

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const authorization = await authorizeHostRequest(request, "bookings.manage");
  if (!authorization.ok) return authorization.response;

  const { orderId } = await context.params;
  if (!UUID_PATTERN.test(orderId)) return NextResponse.json({ error: "A permanent order identity is required." }, { status: 400 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid booking update." }, { status: 400 });

  const { data: current, error: currentError } = await authorization.admin
    .from("orders")
    .select("id,order_id,owner_id,host_customer_id,status,start_date,end_date,paid_rm,voucher_discount_rm,charge_total_rm,voided_at,order_payload")
    .eq("id", orderId)
    .maybeSingle();
  if (currentError) {
    console.error("[host/orders/:id] current order read failed", currentError);
    return NextResponse.json({ error: "The booking could not be checked safely." }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "The booking no longer exists." }, { status: 404 });
  if (current.voided_at) return NextResponse.json({ error: "Voided records are read-only." }, { status: 409 });

  const next = parsed.data.order;
  if (!next.startDateISO || !next.endDateISO) {
    return NextResponse.json({ error: "Booking dates are required." }, { status: 400 });
  }
  if (next.service === "overnight" && next.endDateISO < next.startDateISO) {
    return NextResponse.json({ error: "Check-out date cannot be before check-in date." }, { status: 400 });
  }
  if (next.service === "daycare") {
    if (next.endDateISO !== next.startDateISO || !next.startTime || !next.endTime || next.endTime <= next.startTime) {
      return NextResponse.json({ error: "Daycare requires one date and an end time after the start time." }, { status: 400 });
    }
  }

  const requestedPetIds = [...new Set(next.pets.map((pet) => pet.id))];
  const petOwnerColumn = current.host_customer_id ? "host_customer_id" : "owner_id";
  const petTable = current.host_customer_id ? "host_customer_pets" : "pets";
  const petOwnerId = current.host_customer_id || current.owner_id;
  if (!petOwnerId) {
    return NextResponse.json({ error: "The booking customer identity is missing." }, { status: 409 });
  }
  const { data: ownedPets, error: ownedPetsError } = await authorization.admin
    .from(petTable)
    .select("id,name,breed,weight_kg,photo_url")
    .eq(petOwnerColumn, petOwnerId)
    .in("id", requestedPetIds);
  if (ownedPetsError) {
    console.error("[host/orders/:id] pet ownership check failed", ownedPetsError);
    return NextResponse.json({ error: "The selected pets could not be verified safely." }, { status: 500 });
  }
  if ((ownedPets || []).length !== requestedPetIds.length) {
    return NextResponse.json({ error: "Every selected pet must belong to this booking customer." }, { status: 403 });
  }
  const ownedPetById = new Map((ownedPets || []).map((pet) => [pet.id, pet]));
  const verifiedPets = requestedPetIds.map((id) => {
    const pet = ownedPetById.get(id)!;
    return {
      id: pet.id,
      name: pet.name,
      breed: pet.breed || "",
      weight: pet.weight_kg == null ? "" : String(pet.weight_kg),
      photoDataUrl: pet.photo_url || ""
    };
  });
  if (!transitionAllowed(current.status, next.status)) {
    return NextResponse.json({ error: "This booking cannot move to that status from its current stage." }, { status: 409 });
  }
  if (next.status === "staying" && next.startDateISO && businessDateKey() < next.startDateISO) {
    return NextResponse.json({ error: "This booking cannot be checked in before its booked date." }, { status: 409 });
  }
  const paid = Math.max(0, Number(current.paid_rm) || 0);
  if (next.status === "staying" && paid <= 0) {
    return NextResponse.json({ error: "A verified payment is required before checking in this booking." }, { status: 409 });
  }
  if (next.status === "ready_pickup" && next.endDateISO && businessDateKey() < next.endDateISO) {
    const elevated = authorization.accessRole === "owner" || authorization.accessRole === "admin";
    if (!parsed.data.earlyCheckoutApproved || !elevated) {
      return NextResponse.json({ error: "Early checkout requires Owner or Admin confirmation." }, { status: 409 });
    }
  }

  const voucherDiscount = Math.max(0, Number(current.voucher_discount_rm) || 0);
  const manualDiscount = Math.min(next.subtotal, Math.max(0, next.manualDiscount || 0));
  const chargeTotal = Math.max(0, Number(current.charge_total_rm) || 0);
  const total = Math.max(0, next.subtotal - voucherDiscount - manualDiscount + chargeTotal);
  const balance = next.status === "cancelled" ? Math.max(0, total - paid) : Math.max(0, total - paid);
  if (next.status === "ready_pickup" && balance > 0) {
    return NextResponse.json({ error: "Collect the outstanding balance before checking out this booking." }, { status: 409 });
  }
  if (next.status === "completed" && balance > 0) {
    return NextResponse.json({ error: "Collect the outstanding balance before completing this booking." }, { status: 409 });
  }
  // A real checkout with no verified balance left is a completed stay. Persist it
  // atomically so refreshes cannot leave the business workflow half-finished.
  const persistedStatus = next.status === "ready_pickup" && balance <= 0 ? "completed" : next.status;
  const payload = {
    ...(current.order_payload && typeof current.order_payload === "object" ? current.order_payload : {}),
    ...next,
    pets: verifiedPets,
    total,
    chargeTotal,
    manualDiscount,
    paid,
    balance,
    status: persistedStatus,
    cancelledAt: persistedStatus === "cancelled" ? next.cancelledAt || new Date().toISOString() : next.cancelledAt || undefined
  };
  const { data: updated, error: updateError } = await authorization.admin
    .from("orders")
    .update({
      service: next.service,
      service_label: next.serviceLabel,
      date_label: next.dateLabel,
      start_date: next.startDateISO || null,
      end_date: next.endDateISO || null,
      nights: next.nights,
      hours: next.hours,
      pets: verifiedPets,
      subtotal_rm: next.subtotal,
      total_rm: total,
      deposit_rm: next.deposit,
      paid_rm: paid,
      balance_rm: balance,
      manual_discount_rm: manualDiscount,
      charge_total_rm: chargeTotal,
      special_request: next.specialRequest,
      status: persistedStatus,
      cancelled_at: persistedStatus === "cancelled" ? payload.cancelledAt : null,
      photos_available: next.photosAvailable,
      order_payload: payload
    })
    .eq("id", orderId)
    .select("id,order_id,status,paid_rm,balance_rm,order_payload")
    .single();
  if (updateError || !updated) {
    console.error("[host/orders/:id] update failed", updateError);
    return NextResponse.json({ error: "Supabase could not save the booking change." }, { status: 500 });
  }

  await authorization.admin.from("host_audit_log").insert({
    actor_id: authorization.user.id,
    action: current.status === persistedStatus ? "booking.details_updated" : "booking.status_updated",
    entity_type: "order",
    entity_id: orderId,
    details: { orderId: current.order_id, fromStatus: current.status, toStatus: persistedStatus }
  });

  return NextResponse.json({ order: { ...payload, orderRowId: updated.id, orderId: updated.order_id, status: updated.status, paid: Number(updated.paid_rm), balance: Number(updated.balance_rm) } });
}
