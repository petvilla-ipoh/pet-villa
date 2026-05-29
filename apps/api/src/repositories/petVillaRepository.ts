import type pg from "pg";
import {
  calculateBookingQuote,
  evaluateDogEligibility,
  transitionBooking,
  type BookingStatus,
  type PaymentMethod
} from "@pet-villa/shared";
import { one, query, withTransaction } from "../db";
import { ApiError } from "../utils/errors";
import { createDevToken, hashPassword } from "../utils/auth";
import { sendPushToUser } from "../services/fcmService";

type UserRow = {
  id: string;
  role: "owner" | "host" | "admin";
  name: string;
  email: string;
  phone: string;
  password_hash: string | null;
};

type PetRow = {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  weight_kg: string;
  vaccine_status: "valid" | "expired" | "unknown";
  has_aggression: boolean;
  has_fleas: boolean;
};

type BookingRow = {
  id: string;
  owner_id: string;
  host_id: string;
  pet_id: string;
  service_type: "overnight_boarding" | "daycare";
  status: BookingStatus;
  start_at: string;
  end_at: string;
  subtotal_sen: number;
  deposit_sen: number;
  final_payment_sen: number;
};

export async function registerUser(input: { name: string; email: string; phone: string; password: string; role?: "owner" | "host" }) {
  const user = await one<UserRow>(
    `INSERT INTO users (role, name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, role, name, email, phone, password_hash`,
    [input.role ?? "owner", input.name, input.email, input.phone, hashPassword(input.password)]
  );

  if (!user) throw new ApiError("INTERNAL_ERROR", "User could not be created.", 500);

  const host = user.role === "host"
    ? await one("INSERT INTO hosts (user_id, display_name, is_verified) VALUES ($1, $2, true) ON CONFLICT (user_id) DO UPDATE SET updated_at = now() RETURNING *", [
      user.id,
      "The Pet Villa Ipoh"
    ])
    : null;

  return {
    token: createDevToken(user),
    user: sanitizeUser(user),
    host
  };
}

export async function listHosts() {
  const result = await query(
    `SELECT h.*, u.name, u.email, u.phone
     FROM hosts h
     JOIN users u ON u.id = h.user_id
     WHERE h.is_verified = true
     ORDER BY h.rating_average DESC, h.created_at ASC`
  );
  return result.rows;
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await one<UserRow>(
    "SELECT id, role, name, email, phone, password_hash FROM users WHERE email = $1",
    [input.email]
  );

  if (!user || user.password_hash !== hashPassword(input.password)) {
    throw new ApiError("AUTH_REQUIRED", "Invalid email or password.", 401);
  }

  return {
    token: createDevToken(user),
    user: sanitizeUser(user)
  };
}

