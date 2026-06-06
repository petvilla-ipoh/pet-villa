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

Run migrations from Supabase SQL Editor or `psql` after setting `DATABASE_URL`.

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
