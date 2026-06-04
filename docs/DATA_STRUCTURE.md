# Data Structure

This file documents the discovered data structures in the current codebase.

## Database Schema

PostgreSQL migrations exist in `database/migrations`.

### users

Stores user identity and profile data.

Fields include:

- `id`
- `role`
- `name`
- `email`
- `phone`
- `password_hash`
- `avatar_url`
- `fcm_token`
- emergency contact fields
- timestamps

### hosts

Stores host/business profile.

Fields include:

- `id`
- `user_id`
- `display_name`
- `address`
- `city`
- `max_dogs_per_day`
- accepted weight range
- overnight/daycare prices
- check-in/check-out rules
- feature list
- payout reference
- ratings

### pets

Stores dog profiles.

Fields include:

- `id`
- `owner_id`
- `name`
- `species`
- `breed`
- `weight_kg`
- `birthday`
- `sex`
- `vaccine_status`
- `has_aggression`
- `has_fleas`
- habits, special needs, feeding, medical notes
- `photo_url`

Business constraint:

- Dog only.
- 1-12kg.
- No aggressive dog.
- No fleas.

### bookings

Stores booking records.

Fields include:

- `id`
- `owner_id`
- `host_id`
- `pet_id`
- `service_type`
- `status`
- `start_at`
- `end_at`
- check-in/check-out timestamps
- `subtotal_sen`
- `deposit_sen`
- `final_payment_sen`
- owner/host notes
- cancellation/refund fields

### booking_status_events

Stores booking state transitions.

### reviews

Stores customer reviews tied to bookings.

Fields include:

- `booking_id`
- `reviewer_id`
- `host_id`
- `rating`
- `comment`

### messages

Stores booking-related messages.

### diary_entries

Stores diary updates with media and activity/health notes.

### notifications

Stores in-app/push notification records.

### payments

Stores staged payment records.

Fields include:

- `booking_id`
- `payer_id`
- `stage`
- `status`
- `method`
- `amount_sen`
- provider IDs
- paid/refunded timestamps

### host_availability_blocks

Stores host blocked/off dates.

Fields include:

- `host_id`
- `date`
- `blocked`
- `notes`

## Web localStorage Data Shapes

Current web flows use browser localStorage heavily.

### Session/User

- `pet-villa-session`
- `pet-villa-registered-user`
- `pet-villa-registered-users`

Typical user fields:

- `id`
- `fullName`
- `name`
- `phone`
- `email`
- `password`
- `phoneVerified`
- `emailVerified`
- `profileAvatar`

### PetProfile

Defined in `apps/web/app/lib/petProfiles.ts`.

Fields include:

- `id`
- `name`
- `breed`
- `age`
- `weight`
- `gender`
- `coatColor`
- `vaccinated`
- `neutered`
- `friendly`
- `calm`
- `foodBrand`
- `mealsPerDay`
- `allergies`
- `medication`
- `notes`
- `photo`
- `ownerId`

### BookingDraft

Defined in `apps/web/app/lib/orderFlow.ts`.

Fields include:

- `id`
- `service`
- `serviceLabel`
- `startDate`
- `endDate`
- `dateLabel`
- `nights`
- `hours`
- `selectedPets`
- `petNames`
- `petCount`
- `specialRequest`
- `totalAmount`
- `depositAmount`
- `balanceAmount`
- `voucherId`
- `voucherDiscount`
- `payableAmount`

### VillaOrder

Extends BookingDraft.

Additional fields include:

- `status`
- `paymentStatus`
- `paidAmount`
- `createdAt`
- `review`
- `cancelledAt`

### Voucher

Defined in `apps/web/app/lib/vouchers.ts`.

Fields include:

- `id`
- `code`
- `label`
- `description`
- `type`
- `amount`
- `minSpend`
- `status`
- `usedAt`
- `usedOrderId`
- `expiresAt`

### Review

Defined in `apps/web/app/lib/reviews.ts`.

Fields include:

- `id`
- `owner`
- `pet`
- `breed`
- `rating`
- `copy`
- `date`
- `photo`
- `status`

### Gallery Photo

Defined in `apps/web/app/lib/gallery.ts`.

Fields include:

- `id`
- `src`
- `petName`
- `breed`
- `caption`
- `status`
- `createdAt`

### Chat Thread

Defined in `apps/web/app/lib/messages.ts`.

Fields include:

- `id`
- `customerId`
- `customerName`
- `phone`
- `email`
- `messages`
- `unreadHost`
- `unreadCustomer`
- timestamps

## Important Data Risk

The database schema is present, but many current web features persist to browser localStorage. This means live customer/host data may not be shared across devices or preserved after clearing browser data unless backend integration is completed.
