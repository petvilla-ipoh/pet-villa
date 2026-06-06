# Production Deployment Checklist

## Accounts

- Create Supabase account and project.
- Create Stripe account and enable required Malaysian payment methods available to your Stripe account.
- Create Firebase project and enable Cloud Messaging.
- Create Render account.
- Create Vercel account.

## Database

- Copy Supabase `DATABASE_URL`.
- Run both SQL migration files.
- Confirm all tables exist.
- Do not run dev seed data in production unless you intentionally want demo records.

## Backend API on Render

- Connect the GitHub repo to Render.
- Use `render.yaml` as the Blueprint if available.
- Add environment variables from [.env.example](../../.env.example).
- Set `DATABASE_SSL=true`.
- Set `CORS_ORIGIN` to your Vercel URL and local development origins.
- Set Stripe and Firebase secrets.
- Deploy.
- Open `/health` and confirm it returns `{ ok: true }`.

## Stripe

- In Stripe Dashboard, copy `STRIPE_SECRET_KEY`.
- Create webhook endpoint: `https://YOUR_VERCEL_DOMAIN/api/stripe/webhook`.
- Subscribe at minimum to `payment_intent.succeeded`.
- Copy `STRIPE_WEBHOOK_SECRET`.
- Make a test booking and payment in Stripe test mode.
- Confirm the order `paid_rm`, `balance_rm`, and `status` update in Supabase after deposit success.
- Confirm balance payment updates the order through the webhook.

## Firebase FCM

- Firebase Console > Project settings > Service accounts.
- Generate a private key JSON.
- Put `FIREBASE_SERVICE_ACCOUNT` into Render, or use `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
- Add device FCM tokens to users during app login/device registration.
- Trigger booking confirmation, diary update, new message, payment success, and pet health alert.
- Confirm notifications appear in DB and push delivery works on a real device.

## Web on Vercel

- Import the repo into Vercel.
- Set root/project to this monorepo and use `vercel.json`.
- Add `NEXT_PUBLIC_API_URL=https://YOUR_RENDER_API_DOMAIN/api/v1`.
- Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Add `STRIPE_SECRET_KEY`.
- Add `STRIPE_WEBHOOK_SECRET`.
- Deploy.
- Open the production URL and check home, services/pricing, booking, payment, orders, pets, diary, chat, auth, and host pages.

## Mobile App

- Set `EXPO_PUBLIC_API_URL=https://YOUR_RENDER_API_DOMAIN/api/v1`.
- Test against production API with Stripe test mode first.
- Test registration, login, pet profile, booking, deposit, diary, chat, final payment, review.
- Configure production app signing and push notification credentials before store submission.

## Full Business Flow

Run in staging/test mode:

1. Register owner.
2. Login owner.
3. Register or seed host.
4. Add eligible pet: dog, 1-12kg, vaccinated, no aggression, no fleas.
5. Search host.
6. Create booking.
7. Host confirms.
8. Owner pays 50% deposit.
9. Host starts boarding.
10. Host posts diary update.
11. Owner/host exchange messages.
12. Host ends boarding.
13. Owner pays final 50%.
14. Owner submits review.
15. Confirm notifications and payment records.

## Security

- Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or Firebase private key in frontend code.
- Use `NEXT_PUBLIC_` and `EXPO_PUBLIC_` only for public frontend variables.
- Rotate secrets after accidental exposure.
- Restrict CORS to real app/web domains before production.
- Keep Supabase database password and connection string private.

## Go-Live

- Switch Stripe from test keys to live keys.
- Update webhook endpoint for production domain.
- Confirm Firebase production project is used.
- Confirm Render and Vercel environment variables are production values.
- Run one live low-value payment test if allowed.
- Monitor Render logs, Stripe webhook logs, and Firebase push delivery.
