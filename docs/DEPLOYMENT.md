# Deployment

## Web Deployment

Platform: Vercel

Project:

- `the-pet-villa-ipoh-new`

Production URL:

- https://the-pet-villa-ipoh-new.vercel.app

GitHub repository:

- https://github.com/petvilla-ipoh/pet-villa

## Vercel Settings

Use these settings for the monorepo web app:

- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build --workspace @pet-villa/web`
- Output Directory: `apps/web/.next`
- Branch: `master`

Root-level `vercel.json` currently contains:

```json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build --workspace @pet-villa/web",
  "devCommand": "npm run dev --workspace @pet-villa/web",
  "outputDirectory": "apps/web/.next"
}
```

## Backend Deployment

Platform: Render

Config file:

- `render.yaml`

Service:

- `the-pet-villa-api`

Build:

- `npm install && npm run typecheck --workspace @pet-villa/api`

Start:

- `npm run dev --workspace @pet-villa/api`

Health:

- `/health`

## Database Deployment

Database provider target:

- Supabase PostgreSQL

Migration files:

- `database/migrations/202605270001_create_pet_villa_core.sql`
- `database/migrations/202605270002_add_host_availability_blocks.sql`
- `database/migrations/202606060001_create_supabase_profiles.sql`
- `database/migrations/202606060002_create_supabase_pets.sql`
- `database/migrations/202606060003_create_supabase_bookings_orders.sql`
- `database/migrations/202606060004_create_stripe_payment_helpers.sql`
- `database/migrations/202606060005_create_supabase_vouchers_referrals.sql`
- `database/migrations/202606060006_create_supabase_gallery.sql`
- `database/migrations/202606070001_create_supabase_reviews.sql`
- `database/migrations/202606070002_create_supabase_host_panel.sql`
- `database/migrations/202608060001_create_supabase_pet_diary.sql`
- `database/migrations/202608060002_create_supabase_host_operations.sql`
- `database/migrations/202608060003_create_supabase_voucher_campaigns.sql`

Run migrations from Supabase SQL Editor or `psql` after setting `DATABASE_URL`.

The Gallery migration creates the public Supabase Storage bucket:

- `gallery-photos`

The Private Diary migration creates the private Supabase Storage bucket:

- `pet-diary-media`

Apply the three `20260806` migrations in numeric order. They have not been remotely executed or verified by this repository change.

## Stripe Web Payments

The web app now uses Next.js API routes on Vercel for Stripe Checkout:

- Create Checkout Session: `/api/stripe/checkout`
- Stripe webhook endpoint: `/api/stripe/webhook`

For Stripe Test Mode, configure the Vercel project with:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

In Stripe Dashboard, add the webhook endpoint:

```text
https://YOUR_VERCEL_DOMAIN/api/stripe/webhook
```

Subscribe at minimum to:

```text
payment_intent.succeeded
```

## Important Notes

- Do not commit `.env`.
- Vercel environment variables must be configured in Vercel Project Settings.
- Render environment variables must be configured in Render service settings.
- If Vercel Production Branch is different from `master`, production may not reflect master commits.
- The current production web app may still use localStorage for many business flows; deployment alone does not make those records cloud-persistent.

## Recommended Release Check

Before release:

```bash
npm run build --workspace @pet-villa/web
```

Then test:

- Home mobile.
- Register/Login.
- Add Pet.
- Booking.
- Payment.
- Orders.
- Host Panel.
