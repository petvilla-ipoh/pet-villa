# Environment Variables

Do not store secrets in GitHub. This file lists only key names and usage.

## Backend / API

| Key | Usage |
| --- | --- |
| `NODE_ENV` | Runtime environment. |
| `PORT` | API server port. |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins. |
| `DATABASE_URL` | PostgreSQL/Supabase connection string. |
| `DATABASE_SSL` | Enables SSL for production database connections. |
| `SUPABASE_ANON_KEY` | Supabase anon/public key if needed by clients/services. |
| `REDIS_URL` | Redis connection string. |
| `PAYMENT_MODE` | Payment mode, for example `stripe` or local/demo. |
| `STRIPE_SECRET_KEY` | Stripe backend secret key. |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON for server. |
| `FIREBASE_PROJECT_ID` | Firebase project ID alternative. |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email alternative. |
| `FIREBASE_PRIVATE_KEY` | Firebase private key alternative. |

## Frontend

| Key | Usage |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public API base URL for Next.js web app. |
| `EXPO_PUBLIC_API_URL` | Public API base URL for Expo/mobile app. |

## Deployment

| Key | Usage |
| --- | --- |
| `RENDER_HEALTHCHECK_PATH` | Optional deployment health check path. |

Total documented ENV keys: 18.

## Important Backup Note

`.env` exists locally and is ignored by Git. Back up real values separately before resetting a computer. Vercel/Render/Supabase/Stripe/Firebase dashboards may also hold some values, but GitHub will not.
