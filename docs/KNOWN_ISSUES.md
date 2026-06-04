# Known Issues

These issues were discovered from the current repository state and should be reviewed before production use.

## P0 Risks

1. Many business records are stored in browser localStorage.
   - Customer accounts, pets, bookings, orders, vouchers, reviews, chat, gallery uploads, and off days may not be cloud-persistent.
   - A browser reset can lose these records.

2. Real backend database integration is incomplete for the customer-facing web flows.
   - PostgreSQL migrations and API exist.
   - Web pages still rely heavily on localStorage helper modules.

3. Real authentication is not production-grade yet.
   - Current web session uses local browser storage.
   - Passwords/OTP flows need secure backend provider integration before real launch.

4. Upload storage is not production-grade.
   - Gallery and pet images may be stored as local data URLs.
   - Use Supabase Storage or AWS S3 for real customer/host uploads.

5. Real chat is not fully cloud/realtime.
   - Chat currently uses localStorage thread sync.
   - Multi-device host/customer chat needs backend persistence and realtime delivery.

6. Production environment variables may not be fully configured.
   - `.env.example` exists.
   - Real values must be backed up and configured in Vercel/Render.

## Data / Business Logic Issues

1. Price mismatch risk.
   - Web UI currently shows/uses RM35/night in several frontend paths.
   - Database migration and shared package constants still contain RM40/night defaults (`4000` sen).
   - Align backend/shared constants before real API-driven pricing.

2. Capacity source is local/demo.
   - Capacity/off day logic exists in frontend.
   - Real capacity should be computed from confirmed/paid/active/staying bookings in database by dog count.

3. Referral reward flow is scaffolded in frontend.
   - Real reward issuance should be server-side to prevent duplicate/abusive claims.

4. Voucher usage is frontend-driven.
   - Real voucher validation should be server-side.

5. Payment confirmation is demo/local in parts of the web UI.
   - Real payment status should come from Stripe/payment gateway webhooks.

## UI / Content Issues

1. Some emoji/icon rendering may depend on browser/device fonts.
2. Verify all Chinese pages after every content change to avoid mixed EN/中文.
3. Watch for mojibake characters such as `Â`, `â`, and `�`.

## Deployment Issues To Verify

1. Confirm Vercel Production Branch is `master` if the release process pushes to `master`.
2. Confirm `NEXT_PUBLIC_API_URL` points to the deployed backend API once real backend is used.
3. Confirm Render backend can resolve and connect to `DATABASE_URL`.
4. Confirm Supabase migrations have been applied.
