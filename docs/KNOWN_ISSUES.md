# Known Issues

These issues were discovered from the current repository state and should be reviewed before production use.

## P0 Risks

1. Many business records are stored in browser localStorage.
   - Customer account fallback records, chat, and off days may not be cloud-persistent.
   - Pet profiles now use Supabase when configured, but keep a localStorage fallback mirror during migration.
   - Booking drafts and orders now use Supabase when configured, but keep localStorage fallback mirrors during migration.
   - Vouchers, referral codes, and pending referrals now use Supabase when configured, but keep localStorage fallback mirrors during migration.
   - A browser reset can lose these records.

2. Real backend database integration is incomplete for the customer-facing web flows.
   - PostgreSQL migrations and API exist.
   - Auth, pet profiles, booking drafts, orders, vouchers, and referrals have Supabase web integration.
   - Chat, host off days, and some host-created demo records still rely on localStorage helper modules.

3. Real authentication is not production-grade yet.
   - Supabase Auth Round 1 is connected for login/register.
   - Legacy localStorage fallback remains so existing Booking/Payment/Host flows continue to work.
   - OTP is still demo-only (`123456`) and needs real phone/email OTP before launch.

4. Upload storage is not production-grade.
   - Pet images now upload to Supabase Storage when Supabase is configured.
   - Gallery images now upload to Supabase Storage when Supabase is configured, with local data URL fallback retained.
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

3. Referral reward flow now has Supabase RPC support, but still needs production abuse controls.
   - Add rate limiting, first-order qualification rules, and monitoring before launch.

4. Voucher validation now has Supabase RPC support, but checkout should continue to treat server-side order totals as authoritative.
   - Keep Payment and webhook logic aligned with voucher-discounted order totals.

5. Payment integration still needs live-mode verification before launch.
   - Web payments now use Stripe Checkout in test mode.
   - Stripe webhook `payment_intent.succeeded` updates Supabase order payment status.
   - Live Stripe keys and webhook endpoint verification are still required before production payments.

## UI / Content Issues

1. Some emoji/icon rendering may depend on browser/device fonts.
2. Verify all Chinese pages after every content change to avoid mixed EN/中文.
3. Watch for mojibake characters such as `Â`, `â`, and `�`.

## Deployment Issues To Verify

1. Confirm Vercel Production Branch is `master` if the release process pushes to `master`.
2. Confirm `NEXT_PUBLIC_API_URL` points to the deployed backend API once real backend is used.
3. Confirm Render backend can resolve and connect to `DATABASE_URL`.
4. Confirm Supabase migrations have been applied.
