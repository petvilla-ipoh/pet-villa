import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  OWNER_NOTICE,
  PAYMENT_METHODS,
  bookingRequestSchema,
  loginSchema,
  petProfileSchema,
  registerSchema,
  type PaymentMethod
} from "@pet-villa/shared";
import { asyncHandler } from "./utils/errors";
import { getActor } from "./utils/auth";
import {
  createBooking,
  createDiaryEntry,
  createMessage,
  createPayment,
  createPendingPayment,
  createPet,
  createReview,
  getPaymentTarget,
  hostAvailability,
  hostDashboard,
  hostIncome,
  listHosts,
  listBookings,
  listDiary,
  listMessages,
  listNotifications,
  listPets,
  loginUser,
  markStripePaymentSucceeded,
  registerUser,
  transitionBookingStatus,
  updateHostAvailability,
  updateHostSettings
} from "./repositories/petVillaRepository";
import { constructStripeWebhookEvent, createStripePaymentIntent } from "./services/stripeService";

export const apiRouter = Router();

apiRouter.post("/auth/register", asyncHandler(async (req, res) => {
  const base = registerSchema.parse(req.body);
  const role = req.body.role === "host" ? "host" : "owner";
  const data = await registerUser({ ...base, role });
  res.status(201).json({ data, meta: {}, error: null });
}));

apiRouter.post("/auth/login", asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  res.json({ data: await loginUser(input), meta: {}, error: null });
}));

apiRouter.get("/owner/notice", (_req, res) => {
  res.json({ data: { items: OWNER_NOTICE }, meta: {}, error: null });
});

apiRouter.get("/hosts", asyncHandler(async (_req, res) => {
  res.json({ data: await listHosts(), meta: { nextCursor: null }, error: null });
}));

apiRouter.post("/pets", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const input = petProfileSchema.parse(req.body);
  const pet = await createPet(actor.id, input);
  res.status(201).json({ data: pet, meta: {}, error: null });
}));

apiRouter.get("/pets", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  res.json({ data: await listPets(actor.id), meta: { nextCursor: null }, error: null });
}));

apiRouter.post("/bookings", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const input = bookingRequestSchema.parse(req.body);
  const booking = await createBooking(actor.id, { ...input, ownerNotes: req.body.ownerNotes });
  res.status(201).json({ data: booking, meta: {}, error: null });
}));

apiRouter.get("/bookings", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const ownerId = req.query.scope === "all" ? undefined : actor.id;
  res.json({ data: await listBookings(ownerId), meta: { nextCursor: null }, error: null });
}));

apiRouter.post("/bookings/:id/payments/deposit", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const method = parsePaymentMethod(req.body.method);
  const idempotencyKey = req.header("idempotency-key") ?? randomUUID();
  if (process.env.PAYMENT_MODE === "local") {
    const payment = await createPayment(req.params.id, actor.id, "deposit", method, idempotencyKey);
    res.status(201).json({ data: payment, meta: { supportedMethods: PAYMENT_METHODS, mode: "local" }, error: null });
    return;
  }

  const target = await getPaymentTarget(req.params.id, "deposit");
  const intent = await createStripePaymentIntent({
    bookingId: req.params.id,
    amountSen: target.amountSen,
    currency: target.currency,
    method,
    stage: "deposit",
    idempotencyKey
  });
  const payment = await createPendingPayment(req.params.id, actor.id, "deposit", method, intent.id, idempotencyKey);
  res.status(201).json({
    data: { payment, stripePaymentIntentId: intent.id, clientSecret: intent.client_secret },
    meta: { supportedMethods: PAYMENT_METHODS, mode: "stripe" },
    error: null
  });
}));

apiRouter.post("/bookings/:id/payments/final", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const method = parsePaymentMethod(req.body.method);
  const idempotencyKey = req.header("idempotency-key") ?? randomUUID();
  if (process.env.PAYMENT_MODE === "local") {
    const payment = await createPayment(req.params.id, actor.id, "final", method, idempotencyKey);
    res.status(201).json({ data: payment, meta: { supportedMethods: PAYMENT_METHODS, mode: "local" }, error: null });
    return;
  }

  const target = await getPaymentTarget(req.params.id, "final");
  const intent = await createStripePaymentIntent({
    bookingId: req.params.id,
    amountSen: target.amountSen,
    currency: target.currency,
    method,
    stage: "final",
    idempotencyKey
  });
  const payment = await createPendingPayment(req.params.id, actor.id, "final", method, intent.id, idempotencyKey);
  res.status(201).json({
    data: { payment, stripePaymentIntentId: intent.id, clientSecret: intent.client_secret },
    meta: { supportedMethods: PAYMENT_METHODS, mode: "stripe" },
    error: null
  });
}));

