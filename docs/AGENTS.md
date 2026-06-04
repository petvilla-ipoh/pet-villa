# Pet Villa Agent Rules

This file is mandatory reading before any future change to The Pet Villa Ipoh project.

## Non-Negotiable Rules

- Do not privately redesign existing pages.
- Do not delete existing features without explicit user approval.
- Do not break Booking, Referral, Voucher, Payment, Orders, Reviews, Gallery, Chat, or Capacity logic.
- Do not change the Pet Villa brand style unless the user explicitly requests a redesign.
- Keep the current brand language: cream background, peach/coral actions, deep brown typography, rounded cards, soft shadows, warm pet boarding feel.
- Mobile-first is the default for customer-facing pages.
- Host Panel changes must improve staff operations, not become a decorative dashboard.

## Documentation Rules

- Every completed change must update `docs/CHANGELOG.md`.
- Every new feature must update `docs/FEATURE_LIST.md`.
- Any new storage key must update `docs/LOCALSTORAGE_MAP.md`.
- Any new environment variable must update `docs/ENV_VARIABLES.md`.
- Any known bug or limitation must be added to `docs/KNOWN_ISSUES.md`.
- Any deployment setting change must update `docs/DEPLOYMENT.md`.

## Protected Business Logic

- Overnight boarding is charged per night and currently displayed in the web UI as RM35/night.
- Daycare is charged at RM5/hour.
- Deposit and balance payment must remain two-stage unless explicitly changed.
- Booking capacity is based on dog count, not order count.
- Maximum capacity is 3 dogs per day.
- Cancelled, refunded, failed, expired, and timed-out pending bookings must not consume capacity.
- Referral rewards cannot be directly claimed. They should be awarded only after the referred user verifies and completes the first qualifying booking.
- Voucher usage must update order totals and voucher status.
- Host off days must block customer booking dates.

## UI Guardrails

- Do not turn compact mobile sections into long one-card-per-row lists unless requested.
- Do not introduce a cold corporate dashboard style.
- Do not replace brand colors with unrelated palettes.
- Do not use fake buttons. Anything that looks clickable must navigate, open a modal, update state, submit, or show clear feedback.
- Do not leave mixed English text in Chinese mode.

## Git / Release Rules

- Commit meaningful changes with a clear commit message.
- Push to the requested branch.
- Do not commit `.env`, secrets, private keys, uploaded customer data, or local browser cache.
- Before major releases, run at minimum:
  - `npm run build --workspace @pet-villa/web`
  - relevant manual browser checks for mobile routes.
