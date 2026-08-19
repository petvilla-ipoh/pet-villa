# Pet Villa Production Readiness Report

Date: 2026-08-09
Scope: Web customer experience, Host Operations, Supabase integration, storage, security, and obvious performance risks.

## Executive decision

Pet Villa is a release candidate, but it is not yet approved for real paid operations. The local production build is healthy and the principal production data paths are Supabase-first. The remaining release blockers are deployment of the current working tree, live end-to-end verification against Production, and dependency/security work outside the patched Web runtime.

Production readiness score: **74/100**

## Verification baseline

- TypeScript: PASS, 0 errors across API, Mobile, Web, and Shared workspaces.
- Host Authentication: PASS, 25/25.
- Staff Access: PASS, 25/25.
- Business Rules: PASS, 38/38.
- Private Diary: PASS, 14/14.
- Next.js production build: PASS on Next.js 16.3.0.
- Generated application routes: 25 listed routes, including customer, Host, and Host API routes.
- Current working tree deployment: NOT DEPLOYED in this final pass.
- Live Production customer journey after these changes: NOT VERIFIED.

## Connection status

### Database

- Private Diary migration `202608060001`: Fully Connected; Production verification was user-confirmed READY.
- Host Operations migration `202608060002`: Fully Connected; Production verification was user-confirmed READY.
- Voucher Campaign migration `202608060003`: Fully Connected; Production verification was user-confirmed READY.
- Staff Access migration `202608070001`: application code and tests are complete; Production migration execution was not independently verified in this final pass.
- Database schema is frozen. This pass created no migration and changed no schema, RLS policy, trigger, function, or bucket.

### Customer modules

- Authentication: Fully Connected. Supabase Auth is the authority; production fallback is disabled.
- Pets, Orders, Booking, Chat, Vouchers, Reviews, and Business Settings: Fully Connected in application code through Supabase-first paths. A failed Production write must not report success.
- Private Diary: Fully Connected in code and database policy tests; live cross-account media isolation is NOT VERIFIED in this pass.
- Payment: Partially Connected. QR/bank payment and order records exist, but payment verification remains a manual Host operation by design. Stripe is not enabled.
- Gallery: Fully Connected in code through Supabase-first reads/writes; live upload/display after the current deployment is NOT VERIFIED.

### Host modules

- Host Authentication and role protection: Fully Connected and test-covered.
- Staff permissions: Fully Connected in code; sidebar, workspace access, and server APIs fail closed.
- CRM, Orders, Reviews, Vouchers, Chat, Gallery, Private Diary, and Business Settings: Supabase-first integration is complete in the working tree.
- Push notifications and automated WhatsApp delivery: Not Connected / external setup required. Website Inbox is the connected messaging channel.
- Current Production behavior for all updated Host modules: NOT VERIFIED until this working tree is deployed.

### Storage

- `gallery-photos` and `pet-photos`: public product media paths.
- `pet-diary-media`: private Diary media path created by the verified Diary migration.
- Service-role secret marker was not found in the built client static bundle.
- Real Production upload, signed read, and cross-user denial after the latest code changes: NOT VERIFIED.

## Security findings

### Resolved in this pass

- Upgraded Web from vulnerable Next.js 14.2.23 to Next.js 16.3.0.
- Added baseline response headers: CSP `base-uri`, `frame-ancestors`, and `object-src`; Referrer Policy; MIME sniffing protection; frame denial; DNS prefetch control; and Permissions Policy.
- Legacy `browserApi.saveSession()` now strips any token before writing non-sensitive user metadata to localStorage.
- Malformed legacy localStorage session JSON is removed instead of crashing the page.
- Next.js 16 dynamic route parameters are handled safely in the Staff update API.
- No `dangerouslySetInnerHTML`, `eval`, or `new Function` was found in the completed security pass.

### Remaining risks

- **P1 / Major:** Full-workspace `npm audit --omit=dev` reports 43 advisories: 2 critical, 22 high, 18 moderate, and 1 low. The critical chains are Mobile `expo -> tar` and API `firebase-admin -> websocket-driver`; Next.js is no longer in the advisory list. Upgrade and regression-test those workspaces before shipping Mobile or the standalone API.
- **P2 / Minor:** CSP is a compatibility-safe baseline, not a complete nonce-based `script-src` policy. Introduce a report-only policy and browser-test Supabase/Auth/Stripe flows before enforcing a strict script policy.
- **P2 / Minor:** Next.js reports that `middleware.ts` is deprecated in favor of `proxy.ts`. It still builds and runs, but should be migrated before a future Next major upgrade.
- **P2 / Minor:** An unused legacy `AuthPanel` still contains demo form defaults. It is not imported by current routes, but should be removed in a dedicated dead-code cleanup.

## Performance findings

- **P1 / Major:** Mobile-first pages ship many PNG assets between 1.36 MB and 2.35 MB. Authentication, dashboard, booking, payment, pets, orders, hero, avatar-sheet, and logo assets need responsive WebP/AVIF variants and explicit dimensions.
- **P1 / Major:** Runtime mobile performance, Core Web Vitals, and Safari memory behavior are NOT VERIFIED with Production assets.
- **P2 / Minor:** `apps/web/app/host/page.tsx` and the global stylesheet are large monoliths. Split Host workspaces and defer inactive panels after Production stabilization.
- Production build compiles successfully with Turbopack; no build-time performance blocker remains.

## Priorities

### P0 - before taking real payments

1. Deploy the current reviewed working tree to Preview, then Production.
2. Run live customer and Host end-to-end verification against Production Supabase: register/login, pet creation, booking, voucher, QR payment submission, Host approval, order visibility, Diary upload/read isolation, and calendar full/unfull.
3. Confirm the Staff Access migration and Production RLS state from Supabase, because that execution was not independently verified in this pass.
4. Confirm rollback and backup procedures before accepting the first real booking.

### P1 - before public launch

1. Resolve or explicitly isolate the Mobile Expo and standalone API Firebase dependency advisories.
2. Compress and responsively serve the largest visual assets, especially authentication and first-viewport banners.
3. Run Production Lighthouse/WebPageTest on representative iPhone and Android profiles.
4. Verify Storage upload limits, accepted MIME types, signed access, and cross-customer Diary denial with two real test accounts.

### P2 - controlled follow-up

1. Roll out a full CSP using report-only telemetry first.
2. Migrate Next.js middleware to proxy convention.
3. Remove unused legacy demo authentication code and remaining non-authoritative localStorage helpers.
4. Split the Host monolith into workspace components and add route-level loading boundaries.

## UI upgrade backlog

- Optimize all large banners and avatar sheets without changing the approved visual direction.
- Verify mobile Safari safe areas, fixed navigation, keyboard/form behavior, and long localized labels.
- Add consistent empty, loading, offline, and Supabase error states across Host workspaces.
- Complete accessibility verification for focus order, modal focus trapping, contrast, labels, and reduced motion.
- Validate desktop Host dialogs at 1024 px, 1366 px, and wide-screen layouts.

## Launch verdict

**Not yet suitable for real Pet Villa business launch.** The implementation is substantially connected and locally buildable, but the current code has not been deployed or re-tested end to end in Production. Once the P0 deployment, Production data-flow verification, Staff/RLS confirmation, and rollback checks are complete, Pet Villa can move to a controlled soft launch. P1 dependency and image-performance work should be completed before broad public traffic.
