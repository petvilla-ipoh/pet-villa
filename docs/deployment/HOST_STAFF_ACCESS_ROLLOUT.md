# Host Staff & Access Production Rollout

Migration: `database/migrations/202608070001_create_supabase_host_staff_access.sql`

Do not execute any other migration as part of this procedure. Do not expose or paste passwords, JWTs, invite tokens, or the Supabase service-role key into SQL Editor results, screenshots, logs, or support messages.

## Audit result

The migration is prepared for manual execution against the existing Production schema.

- It runs inside one explicit transaction with lock and statement timeouts.
- It does not drop, truncate, delete, rebuild, or overwrite `auth.users`, `public.profiles`, `pets`, `orders`, or `bookings`.
- New tables and indexes use `IF NOT EXISTS`.
- Functions use `CREATE OR REPLACE`.
- Triggers and policies use deterministic `DROP IF EXISTS` plus `CREATE`.
- Existing Host/Admin profiles are seeded with `ON CONFLICT (user_id) DO UPDATE`.
- `canyonfsp@gmail.com` is forced to remain an active Owner, and the transaction aborts if that account is missing or cannot be preserved.
- The last active Owner cannot be demoted, suspended, disabled, or deleted. Owner changes are serialized to prevent concurrent removal of the final Owner.
- Owner/Admin are the only roles that can manage staff. Admin cannot modify Owner/Admin rows; only Owner can do that.
- Manager, Staff, and Viewer cannot receive `staff.view`, `staff.manage`, or `audit.view`, including through custom permission arrays.
- A non-privileged staff member can read only their own staff access row.
- Audit Log writes reject JSON keys that could contain passwords, tokens, authorization values, secrets, or service-role keys.

Idempotency assumes any previously created `host_staff_members` or `host_audit_log` table has the compatible schema defined by this migration. The preflight checks below must be clean before execution.

## A. SQL Editor execution steps

1. Open the correct Production Supabase project.
2. Open **SQL Editor** and create a new query named `staff-access-preflight`.
3. Run only the preflight SQL in section B.
4. Stop if any dependency is missing, the required-column query returns rows, the primary Owner check is not `READY`, or duplicate profile emails are returned.
5. Create a second query named `202608070001-host-staff-access`.
6. Paste the complete migration file without removing `BEGIN`, assertions, or `COMMIT`.
7. Run the complete migration once. A SQL error before `COMMIT` rolls back the whole migration.
8. Create a third query named `staff-access-verification` and run section C.
9. Deploy the matching application code only after every verification is correct.

## B. Preflight SQL (read only)

