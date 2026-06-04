# Project Brief

## Project

- Name: The Pet Villa Ipoh
- Brand: The Pet Villa · Ipoh · Pet Boarding
- Tagline: A Home Away From Home
- Version: v1.0 Stable Release

## URLs

- Production URL: https://the-pet-villa-ipoh-new.vercel.app
- Host Panel URL: https://the-pet-villa-ipoh-new.vercel.app/host
- GitHub Repository: https://github.com/petvilla-ipoh/pet-villa
- Vercel Project: `the-pet-villa-ipoh-new`

## Repository Shape

This is a monorepo.

- `apps/web`: Next.js 14 customer website and host panel.
- `apps/api`: Node.js Express backend API.
- `apps/mobile`: mobile app client scaffold.
- `packages/shared`: shared types, pricing, and validation logic.
- `database/migrations`: PostgreSQL/Supabase schema migrations.
- `docs`: project documentation.

## Technology Architecture

Frontend:

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Local browser state helpers for current web demo flows

Backend:

- Node.js
- Express
- TypeScript
- PostgreSQL client via `pg`
- Stripe service
- Firebase Admin / FCM service
- Socket.io dependency available

Database:

- PostgreSQL schema designed for Supabase/PostgreSQL.
- Migration files exist in `database/migrations`.
- Current production website still uses many browser `localStorage` flows for customer, booking, review, gallery, voucher, and host data.

Auth:

- API contains auth utilities.
- Current web UI uses local browser session storage for demo/login state.
- Real production auth should be migrated to backend/Supabase/Auth provider before public business use.

Storage:

- Current web gallery and pet photos can be stored as browser/local data URLs.
- Real production image storage should use Supabase Storage or AWS S3.

Payments:

- API Stripe service exists.
- Web UI supports staged payment UX and demo payment confirmation.
- Real gateway confirmation requires live Stripe/DuitNow/FPX/TNG/GrabPay integration.

Notifications:

- Firebase service exists in backend.
- Real production push delivery requires Firebase credentials and device token wiring.

## Current Operational Status

The project is usable as a polished web prototype with substantial frontend business logic. It is not yet fully cloud-persistent for all business data unless the backend database and frontend API integration are completed and deployed.
