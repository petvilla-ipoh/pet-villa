# The Pet Villa Ipoh PRD

## Goal

Build a mobile-first pet boarding app for The Pet Villa Ipoh that lets pet owners book safe small-dog overnight boarding or daycare, and lets the host manage capacity, booking decisions, pet diary updates, payments, notifications, and income.

Success is reached when the app contains owner and host experiences, enforces all service rules in shared business logic, exposes API endpoints for the main workflows, includes PostgreSQL schema/migrations, and documents the full design system and user journeys.

## Brand

- Name: The Pet Villa · Ipoh · Pet Boarding
- Tagline: A Home Away From Home
- Primary color: `#e8927c`
- Secondary color: `#f5c4b3`
- Background: `#faf6f2`
- Text: `#3d1f0d`
- Accent green: `#7a9e7e`
- Title font: Playfair Display
- Body font: Nunito
- Style: warm cute illustration, soft home-like service, 24px large radius, 50px capsule buttons

## Personas

### Pet Owner Persona

Name: Mei Ling

Motivations:
- Needs a trusted Ipoh home-style boarding option for a small dog during work trips or family travel.
- Wants proof that her dog is comfortable, fed, clean, safe, and not caged.
- Prefers clear pricing, transparent deposit/final payment, and fast host replies.

Anxieties:
- Worries about large dogs, aggressive dogs, fleas, and overcrowding.
- Worries that special feeding or medical routines will be forgotten.
- Needs daily visual reassurance through photos and videos.

Trust requirements:
- Clear small-dog-only rules, vaccination and health proof expectations.
- Visible booking status, payment status, diary updates, and emergency alerts.
- Easy chat with host before and during boarding.

Booking behavior:
- Creates a pet profile before booking.
- Checks weight, habits, vaccine status, and special needs.
- Pays 50% deposit after host confirmation and 50% final payment after the stay.

Payment expectations:
- Supports Malaysian-friendly payment options: DuitNow QR, FPX, Touch'n Go, GrabPay, Visa/Mastercard.
- Wants receipts, payment success notifications, and refund clarity.

Emergency contact needs:
- Provides emergency contact, vet info, allergies, medication, and consent for urgent care.
- Expects immediate alert if pet becomes unwell.

Review behavior:
- Leaves a review after final payment and completed stay, especially if photo/video updates were consistent.

### Host Persona

Name: The Pet Villa Host

Motivations:
- Wants to run a controlled, high-trust small-dog boarding service from home.
- Wants simple booking review, capacity checks, diary posting, income tracking, and payout visibility.

Capacity limits:
- Maximum 3 dogs per day.
- Accepts only 1-12kg small dogs.
- Rejects large dogs, aggressive dogs, and dogs with fleas.

Home and policy constraints:
- No cages.
- 24h companionship.
- 24h air conditioning.
- Same-room/same-sleeping-area care.
- Daily 3-5 photo/video updates.

Booking acceptance behavior:
- Reviews pet weight, vaccine status, temperament, habits, and special needs before confirming.
- Confirms only if daily capacity and pet eligibility pass.
- Rejects with a clear reason if rules fail.

Communication needs:
- Needs booking chat, diary updates with photos/videos, and emergency alert workflow.

Payout expectations:
- Tracks 50% deposit, 50% final payment, refunds, and withdrawable balance.

Review management:
- Reads owner reviews and uses rating feedback to improve service settings.

## Product Scope

### Owner App

- Home
- Pet profile with weight, vaccine status, habits, special needs
- Booking flow
- My orders
- Pet diary
- Chat
- Notification center
- Profile
- Owner notice page

### Host App

- Dashboard
- Availability management with daily max 3 dogs
- Accept/reject booking
- Pet diary posting with photos/videos
- Income and withdrawal
- Service settings

## Service Rules

Eligibility:
- Accept only dogs from 1kg to 12kg.
- Reject large dogs.
- Reject aggressive dogs.
- Reject dogs with fleas.
- Require health proof and vaccine status before stay.

Capacity:
- Maximum 3 dogs hosted per calendar day.
- Capacity check applies to overnight and daycare bookings.

Service features:
- No cages.
- 24h companionship.
- Daily 3-5 photo/video updates.
- Same sleeping environment.
- 24h air conditioning.

Hours:
- Check-in: 9:00am-8:00pm.
- Check-out: before 12:00pm.

Pricing:
- Overnight Boarding: RM 40 per night.
- Daycare: RM 5 per hour.

Payment:
- After host confirmation, owner pays 50% deposit.
- After boarding ends, owner pays remaining 50%.
- Supported methods: DuitNow QR, FPX, Touch'n Go, GrabPay, Visa/Mastercard.

## Booking Statuses

Primary lifecycle:
- `pending_confirmation`
- `confirmed_awaiting_deposit`
- `deposit_paid`
- `in_boarding`
- `awaiting_final_payment`
- `completed`

Terminal/branch statuses:
- `cancelled`
- `refunded`

## Notification Triggers

- Booking request submitted
- Host confirms booking
- Host rejects booking
- Payment succeeds
- Daily diary update
- New message
- Boarding starts
- Boarding ends
- Pet discomfort or health alert

## Owner Notice Content

Owners must see this inside the app:
- Please provide health proof and vaccination details before boarding.
- Please bring your dog's own food and treats.
- Please explain special needs, medication, allergies, habits, and anxiety triggers in advance.
- Any discomfort, illness, emergency care, transport, vet, medication, or special handling cost is paid by the owner.

## Technical Scope

- Mobile: React Native with TypeScript.
- API: Node.js with Express.
- Database: PostgreSQL.
- Cache/queues: Redis.
- Media: AWS S3.
- Push notifications: Firebase FCM.
- Realtime chat: Socket.io.

## MVP Acceptance Criteria

- Owner can create pet profile and start a booking only when dog eligibility passes.
- Booking capacity logic blocks days already containing 3 accepted dogs.
- Host can confirm or reject pending bookings.
- Payment workflow tracks 50% deposit and 50% final payment.
- Diary supports photo/video metadata and triggers notifications.
- Chat supports booking-linked messages.
- PostgreSQL migration includes all core tables and relationships.
- API docs cover owner and host endpoints, request/response examples, statuses, and error codes.
- Mobile screens render the specified owner and host workflows with brand styling.
