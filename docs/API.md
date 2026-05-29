# REST API Specification

Base path: `/api/v1`

Response envelope:

```json
{ "data": {}, "meta": {}, "error": null }
```

Error envelope:

```json
{ "data": null, "meta": {}, "error": { "code": "VALIDATION_FAILED", "message": "Invalid input", "details": {} } }
```

Common error codes:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_FAILED`
- `RESOURCE_NOT_FOUND`
- `DOG_NOT_ELIGIBLE`
- `BOOKING_CONFLICT`
- `INVALID_BOOKING_STATE`
- `PAYMENT_FAILED`
- `PAYMENT_ACTION_REQUIRED`
- `REFUND_FAILED`
- `INTERNAL_ERROR`

## Owner Endpoints

### `POST /auth/register`

Creates an owner account.

Body:

```json
{ "name": "Mei Ling", "email": "mei@example.com", "phone": "+60123456789", "password": "secret123" }
```

Responses: `201`, `400`, `409`

### `POST /auth/login`

Returns auth token.

Responses: `200`, `401`

### `GET /owner/notice`

Returns owner notice content.

Responses: `200`

### `POST /pets`

Creates pet profile. Rejects dogs outside 1-12kg, aggressive dogs, dogs with fleas, or invalid vaccine status.

Responses: `201`, `400 DOG_NOT_ELIGIBLE`

### `GET /pets`

Lists owner pets.

Responses: `200`

### `POST /bookings`

Creates a pending booking request.

Body:

```json
{
  "petId": "uuid",
  "hostId": "uuid",
  "serviceType": "overnight_boarding",
  "startAt": "2026-06-10T09:00:00+08:00",
  "endAt": "2026-06-12T12:00:00+08:00"
}
```

Responses: `201`, `400`, `409 BOOKING_CONFLICT`

### `GET /bookings`

Lists owner bookings. Supports `status`, `limit`, `cursor`.

Responses: `200`

### `POST /bookings/:id/payments/deposit`

Pays 50% deposit after host confirmation. Requires idempotency key.

Responses: `201`, `409 INVALID_BOOKING_STATE`, `402 PAYMENT_FAILED`

### `POST /bookings/:id/payments/final`

Pays remaining 50% after boarding ends.

Responses: `201`, `409 INVALID_BOOKING_STATE`, `402 PAYMENT_FAILED`

### `GET /bookings/:id/diary`

Gets photo/video diary timeline.

Responses: `200`, `404`

### `GET /bookings/:id/messages`

Gets booking chat.

Responses: `200`

### `POST /bookings/:id/messages`

Sends booking chat message.

Responses: `201`

### `GET /notifications`

Lists notification center items.

Responses: `200`

## Host Endpoints

### `GET /host/dashboard`

Returns today capacity, pending requests, currently boarding, diary reminders, and revenue snapshot.

Responses: `200`

### `GET /host/availability`

Returns daily accepted dog count and blocked days.

Responses: `200`

### `PUT /host/availability/:date`

Blocks/unblocks a date or changes notes. Capacity remains capped at 3.

Responses: `200`

### `POST /host/bookings/:id/confirm`

Moves `pending_confirmation` to `confirmed_awaiting_deposit` after pet eligibility and capacity checks.

Responses: `200`, `409 BOOKING_CONFLICT`, `409 INVALID_BOOKING_STATE`

### `POST /host/bookings/:id/reject`

Cancels/rejects a pending booking with reason.

Responses: `200`, `409 INVALID_BOOKING_STATE`

### `POST /host/bookings/:id/start`

Moves `deposit_paid` to `in_boarding`.

Responses: `200`

### `POST /host/bookings/:id/end`

Moves `in_boarding` to `awaiting_final_payment`.

Responses: `200`

### `POST /host/bookings/:id/diary`

Adds diary entry with photo/video metadata and sends diary notification.

Responses: `201`

### `GET /host/income`

Returns deposits, final payments, refunds, and withdrawable balance.

Responses: `200`

### `PATCH /host/service-settings`

Updates display service settings. Hard rules remain: 1-12kg dogs and max 3 dogs/day.

Responses: `200`, `400`