```sql
-- This is intentionally one SELECT result set so Supabase SQL Editor shows
-- every preflight check together in one table.
WITH dependencies(sort_order, object_name, present) AS (
  VALUES
    (101, 'auth.users', to_regclass('auth.users') IS NOT NULL),
    (102, 'public.profiles', to_regclass('public.profiles') IS NOT NULL),
    (103, 'public.pets', to_regclass('public.pets') IS NOT NULL),
    (104, 'public.bookings', to_regclass('public.bookings') IS NOT NULL),
    (105, 'public.orders', to_regclass('public.orders') IS NOT NULL),
    (106, 'public.host_off_days', to_regclass('public.host_off_days') IS NOT NULL),
    (107, 'public.chat_messages', to_regclass('public.chat_messages') IS NOT NULL),
    (108, 'public.pet_diary_updates', to_regclass('public.pet_diary_updates') IS NOT NULL),
    (109, 'public.reviews', to_regclass('public.reviews') IS NOT NULL),
    (110, 'public.voucher_campaigns', to_regclass('public.voucher_campaigns') IS NOT NULL),
    (111, 'public.business_settings', to_regclass('public.business_settings') IS NOT NULL),
    (112, 'storage.objects', to_regclass('storage.objects') IS NOT NULL),
    (113, 'public.set_updated_at()', to_regprocedure('public.set_updated_at()') IS NOT NULL)
),
dependency_results AS (
  SELECT
    sort_order,
    '1. Dependency'::text AS check_group,
    object_name::text AS check_name,
    CASE WHEN present THEN 'READY' ELSE 'STOP' END::text AS status,
    CASE WHEN present THEN 'Object exists' ELSE 'Required object is missing' END::text AS details
  FROM dependencies
),
required_columns(sort_order, table_schema, table_name, column_name) AS (
  VALUES
    (201, 'public', 'profiles', 'id'),
    (202, 'public', 'profiles', 'email'),
    (203, 'public', 'profiles', 'full_name'),
    (204, 'public', 'profiles', 'role'),
    (205, 'public', 'pets', 'owner_id'),
    (206, 'public', 'bookings', 'owner_id'),
    (207, 'public', 'orders', 'owner_id'),
    (208, 'public', 'chat_messages', 'owner_id'),
    (209, 'public', 'reviews', 'owner_id')
),
column_results AS (
  SELECT
    r.sort_order,
    '2. Required column'::text AS check_group,
    format('%I.%I.%I', r.table_schema, r.table_name, r.column_name)::text AS check_name,
    CASE WHEN c.column_name IS NOT NULL THEN 'READY' ELSE 'STOP' END::text AS status,
    CASE WHEN c.column_name IS NOT NULL THEN 'Column exists' ELSE 'Required column is missing' END::text AS details
  FROM required_columns r
  LEFT JOIN information_schema.columns c
    ON c.table_schema = r.table_schema
   AND c.table_name = r.table_name
   AND c.column_name = r.column_name
),
owner_summary AS (
  SELECT
    count(*)::integer AS matching_auth_users,
    count(*) FILTER (
      WHERE p.id = u.id AND p.role IN ('host', 'admin')
    )::integer AS ready_profiles,
    string_agg(
      format(
        'email=%s, profile_role=%s, auth_profile_ids_match=%s',
        lower(u.email),
        coalesce(p.role, 'MISSING'),
        CASE WHEN p.id = u.id THEN 'true' ELSE 'false' END
      ),
      '; '
    ) AS owner_details
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = 'canyonfsp@gmail.com'
),
owner_result AS (
  SELECT
    301 AS sort_order,
    '3. Primary Owner'::text AS check_group,
    'canyonfsp@gmail.com'::text AS check_name,
    CASE
      WHEN matching_auth_users = 1 AND ready_profiles = 1 THEN 'READY'
      ELSE 'STOP'
    END::text AS status,
    CASE
      WHEN matching_auth_users = 0 THEN 'No matching auth.users account was found'
      WHEN matching_auth_users > 1 THEN 'More than one matching auth.users account was found'
      ELSE coalesce(owner_details, 'Matching profile is missing')
    END::text AS details
  FROM owner_summary
),
duplicate_groups AS (
  SELECT lower(email) AS duplicate_email, count(*)::integer AS profile_count
  FROM public.profiles
  WHERE coalesce(email, '') <> ''
  GROUP BY lower(email)
  HAVING count(*) > 1
),
duplicate_result AS (
  SELECT
    401 AS sort_order,
    '4. Profile email uniqueness'::text AS check_group,
    'Duplicate lower-case profile emails'::text AS check_name,
    CASE WHEN count(*) = 0 THEN 'READY' ELSE 'STOP' END::text AS status,
    CASE
      WHEN count(*) = 0 THEN 'No duplicate profile emails'
      ELSE string_agg(format('%s (%s profiles)', duplicate_email, profile_count), '; ' ORDER BY duplicate_email)
    END::text AS details
  FROM duplicate_groups
),
existing_object_results AS (
  SELECT
    501 AS sort_order,
    '5. Existing Staff object'::text AS check_group,
    'public.host_staff_members'::text AS check_name,
    'INFO'::text AS status,
    CASE
      WHEN to_regclass('public.host_staff_members') IS NULL THEN 'Not created yet'
      ELSE 'Already exists; confirm its schema is compatible before rerunning the migration'
    END::text AS details
  UNION ALL
  SELECT
    502,
    '5. Existing Staff object',
    'public.host_audit_log',
    'INFO',
    CASE
      WHEN to_regclass('public.host_audit_log') IS NULL THEN 'Not created yet'
      ELSE 'Already exists; confirm its schema is compatible before rerunning the migration'
    END
)
SELECT check_group, check_name, status, details
FROM (
  SELECT * FROM dependency_results
  UNION ALL
  SELECT * FROM column_results
  UNION ALL
  SELECT * FROM owner_result
  UNION ALL
  SELECT * FROM duplicate_result
  UNION ALL
  SELECT * FROM existing_object_results
) AS all_checks
ORDER BY sort_order;
```

Expected preflight result: one result table containing every check. Every row in groups 1-4 must show `READY`. Group 5 is informational: `Not created yet` is normal before the first migration run; an existing object must have a compatible schema before the migration is rerun. Any `STOP` means do not execute the migration.

## C. Post-migration verification SQL (read only)