export async function createPet(ownerId: string, input: {
  name: string;
  breed: string;
  weightKg: number;
  vaccineStatus: "valid" | "expired" | "unknown";
  habits?: string;
  specialNeeds?: string;
  hasAggression: boolean;
  hasFleas: boolean;
}) {
  const eligibility = evaluateDogEligibility({
    weightKg: input.weightKg,
    hasAggression: input.hasAggression,
    hasFleas: input.hasFleas,
    vaccineStatus: input.vaccineStatus
  });

  if (!eligibility.accepted) {
    throw new ApiError("DOG_NOT_ELIGIBLE", "This dog cannot be accepted by The Pet Villa rules.", 400, {
      reasons: eligibility.reasons
    });
  }

  return one(
    `INSERT INTO pets (owner_id, name, breed, weight_kg, vaccine_status, habits, special_needs, has_aggression, has_fleas)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      ownerId,
      input.name,
      input.breed,
      input.weightKg,
      input.vaccineStatus,
      input.habits ?? null,
      input.specialNeeds ?? null,
      input.hasAggression,
      input.hasFleas
    ]
  );
}

export async function listPets(ownerId: string) {
  const result = await query("SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC", [ownerId]);
  return result.rows;
}

export async function createBooking(ownerId: string, input: {
  petId: string;
  hostId: string;
  serviceType: "overnight_boarding" | "daycare";
  startAt: Date;
  endAt: Date;
  ownerNotes?: string;
}) {
  return withTransaction(async (client) => {
    const pet = await findPetForOwner(client, input.petId, ownerId);
    const eligibility = evaluateDogEligibility({
      weightKg: Number(pet.weight_kg),
      hasAggression: pet.has_aggression,
      hasFleas: pet.has_fleas,
      vaccineStatus: pet.vaccine_status
    });

    if (!eligibility.accepted) {
      throw new ApiError("DOG_NOT_ELIGIBLE", "This dog cannot be accepted by The Pet Villa rules.", 400, {
        reasons: eligibility.reasons
      });
    }

    await assertCapacity(client, input.hostId, input.startAt, input.endAt);
    const quote = calculateBookingQuote({
      serviceType: input.serviceType,
      startAt: input.startAt,
      endAt: input.endAt
    });

    const result = await client.query<BookingRow>(
      `INSERT INTO bookings
       (owner_id, host_id, pet_id, service_type, status, start_at, end_at, subtotal_sen, deposit_sen, final_payment_sen, owner_notes)
       VALUES ($1, $2, $3, $4, 'pending_confirmation', $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        ownerId,
        input.hostId,
        input.petId,
        input.serviceType,
        input.startAt,
        input.endAt,
        quote.subtotalSen,
        quote.depositSen,
        quote.finalPaymentSen,
        input.ownerNotes ?? null
      ]
    );

    const booking = result.rows[0];
    await insertStatusEvent(client, booking.id, null, "pending_confirmation", ownerId, "owner", "Booking requested");
    await notify(client, ownerId, "booking_requested", "Booking request sent", "The host will review your pet profile and dates.", `/bookings/${booking.id}`);
    return booking;
  });
}

export async function listBookings(ownerId?: string) {
  const result = ownerId
    ? await query("SELECT * FROM bookings WHERE owner_id = $1 ORDER BY created_at DESC", [ownerId])
    : await query("SELECT * FROM bookings ORDER BY created_at DESC");
  return result.rows;
}

export async function hostDashboard(hostId: string) {
  const pending = await query("SELECT * FROM bookings WHERE host_id = $1 AND status = 'pending_confirmation' ORDER BY created_at DESC", [hostId]);
  const current = await query("SELECT * FROM bookings WHERE host_id = $1 AND status = 'in_boarding' ORDER BY start_at", [hostId]);
  const income = await hostIncome(hostId);

  return {
    capacity: { todayAccepted: current.rows.length, maxDogsPerDay: 3 },
    pendingRequests: pending.rows,
    currentlyBoarding: current.rows,
    revenueSen: income.withdrawableSen
  };
}

export async function transitionBookingStatus(id: string, actorId: string, actorType: "owner" | "host" | "system", to: BookingStatus, reason?: string) {
  return withTransaction(async (client) => {
    const booking = await findBooking(client, id);
    const next = transitionBooking({ from: booking.status, to, actor: actorType, reason });

    if (next === "confirmed_awaiting_deposit") {
      await assertCapacity(client, booking.host_id, new Date(booking.start_at), new Date(booking.end_at));
    }

    const updated = await client.query<BookingRow>(
      "UPDATE bookings SET status = $1, host_decision_reason = COALESCE($2, host_decision_reason), updated_at = now() WHERE id = $3 RETURNING *",
      [next, reason ?? null, id]
    );

    await insertStatusEvent(client, id, booking.status, next, actorId, actorType, reason);
    await notifyForStatus(client, updated.rows[0]);
    return updated.rows[0];
  });
}

