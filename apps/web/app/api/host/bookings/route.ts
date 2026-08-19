import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../_lib/authorizeHost";
import { calculateServiceSubtotal, normalizeSpecialDateRates } from "../../../lib/pricing";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^(?:0[9]|1\d|20):00$/;

const requestSchema = z.object({
  requestId: z.string().uuid(),
  mode: z.enum(["existing", "new"]),
  customerId: z.string().uuid().optional(),
  customerSource: z.enum(["auth", "host"]).optional(),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(5).max(30),
  customerEmail: z.string().trim().email().or(z.literal("")),
  petIds: z.array(z.string().uuid()).max(20),
  newPet: z.object({
    name: z.string().trim().min(1).max(80),
    breed: z.string().trim().max(100),
    photoDataUrl: z.string().trim().regex(/^\/avatars\/dog-[a-z0-9-]+\.png$/)
  }).nullable(),
  service: z.enum(["overnight", "daycare"]),
  startDate: z.string().date(),
  endDate: z.string().date(),
  startTime: z.string().regex(TIME_PATTERN),
  endTime: z.string().regex(TIME_PATTERN),
  paid: z.number().min(0),
  discount: z.number().min(0)
}).superRefine((value, context) => {
  if (value.mode === "existing" && (!value.customerId || !value.customerSource)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["customerId"], message: "Select an existing customer." });
  }
  if (value.petIds.length === 0 && !value.newPet) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["petIds"], message: "Select or add at least one pet." });
  }
  if (value.service === "daycare" && value.startDate !== value.endDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "Daycare uses one service date." });
  }
});

type PetRow = {
  id: string;
  name: string | null;
  breed: string | null;
  weight_kg: number | string | null;
  photo_url: string | null;
};

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function boardingDays(start: string, end: string) {
  const startDate = parseDateKey(start);
  const endDate = parseDateKey(end);
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function timeHour(value: string) {
  return Number(value.slice(0, 2));
}

function formatTime(value: string) {
  const hour = timeHour(value);
  if (hour === 12) return "12:00pm";
  if (hour > 12) return `${hour - 12}:00pm`;
  return `${hour}:00am`;
}

function formatBusinessDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur"
  }).format(new Date(`${value}T12:00:00+08:00`));
}

function orderPet(row: PetRow) {
  const weight = row.weight_kg === null || row.weight_kg === undefined ? "" : `${Number(row.weight_kg)}kg`;
  return { id: row.id, name: row.name || "Pet", breed: row.breed || "Small pet", weight, photoDataUrl: row.photo_url || undefined };
}

