# Environment Variables

Use `.env.example` as the template. Do not commit real secrets.

## Backend API

`NODE_ENV` — Set to `production` on Render and `development` locally.

`PORT` — Render supplies a port in many setups; this app defaults to `4000`. Use `4000` locally.

`CORS_ORIGIN` — Allowed frontend origins, separated by commas. Example: `https://the-pet-villa.vercel.app,exp://localhost:8081,http://localhost:3000`.

`DATABASE_URL` — Get from Supabase. Create/open your project, then copy the database connection string from the Connect/Database area. Use the pooled connection string for Render.

`DATABASE_SSL` — Use `true` for Supabase/Render production connections. Use `false` for local PostgreSQL.

`SUPABASE_ANON_KEY` — Get from Supabase Project Settings > API. It is safe for public Supabase clients, but this app currently uses its own backend API.

`REDIS_URL` — Redis connection URL. Get it from Render Redis, Upstash, or your Redis provider. Format: `redis://user:password@host:port`.

## Stripe

`PAYMENT_MODE` — Use `local` for development without Stripe. Use `stripe` or leave unset for real Stripe PaymentIntent flow.

`STRIPE_SECRET_KEY` — Get from Stripe Dashboard > Developers > API keys. Use `sk_test_...` for testing and `sk_live_...` only in production.

`STRIPE_PUBLISHABLE_KEY` — Get from Stripe Dashboard > Developers > API keys. Use `pk_test_...` locally/staging and `pk_live_...` in production frontend environments.

`STRIPE_WEBHOOK_SECRET` — Get after creating the webhook endpoint in Stripe Dashboard. For the web app, add endpoint: `https://YOUR_VERCEL_DOMAIN/api/stripe/webhook`, then copy the signing secret, usually `whsec_...`.

## Firebase FCM

`FIREBASE_SERVICE_ACCOUNT` — Recommended for Render. Firebase Console > Project settings > Service accounts > Generate new private key. Paste the full JSON as a single-line environment variable.

`FIREBASE_PROJECT_ID` — Optional alternative. Copy `project_id` from the service account JSON.

`FIREBASE_CLIENT_EMAIL` — Optional alternative. Copy `client_email` from the service account JSON.

`FIREBASE_PRIVATE_KEY` — Optional alternative. Copy `private_key` from the service account JSON. Keep newline escapes as `\n`.

## Mobile App

`EXPO_PUBLIC_API_URL` — Public API base URL for Expo/React Native. Example: `https://the-pet-villa-api.onrender.com/api/v1`.

## Web App

`NEXT_PUBLIC_API_URL` — Public API base URL for Next.js. Set in Vercel Project Settings > Environment Variables. Example: `https://the-pet-villa-api.onrender.com/api/v1`.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Public Stripe publishable key for web payment configuration. Set in Vercel Project Settings > Environment Variables.

## Deployment Platform

`RENDER_HEALTHCHECK_PATH` — Optional documentation variable. Current Render config uses `/health`.

Vercel also provides automatic system variables; you do not need to manually create those for this app.
