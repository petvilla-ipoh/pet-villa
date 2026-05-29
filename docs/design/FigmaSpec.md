# Figma-Ready Design Specification

## Design Direction

The Pet Villa Ipoh should feel like a warm small home, not a kennel marketplace. Use rounded illustrated cards, soft peach backgrounds, friendly copy, and clear trust signals around small-dog-only care, no cages, 24h companionship, and daily updates.

Figma MCP is not available in this session, so this file is the design handoff: tokens, components, and screen frames are specified for direct recreation in Figma.

## Tokens

Colors:
- Primary: `#e8927c`
- Secondary: `#f5c4b3`
- Background: `#faf6f2`
- Surface: `#fffaf7`
- Text: `#3d1f0d`
- Muted text: `#7a5a46`
- Accent green: `#7a9e7e`
- Warning: `#d9922e`
- Danger: `#c95c50`
- Border: `#efd8cd`

Typography:
- Display/H1: Playfair Display, 34/40, 700
- H2: Playfair Display, 26/32, 700
- H3: Playfair Display, 21/28, 700
- Body: Nunito, 16/24, 500
- Body small: Nunito, 14/20, 500
- Caption: Nunito, 12/16, 600
- Button: Nunito, 16/20, 800

Spacing:
- 4, 8, 12, 16, 20, 24, 32, 40

Radius:
- Page cards: 24
- Small cards: 20
- Inputs: 18
- Chips: 999
- Buttons: 50
- Avatar: 999
- Modal sheet: 28 top radius

Shadows:
- Soft card: 0 8 24 rgba(61, 31, 13, 0.08)
- Floating CTA: 0 12 32 rgba(232, 146, 124, 0.28)

## Core Components

Button:
- Primary filled peach with text `#3d1f0d`.
- Secondary filled `#f5c4b3`.
- Ghost transparent with primary text.
- Disabled muted surface and muted text.
- Height 52, radius 50, horizontal padding 24.

Card:
- Background `#fffaf7`, border `#efd8cd`, radius 24.
- Padding 20.
- Optional soft shadow.

Avatar:
- Circular, 40/56/72 sizes.
- Uses pet photo or initial.

RatingStars:
- Filled star primary, empty star border.
- 5-point display.

PetTag:
- Capsule chip for `Small dog`, `Vaccinated`, `No fleas`, `Calm`, `Special diet`.

BookingStatusBadge:
- `pending_confirmation`: warning
- `confirmed_awaiting_deposit`: secondary
- `deposit_paid`: accent green
- `in_boarding`: primary
- `awaiting_final_payment`: warning
- `completed`: accent green
- `cancelled`: muted/danger
- `refunded`: muted/green

## Mobile Frames

Target frame: iPhone 15, 393 x 852.

### Owner Home

Sections:
- Warm illustrated hero with brand name, tagline, and `Book a stay` CTA.
- Trust chips: Small dogs 1-12kg, Max 3 dogs/day, No cages, 24h AC.
- Service cards: Overnight Boarding RM40/night, Daycare RM5/hour.
- Feature grid: No cage, 24h companion, Daily 3-5 updates, Same sleep.
- Owner notice preview.
- Bottom tabs: Home, Pets, Orders, Diary, Profile.

### Pet Profile

Sections:
- Pet photo/avatar.
- Dog details: name, breed, weight, age.
- Eligibility panel showing accepted/rejected state.
- Vaccine status.
- Habits and special needs.
- Emergency contact and vet notes.

### Booking Flow

Steps:
- Choose service: Overnight or Daycare.
- Select date/time with check-in/out constraints.
- Select pet.
- Review house rules and owner notice.
- Submit booking request.
- Status handoff: pending confirmation.

### My Orders

Sections:
- Status filter pills.
- Booking cards with pet, service, dates, amount, deposit/final payment state.
- CTA changes by state: Pay deposit, View diary, Pay final, Leave review.

### Pet Diary

Sections:
- Timeline grouped by date.
- Photo/video cards.
- Care notes: meals, walks/play, rest, mood.
- Alert card for discomfort.

### Chat

Sections:
- Booking-linked header.
- Message list.
- Quick actions: Send photo, Ask update, Emergency call.

### Notification Center

Sections:
- Unread summary.
- Trigger-specific cards: booking, payment, diary, message, start/end, alert.

### Owner Profile

Sections:
- Account info.
- Payment methods.
- Owner notice.
- Notification preferences.

### Host Dashboard

Sections:
- Today capacity: 0/3 to 3/3.
- Pending requests.
- Currently boarding.
- Diary due reminders.
- Revenue snapshot.

### Host Availability

Sections:
- Calendar list.
- Daily accepted dogs count.
- Block date switch.
- Capacity indicator max 3.

### Accept/Reject

Sections:
- Pet eligibility summary.
- Owner notes and special needs.
- Capacity conflict alert.
- Confirm booking or reject with reason.

### Host Diary Composer

Sections:
- Select booking.
- Add photos/videos.
- Care notes.
- Pet mood.
- Alert owner toggle.

### Income and Withdrawal

Sections:
- Paid deposits.
- Awaiting final payments.
- Refunds.
- Withdrawable balance.

### Service Settings

Sections:
- Prices.
- Accepted pet rules.
- Check-in/out hours.
- Service feature toggles.
- Payment method display.
