# Supabase PostgreSQL Setup

## 1. Create the Project

1. Go to [Supabase](https://supabase.com).
2. Create a new project.
3. Save the database password somewhere secure.
4. Wait until the project is fully provisioned.

## 2. Get `DATABASE_URL`

1. Open your Supabase project dashboard.
2. Open the database connection panel. Supabase's docs call this the Postgres connection string area.
3. Copy the pooled connection string for server apps when deploying to Render, or the direct connection string for local/admin migration work.
4. Replace `[YOUR-PASSWORD]` with the database password.
5. Put it into Render as `DATABASE_URL`.

Recommended production format:

```text
postgres://postgres.PROJECT_REF:YOUR_PASSWORD@aws-...pooler.supabase.com:6543/postgres
```

Local/admin direct format usually looks like:

```text
postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

## 3. Run Migrations With Supabase SQL Editor

This is the easiest path if you do not want to install the Supabase CLI.

1. In Supabase Dashboard, open SQL Editor.
2. Open [202605270001_create_pet_villa_core.sql](../../database/migrations/202605270001_create_pet_villa_core.sql).
3. Copy the full SQL and run it.
4. Open [202605270002_add_host_availability_blocks.sql](../../database/migrations/202605270002_add_host_availability_blocks.sql).
5. Copy the full SQL and run it.
6. Optional for development: open [dev_seed.sql](../../database/seeds/dev_seed.sql), copy and run it.

## 4. Run Migrations With `psql`

Use this if you have PostgreSQL tools installed:

```bash
psql "$DATABASE_URL" -f database/migrations/202605270001_create_pet_villa_core.sql
psql "$DATABASE_URL" -f database/migrations/202605270002_add_host_availability_blocks.sql
```

Optional seed:

```bash
psql "$DATABASE_URL" -f database/seeds/dev_seed.sql
```

## 5. Run Migrations With Supabase CLI

Use this if you prefer migration history managed by Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
mkdir -p supabase/migrations
copy database/migrations/202605270001_create_pet_villa_core.sql supabase/migrations/202605270001_create_pet_villa_core.sql
copy database/migrations/202605270002_add_host_availability_blocks.sql supabase/migrations/202605270002_add_host_availability_blocks.sql
supabase db push
```

On macOS/Linux, replace `copy` with `cp`.

## 6. Verify Tables

In Supabase Table Editor, confirm these tables exist:

- `users`
- `hosts`
- `pets`
- `bookings`
- `booking_status_events`
- `reviews`
- `messages`
- `diary_entries`
- `notifications`
- `payments`
- `host_availability_blocks`

## 7. Set API Environment Variables

In Render:

```text
DATABASE_URL=your Supabase connection string
DATABASE_SSL=true
```

Then redeploy the API.