apiRouter.post("/payments/stripe/webhook", asyncHandler(async (req, res) => {
  const event = constructStripeWebhookEvent(req.body as Buffer, req.header("stripe-signature"));
  if (event.type === "payment_intent.succeeded") {
    await markStripePaymentSucceeded(event.data.object.id);
  }
  res.json({ data: { received: true }, meta: { eventType: event.type }, error: null });
}));

apiRouter.get("/bookings/:id/diary", asyncHandler(async (req, res) => {
  res.json({ data: await listDiary(req.params.id), meta: {}, error: null });
}));

apiRouter.get("/bookings/:id/messages", asyncHandler(async (req, res) => {
  res.json({ data: await listMessages(req.params.id), meta: {}, error: null });
}));

apiRouter.post("/bookings/:id/messages", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const recipientId = String(req.body.recipientId);
  const message = await createMessage(req.params.id, actor.id, recipientId, String(req.body.body ?? ""), req.body.mediaUrl);
  res.status(201).json({ data: message, meta: {}, error: null });
}));

apiRouter.get("/notifications", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  res.json({ data: await listNotifications(actor.id), meta: {}, error: null });
}));

apiRouter.post("/bookings/:id/reviews", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const review = await createReview(req.params.id, actor.id, Number(req.body.rating), req.body.comment);
  res.status(201).json({ data: review, meta: {}, error: null });
}));

apiRouter.get("/host/dashboard", asyncHandler(async (req, res) => {
  const hostId = getHostId(req);
  res.json({ data: await hostDashboard(hostId), meta: {}, error: null });
}));

apiRouter.get("/host/availability", asyncHandler(async (req, res) => {
  const hostId = getHostId(req);
  res.json({ data: await hostAvailability(hostId), meta: {}, error: null });
}));

apiRouter.put("/host/availability/:date", asyncHandler(async (req, res) => {
  const hostId = getHostId(req);
  const block = await updateHostAvailability(hostId, req.params.date, Boolean(req.body.blocked), req.body.notes);
  res.json({
    data: { ...block, maxDogsPerDay: 3 },
    meta: { persisted: true, note: "Capacity is still capped at 3 dogs per day." },
    error: null
  });
}));

apiRouter.post("/host/bookings/:id/confirm", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const booking = await transitionBookingStatus(req.params.id, actor.id, "host", "confirmed_awaiting_deposit", req.body.reason);
  res.json({ data: booking, meta: {}, error: null });
}));

apiRouter.post("/host/bookings/:id/reject", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const booking = await transitionBookingStatus(req.params.id, actor.id, "host", "cancelled", req.body.reason ?? "Rejected by host");
  res.json({ data: booking, meta: { reason: req.body.reason }, error: null });
}));

apiRouter.post("/host/bookings/:id/start", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const booking = await transitionBookingStatus(req.params.id, actor.id, "host", "in_boarding", "Checked in");
  res.json({ data: booking, meta: {}, error: null });
}));

apiRouter.post("/host/bookings/:id/end", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const booking = await transitionBookingStatus(req.params.id, actor.id, "host", "awaiting_final_payment", "Boarding ended");
  res.json({ data: booking, meta: {}, error: null });
}));

apiRouter.post("/host/bookings/:id/diary", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const diary = await createDiaryEntry(req.params.id, actor.id, req.body);
  res.status(201).json({ data: diary, meta: { notification: req.body.healthAlert ? "pet_health_alert" : "diary_updated" }, error: null });
}));

apiRouter.get("/host/income", asyncHandler(async (req, res) => {
  const hostId = getHostId(req);
  res.json({ data: await hostIncome(hostId), meta: {}, error: null });
}));

apiRouter.patch("/host/service-settings", asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const settings = await updateHostSettings(actor.id, req.body);
  res.json({ data: { ...settings, maxDogsPerDay: 3, minWeightKg: 1, maxWeightKg: 12 }, meta: {}, error: null });
}));

function parsePaymentMethod(raw: unknown): PaymentMethod {
  const value = String(raw ?? "duitnow_qr") as PaymentMethod;
  return PAYMENT_METHODS.includes(value) ? value : "duitnow_qr";
}

function getHostId(req: { header(name: string): string | undefined; body: Record<string, unknown>; query: Record<string, unknown> }) {
  return String(req.header("x-host-id") ?? req.body.hostId ?? req.query.hostId);
}