export async function createPayment(bookingId: string, payerId: string, stage: "deposit" | "final", method: PaymentMethod, idempotencyKey: string) {
  return withTransaction(async (client) => {
    const booking = await findBooking(client, bookingId);

    if (stage === "deposit" && booking.status !== "confirmed_awaiting_deposit") {
      throw new ApiError("INVALID_BOOKING_STATE", "Deposit can only be paid after host confirmation.", 409);
    }
    if (stage === "final" && booking.status !== "awaiting_final_payment") {
      throw new ApiError("INVALID_BOOKING_STATE", "Final payment can only be paid after boarding ends.", 409);
    }

    const amount = stage === "deposit" ? booking.deposit_sen : booking.final_payment_sen;
    const payment = await client.query(
      `INSERT INTO payments (booking_id, payer_id, stage, status, method, amount_sen, provider, idempotency_key, paid_at)
       VALUES ($1, $2, $3, 'paid', $4, $5, 'local-dev', $6, now())
       ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
       RETURNING *`,
      [bookingId, payerId, stage, method, amount, idempotencyKey]
    );

    const nextStatus: BookingStatus = stage === "deposit" ? "deposit_paid" : "completed";
    await client.query("UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2", [nextStatus, bookingId]);
    await insertStatusEvent(client, bookingId, booking.status, nextStatus, payerId, stage === "deposit" ? "owner" : "owner", `${stage} paid`);
    await notify(client, booking.owner_id, "payment_success", "Payment successful", `Your ${stage} payment has been received.`, `/bookings/${bookingId}`);
    return payment.rows[0];
  });
}

export async function getPaymentTarget(bookingId: string, stage: "deposit" | "final") {
  const booking = await one<BookingRow>("SELECT * FROM bookings WHERE id = $1", [bookingId]);
  if (!booking) throw new ApiError("RESOURCE_NOT_FOUND", "Booking not found.", 404);

  if (stage === "deposit" && booking.status !== "confirmed_awaiting_deposit") {
    throw new ApiError("INVALID_BOOKING_STATE", "Deposit can only be paid after host confirmation.", 409);
  }
  if (stage === "final" && booking.status !== "awaiting_final_payment") {
    throw new ApiError("INVALID_BOOKING_STATE", "Final payment can only be paid after boarding ends.", 409);
  }

  return {
    booking,
    amountSen: stage === "deposit" ? booking.deposit_sen : booking.final_payment_sen,
    currency: "MYR"
  };
}

export async function createPendingPayment(bookingId: string, payerId: string, stage: "deposit" | "final", method: PaymentMethod, providerPaymentId: string, idempotencyKey: string) {
  const booking = await one<BookingRow>("SELECT * FROM bookings WHERE id = $1", [bookingId]);
  if (!booking) throw new ApiError("RESOURCE_NOT_FOUND", "Booking not found.", 404);

  if (stage === "deposit" && booking.status !== "confirmed_awaiting_deposit") {
    throw new ApiError("INVALID_BOOKING_STATE", "Deposit can only be paid after host confirmation.", 409);
  }
  if (stage === "final" && booking.status !== "awaiting_final_payment") {
    throw new ApiError("INVALID_BOOKING_STATE", "Final payment can only be paid after boarding ends.", 409);
  }

  const amount = stage === "deposit" ? booking.deposit_sen : booking.final_payment_sen;
  return one(
    `INSERT INTO payments (booking_id, payer_id, stage, status, method, amount_sen, provider, provider_payment_id, idempotency_key)
     VALUES ($1, $2, $3, 'pending', $4, $5, 'stripe', $6, $7)
     ON CONFLICT (idempotency_key) DO UPDATE
     SET provider_payment_id = EXCLUDED.provider_payment_id, updated_at = now()
     RETURNING *`,
    [bookingId, payerId, stage, method, amount, providerPaymentId, idempotencyKey]
  );
}

export async function markStripePaymentSucceeded(providerPaymentId: string) {
  return withTransaction(async (client) => {
    const paymentResult = await client.query(
      "UPDATE payments SET status = 'paid', paid_at = now(), updated_at = now() WHERE provider_payment_id = $1 RETURNING *",
      [providerPaymentId]
    );
    const payment = paymentResult.rows[0];
    if (!payment) return null;

    const booking = await findBooking(client, payment.booking_id);
    const nextStatus: BookingStatus = payment.stage === "deposit" ? "deposit_paid" : "completed";
    await client.query("UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2", [nextStatus, booking.id]);
    await insertStatusEvent(client, booking.id, booking.status, nextStatus, payment.payer_id, "system", "Stripe payment succeeded");
    await notify(client, booking.owner_id, "payment_success", "Payment successful", `Your ${payment.stage} payment has been received.`, `/bookings/${booking.id}`);
    return payment;
  });
}

