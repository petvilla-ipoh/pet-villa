const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.userId ? { "x-user-id": options.userId } : {}),
      ...(options.hostId ? { "x-host-id": options.hostId } : {}),
      ...(options.idempotencyKey ? { "idempotency-key": options.idempotencyKey } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${JSON.stringify(payload.error)}`);
  }
  return payload.data;
}

const stamp = Date.now();

const ownerRegistration = await api("/auth/register", {
  method: "POST",
  body: {
    name: "E2E Owner",
    email: `owner-${stamp}@example.test`,
    phone: "+60120000001",
    password: "secret123"
  }
});

const ownerLogin = await api("/auth/login", {
  method: "POST",
  body: {
    email: `owner-${stamp}@example.test`,
    password: "secret123"
  }
});

const hostRegistration = await api("/auth/register", {
  method: "POST",
  body: {
    name: "The Pet Villa Host",
    email: `host-${stamp}@example.test`,
    phone: "+60130000001",
    password: "secret123",
    role: "host"
  }
});

const hostId = hostRegistration.host.id;
const ownerId = ownerLogin.user.id;

const pet = await api("/pets", {
  method: "POST",
  userId: ownerId,
  body: {
    name: "Mochi",
    breed: "Poodle Mix",
    weightKg: 6,
    vaccineStatus: "valid",
    habits: "Sleeps with blanket",
    specialNeeds: "Bring own food",
    hasAggression: false,
    hasFleas: false
  }
});

const hosts = await api("/hosts");
if (!hosts.some((host) => host.id === hostId)) {
  throw new Error("Created host was not searchable.");
}

const booking = await api("/bookings", {
  method: "POST",
  userId: ownerId,
  body: {
    petId: pet.id,
    hostId,
    serviceType: "overnight_boarding",
    startAt: "2026-06-10T09:00:00+08:00",
    endAt: "2026-06-12T12:00:00+08:00",
    ownerNotes: "First stay, please send updates."
  }
});

await api(`/host/bookings/${booking.id}/confirm`, {
  method: "POST",
  userId: hostRegistration.user.id,
  hostId,
  body: { reason: "Eligible small dog and capacity available." }
});

await api(`/bookings/${booking.id}/payments/deposit`, {
  method: "POST",
  userId: ownerId,
  idempotencyKey: `deposit-${stamp}`,
  body: { method: "fpx" }
});

await api(`/host/bookings/${booking.id}/start`, {
  method: "POST",
  userId: hostRegistration.user.id,
  hostId
});

await api(`/host/bookings/${booking.id}/diary`, {
  method: "POST",
  userId: hostRegistration.user.id,
  hostId,
  body: {
    mood: "calm",
    mealNotes: "Finished breakfast",
    activityNotes: "Indoor play and nap",
    body: "Mochi is comfortable and resting under 24h AC.",
    media: [{ type: "photo", url: "s3://dev/mochi-breakfast.jpg" }]
  }
});

await api(`/bookings/${booking.id}/messages`, {
  method: "POST",
  userId: ownerId,
  body: {
    recipientId: hostRegistration.user.id,
    body: "Thank you for the update."
  }
});

await api(`/host/bookings/${booking.id}/end`, {
  method: "POST",
  userId: hostRegistration.user.id,
  hostId
});

await api(`/bookings/${booking.id}/payments/final`, {
  method: "POST",
  userId: ownerId,
  idempotencyKey: `final-${stamp}`,
  body: { method: "visa_mastercard" }
});

await api(`/bookings/${booking.id}/reviews`, {
  method: "POST",
  userId: ownerId,
  body: { rating: 5, comment: "Warm, safe, and lots of updates." }
});

console.log(JSON.stringify({ ok: true, ownerId, hostId, petId: pet.id, bookingId: booking.id }, null, 2));