export async function POST(request: Request) {
  const authorization = await authorizeHostRequest(request, "bookings.manage");
  if (!authorization.ok) return authorization.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid booking details." }, { status: 400 });
  }

  const input = parsed.data;
  const clientDraftId = `host-${input.requestId}`;
  const { data: existingOrder, error: existingError } = await authorization.admin
    .from("orders")
    .select("id,order_id")
    .eq("client_draft_id", clientDraftId)
    .maybeSingle();
  if (existingError) {
    console.error("[host/bookings] idempotency check failed", existingError);
    return NextResponse.json({ error: "The booking could not be checked safely. Please try again." }, { status: 500 });
  }
  if (existingOrder) {
    return NextResponse.json({ orderRowId: existingOrder.id, orderId: existingOrder.order_id, alreadyCreated: true });
  }

  let customerId = input.customerId || "";
  let customerSource: "auth" | "host" = input.mode === "new" ? "host" : input.customerSource || "auth";
  const insertedPetRefs: Array<{ table: "pets" | "host_customer_pets"; id: string }> = [];
  let createdHostCustomer = false;

  try {
    if (input.mode === "new") {
      const { data, error } = await authorization.admin.from("host_customers").insert({
        full_name: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail || null,
        created_by: authorization.user.id
      }).select("id").single();
      if (error || !data) throw error || new Error("Customer record was not returned.");
      customerId = data.id;
      customerSource = "host";
      createdHostCustomer = true;
    } else {
      const table = customerSource === "auth" ? "profiles" : "host_customers";
      const { data, error } = await authorization.admin.from(table).select("id").eq("id", customerId).maybeSingle();
      if (error || !data) throw error || new Error("The selected customer no longer exists.");
    }

    const petTable = customerSource === "auth" ? "pets" : "host_customer_pets";
    const ownerColumn = customerSource === "auth" ? "owner_id" : "host_customer_id";
    let selectedPets: PetRow[] = [];
    if (input.petIds.length) {
      const { data, error } = await authorization.admin
        .from(petTable)
        .select("id,name,breed,weight_kg,photo_url")
        .eq(ownerColumn, customerId)
        .in("id", input.petIds);
      if (error) throw error;
      if ((data || []).length !== input.petIds.length) throw new Error("One or more selected pets do not belong to this customer.");
      selectedPets = (data || []) as PetRow[];
    }

    if (input.newPet) {
      const { data, error } = await authorization.admin.from(petTable).insert({
        [ownerColumn]: customerId,
        name: input.newPet.name,
        breed: input.newPet.breed || "Small pet",
        photo_url: input.newPet.photoDataUrl
      }).select("id,name,breed,weight_kg,photo_url").single();
      if (error || !data) throw error || new Error("The new pet record was not returned.");
      insertedPetRefs.push({ table: petTable, id: data.id });
      selectedPets.push(data as PetRow);
    }

    const { data: settings, error: settingsError } = await authorization.admin
      .from("business_settings")
      .select("boarding_rate_rm,daycare_rate_rm,special_date_rates")
      .eq("id", "pet-villa")
      .single();
    if (settingsError || !settings) throw settingsError || new Error("Business pricing is not configured.");

    const days = input.service === "overnight" ? boardingDays(input.startDate, input.endDate) : 0;
    const hours = input.service === "daycare" ? timeHour(input.endTime) - timeHour(input.startTime) : 0;
    if (input.service === "overnight" && input.endDate < input.startDate) throw new Error("Check-out date cannot be before check-in date.");
    if (input.service === "daycare" && hours < 1) throw new Error("Daycare end time must be after start time.");

    const subtotal = calculateServiceSubtotal({
      service: input.service,
      startDate: input.startDate,
      endDate: input.service === "daycare" ? input.startDate : input.endDate,
      hours,
      petCount: selectedPets.length,
      settings: {
        boardingRate: Number(settings.boarding_rate_rm),
        daycareRate: Number(settings.daycare_rate_rm),
        specialDateRates: normalizeSpecialDateRates(settings.special_date_rates)
      }
    });
    const discount = Math.min(subtotal, Math.max(0, input.discount));
    const total = Math.max(0, subtotal - discount);
    const paid = Math.min(total, Math.max(0, input.paid));
    const balance = Math.max(0, total - paid);
    const status = balance === 0 ? "confirmed" : "balance";
    const dateLabel = input.service === "daycare"
      ? `${formatBusinessDate(input.startDate)} · ${formatTime(input.startTime)} – ${formatTime(input.endTime)}`
      : `${formatBusinessDate(input.startDate)} - ${formatBusinessDate(input.endDate)}`;
    const orderId = `PVH-${input.startDate.replaceAll("-", "")}-${input.requestId.slice(0, 8).toUpperCase()}`;
    const pets = selectedPets.map(orderPet);
    const payload = {
      id: clientDraftId,
      customerId,
      customerSource,
      service: input.service,
      serviceLabel: input.service === "overnight" ? "Overnight Boarding" : "Daycare",
      dateLabel,
      startDateISO: input.startDate,
      endDateISO: input.service === "daycare" ? input.startDate : input.endDate,
      startTime: input.service === "daycare" ? input.startTime : undefined,
      endTime: input.service === "daycare" ? input.endTime : undefined,
      nights: days,
      hours,
      pets,
      subtotal,
      total,
      deposit: input.service === "daycare" || total < 50 ? 0 : 50,
      paid,
      balance,
      manualDiscount: discount,
      specialRequest: "",
      createdAt: new Date().toISOString(),
      orderId,
      status,
      photosAvailable: 0,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail
    };
    const { data: order, error: orderError } = await authorization.admin.from("orders").insert({
      owner_id: customerSource === "auth" ? customerId : null,
      host_customer_id: customerSource === "host" ? customerId : null,
      order_id: orderId,
      client_draft_id: clientDraftId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail || "",
      service: input.service,
      service_label: payload.serviceLabel,
      date_label: dateLabel,
      start_date: input.startDate,
      end_date: input.service === "daycare" ? input.startDate : input.endDate,
      nights: days,
      hours,
      pets,
      subtotal_rm: subtotal,
      total_rm: total,
      deposit_rm: payload.deposit,
      balance_rm: balance,
      paid_rm: paid,
      currency: "MYR",
      voucher_id: null,
      voucher_code: null,
      voucher_title: null,
      voucher_discount_rm: 0,
      manual_discount_rm: discount,
      special_request: "",
      status,
      photos_available: 0,
      order_payload: payload
    }).select("id").single();
    if (orderError || !order) throw orderError || new Error("The booking row was not returned.");

    await authorization.admin.from("host_audit_log").insert({
      actor_id: authorization.user.id,
      action: "booking.created_by_host",
      entity_type: "order",
      entity_id: order.id,
      details: { orderId, customerId, customerSource, service: input.service, petCount: pets.length, paid, balance }
    });

    return NextResponse.json({ orderRowId: order.id, orderId, customerId, customerSource, order: payload }, { status: 201 });
  } catch (error) {
    if (createdHostCustomer && customerId) {
      await authorization.admin.from("host_customers").delete().eq("id", customerId);
    } else {
      for (const pet of insertedPetRefs) await authorization.admin.from(pet.table).delete().eq("id", pet.id);
    }
    console.error("[host/bookings] create failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The booking could not be saved." }, { status: 500 });
  }
}