export async function createMessage(bookingId: string, senderId: string, recipientId: string, body: string, mediaUrl?: string) {
  const message = await one(
    `INSERT INTO messages (booking_id, sender_id, recipient_id, body, media_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [bookingId, senderId, recipientId, body, mediaUrl ?? null]
  );
  await notify(recipientId, "new_message", "New message", body.slice(0, 120), `/bookings/${bookingId}/chat`);
  return message;
}

export async function listMessages(bookingId: string) {
  const result = await query("SELECT * FROM messages WHERE booking_id = $1 ORDER BY created_at ASC", [bookingId]);
  return result.rows;
}

export async function createDiaryEntry(bookingId: string, authorId: string, input: {
  mood?: string;
  mealNotes?: string;
  activityNotes?: string;
  healthAlert?: boolean;
  body: string;
  media?: unknown[];
}) {
  const entry = await one(
    `INSERT INTO diary_entries (booking_id, author_id, mood, meal_notes, activity_notes, health_alert, body, media)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      bookingId,
      authorId,
      input.mood ?? null,
      input.mealNotes ?? null,
      input.activityNotes ?? null,
      Boolean(input.healthAlert),
      input.body,
      JSON.stringify(input.media ?? [])
    ]
  );

  const booking = await one<BookingRow>("SELECT * FROM bookings WHERE id = $1", [bookingId]);
  if (booking) {
    await notify(
      booking.owner_id,
      input.healthAlert ? "pet_health_alert" : "diary_updated",
      input.healthAlert ? "Pet comfort alert" : "Pet diary updated",
      input.body.slice(0, 140),
      `/bookings/${bookingId}/diary`
    );
  }

  return entry;
}

export async function listDiary(bookingId: string) {
  const result = await query("SELECT * FROM diary_entries WHERE booking_id = $1 ORDER BY created_at DESC", [bookingId]);
  return result.rows;
}

export async function listNotifications(userId: string) {
  const result = await query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return result.rows;
}