```sql
SELECT
  to_regclass('public.host_staff_members') AS staff_table,
  to_regclass('public.host_audit_log') AS audit_table;

SELECT relname, relrowsecurity
FROM pg_class
WHERE oid IN ('public.host_staff_members'::regclass, 'public.host_audit_log'::regclass)
ORDER BY relname;

SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'current_staff_access_role',
    'current_staff_has_permission',
    'current_user_is_host',
    'protect_required_host_owner',
    'reject_sensitive_host_audit_details'
  )
ORDER BY proname;

SELECT event_object_schema, event_object_table, trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'protect_required_host_owner_update',
    'protect_required_host_owner_delete',
    'set_host_staff_members_updated_at',
    'reject_sensitive_host_audit_details_write'
  )
ORDER BY trigger_name, event_manipulation;

SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE policyname LIKE 'host_staff_%'
   OR policyname LIKE 'host_audit_%'
   OR policyname LIKE 'staff_permission_%'
ORDER BY schemaname, tablename, policyname;

SELECT user_id, lower(email) AS email, access_role, status
FROM public.host_staff_members
WHERE lower(email) = 'canyonfsp@gmail.com';

SELECT count(*) AS active_owner_count
FROM public.host_staff_members
WHERE access_role = 'owner' AND status = 'active';

SELECT id, email, access_role, permissions
FROM public.host_staff_members
WHERE access_role NOT IN ('owner', 'admin')
  AND permissions && ARRAY['staff.view', 'staff.manage', 'audit.view']::text[];

SELECT id, action, created_at
FROM public.host_audit_log
WHERE details::text ~* '"(password|current_password|new_password|token|access_token|refresh_token|secret|service_role_key|authorization)"[[:space:]]*:';
```

Expected result: both tables exist with RLS enabled; five functions appear; four trigger names appear (update/insert event rows may make the output longer); all policies appear; the primary Owner is `owner/active`; active Owner count is at least 1; the last two safety queries return zero rows.

## D. Expected database objects

Tables:

- `public.host_staff_members`
- `public.host_audit_log`

Functions:

- `public.current_staff_access_role()`
- `public.current_staff_has_permission(text)`
- `public.current_user_is_host()`
- `public.protect_required_host_owner()`
- `public.reject_sensitive_host_audit_details()`

Triggers:

- `protect_required_host_owner_update`
- `protect_required_host_owner_delete`
- `set_host_staff_members_updated_at`
- `reject_sensitive_host_audit_details_write`

RLS policies: four `host_staff_*` policies, one `host_audit_*` policy, and restrictive `staff_permission_*` policies for profiles, pets, bookings, orders, calendar, chat, Private Diary, reviews, vouchers, business settings, pet photos, and Host-managed media.

## E. Stop conditions

- Stop before migration if preflight has any missing dependency/column, duplicate profile email, or the primary Owner is not `READY`.
- Stop immediately on any migration SQL error. Do not run only the remaining statements and do not manually insert staff rows. The transaction should roll back.
- Stop before deployment if RLS is disabled, any expected function/trigger/policy is missing, the primary Owner is not active, active Owner count is below 1, a non-privileged row has staff/audit permissions, or Audit Log contains a forbidden key.
- Preserve the exact PostgreSQL error type and statement location, but never include credentials or tokens in the report.

## F. Deployment after SQL succeeds

1. Run `npm run typecheck` locally.
2. Run `npm run test:staff-access` locally.
3. Run `npm run build` locally.
4. Publish the exact code revision containing this migration, `apps/web/app/lib/staffAccess.ts`, Staff API routes, and Staff UI.
5. Redeploy Production in Vercel without printing environment values.
6. Confirm the Production deployment commit/version matches the tested revision.
7. Do not rerun unrelated migrations.

## G. Production test checklist

- Owner logs in through `/host/login` and can open **Staff & Access**.
- `canyonfsp@gmail.com` appears as Active Owner.
- Owner can create/invite Manager, Staff, and Viewer accounts.
- Invite recipient receives the Supabase email, accepts it, sets a password, and logs in through the same Host Login.
- Manager, Staff, and Viewer see different menus and controls according to their presets.
- Hidden menu tests are repeated against APIs; forbidden calls return HTTP 403.
- Manager/Staff/Viewer cannot open Staff & Access or read other staff permission rows.
- Owner can suspend a test staff account; its existing/new Host requests return 403.
- Owner can reactivate it; access returns according to its role.
- The final active Owner cannot be disabled, suspended, deleted, or demoted.
- Admin cannot modify an Owner row; only Owner can manage Owner/Admin roles.
- Invite, role, permission, suspend, reactivate, and disable actions create Audit Log rows without credentials.
- A normal customer remains unable to enter `/host` and receives 403 from Host APIs.