export async function createReview(bookingId: string, reviewerId: string, rating: number, comment?: string) {
  const booking = await one<BookingRow>("SELECT * FROM bookings WHERE id = $1 AND owner_id = $2", [bookingId, reviewerId]);
  if (!booking) throw new ApiError("RESOURCE_NOT_FOUND", "Booking not found.", 404);
  if (booking.status !== "completed") throw new ApiError("INVALID_BOOKING_STATE", "Reviews are available after completion.", 409);

  return one(
    `INSERT INTO reviews (booking_id, reviewer_id, host_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [bookingId, reviewerId, booking.host_id, rating, comment ?? null]
  );
}

export async function hostIncome(hostId: string) {
  const result = await query<{ stage: string; total_sen: string }>(
    `SELECT p.stage, COALESCE(SUM(p.amount_sen), 0) AS total_sen
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     WHERE b.host_id = $1 AND p.status = 'paid'
     GROUP BY p.stage`,
    [hostId]
  );

  const totals = Object.fromEntries(result.rows.map((row) => [row.stage, Number(row.total_sen)]));
  const depositsSen = totals.deposit ?? 0;
  const finalPaymentsSen = totals.final ?? 0;
  const refundsSen = totals.refund ?? 0;
  return {
    depositsSen,
    finalPaymentsSen,
    refundsSen,
    withdrawableSen: depositsSen + finalPaymentsSen - refundsSen
  };
}

export async function hostAvailability(hostId: string) {
  const counts = await query(
    `SELECT date_trunc('day', start_at)::date AS date, count(*)::int AS accepted_count
     FROM bookings
     WHERE host_id = $1 AND status IN ('confirmed_awaiting_deposit','deposit_paid','in_boarding','awaiting_final_payment')
     GROUP BY 1
     ORDER BY 1`,
    [hostId]
  );
  const blocks = await query("SELECT date, blocked, notes FROM host_availability_blocks WHERE host_id = $1 ORDER BY date", [hostId]);
  return { maxDogsPerDay: 3, days: counts.rows, blocks: blocks.rows };
}

export async function updateHostAvailability(hostId: string, date: string, blocked: boolean, notes?: string) {
  return one(
    `INSERT INTO host_availability_blocks (host_id, date, blocked, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (host_id, date)
     DO UPDATE SET blocked = EXCLUDED.blocked, notes = EXCLUDED.notes, updated_at = now()
     RETURNING *`,
    [hostId, date, blocked, notes ?? null]
  );
}

export async function updateHostSettings(hostUserId: string, body: Record<string, unknown>) {
  const host = await one(
    `UPDATE hosts
     SET overnight_price_sen = COALESCE($2, overnight_price_sen),
         daycare_price_sen = COALESCE($3, daycare_price_sen),
         updated_at = now()
     WHERE user_id = $1
     RETURNING *`,
    [hostUserId, body.overnightPriceSen ?? null, body.daycarePriceSen ?? null]
  );
  if (!host) throw new ApiError("RESOURCE_NOT_FOUND", "Host profile not found.", 404);
  return host;
}

function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone
  };
}

async function findPetForOwner(client: pg.PoolClient, petId: string, ownerId: string) {
  const result = await client.query<PetRow>("SELECT * FROM pets WHERE id = $1 AND owner_id = $2", [petId, ownerId]);
  const pet = result.rows[0];
  if (!pet) throw new ApiError("RESOURCE_NOT_FOUND", "Pet not found.", 404);
  return pet;
}

async function findBooking(client: pg.PoolClient, id: string) {
  const result = await client.query<BookingRow>("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [id]);
  const booking = result.rows[0];
  if (!booking) throw new ApiError("RESOURCE_NOT_FOUND", "Booking not found.", 404);
  return booking;
}

async function assertCapacity(client: pg.PoolClient, hostId: string, startAt: Date, endAt: Date) {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM bookings
     WHERE host_id = $1
       AND status IN ('confirmed_awaiting_deposit','deposit_paid','in_boarding','awaiting_final_payment')
       AND start_at < $3
       AND end_at > $2`,
    [hostId, startAt, endAt]
  );

  if (Number(result.rows[0]?.count ?? 0) >= 3) {
    throw new ApiError("BOOKING_CONFLICT", "The selected date is already full. Maximum 3 dogs per day.", 409);
  }
}

async function insertStatusEvent(
  client: pg.PoolClient,
  bookingId: string,
  from: BookingStatus | null,
  to: BookingStatus,
  actorId: string | null,
  actorType: "owner" | "host" | "system",
  reason?: string
) {
  await client.query(
    `INSERT INTO booking_status_events (booking_id, from_status, to_status, actor_user_id, actor_type, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [bookingId, from, to, actorId, actorType, reason ?? null]
  );
}

async function notifyForStatus(client: pg.PoolClient, booking: BookingRow) {
  if (booking.status === "confirmed_awaiting_deposit") {
    await notify(client, booking.owner_id, "booking_confirmed", "Booking confirmed", "Please pay 50% deposit to secure your stay.", `/bookings/${booking.id}/payment`);
  }
  if (booking.status === "in_boarding") {
    await notify(client, booking.owner_id, "boarding_started", "Boarding started", "Your pet is now checked in at The Pet Villa.", `/bookings/${booking.id}`);
  }
  if (booking.status === "awaiting_final_payment") {
    await notify(client, booking.owner_id, "boarding_ended", "Boarding ended", "Please pay the remaining 50% final payment.", `/bookings/${booking.id}/payment`);
  }
}

async function notify(clientOrUserId: pg.PoolClient | string, userIdOrType: string, typeOrTitle: string, titleOrBody: string, bodyOrLink: string, maybeLink?: string) {
  if (typeof clientOrUserId === "string") {
    await query(
      "INSERT INTO notifications (user_id, type, title, body, deep_link) VALUES ($1, $2, $3, $4, $5)",
      [clientOrUserId, userIdOrType, typeOrTitle, titleOrBody, bodyOrLink]
    );
    await sendPushToUser(clientOrUserId, typeOrTitle, titleOrBody, { type: userIdOrType, deepLink: bodyOrLink });
    return;
  }

  await clientOrUserId.query(
    "INSERT INTO notifications (user_id, type, title, body, deep_link) VALUES ($1, $2, $3, $4, $5)",
    [userIdOrType, typeOrTitle, titleOrBody, bodyOrLink, maybeLink ?? null]
  );
  await sendPushToUser(userIdOrType, titleOrBody, bodyOrLink, { type: typeOrTitle, deepLink: maybeLink ?? "" });
}
