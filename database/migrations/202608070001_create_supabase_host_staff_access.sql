-- Host Staff & Access Management. Idempotent and safe to run after the Host operations migration.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

CREATE TABLE IF NOT EXISTS public.host_staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  access_role text NOT NULL DEFAULT 'staff'
    CHECK (access_role IN ('owner', 'admin', 'manager', 'staff', 'viewer')),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'suspended', 'disabled')),
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_host_staff_members_email_lower
  ON public.host_staff_members (lower(email));
CREATE INDEX IF NOT EXISTS idx_host_staff_members_status
  ON public.host_staff_members (status);

CREATE TABLE IF NOT EXISTS public.host_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT 'staff',
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_audit_log_created_at
  ON public.host_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_host_audit_log_target_user
  ON public.host_audit_log (target_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_staff_access_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT access_role
      FROM public.host_staff_members
      WHERE user_id = auth.uid() AND status = 'active'
      LIMIT 1
    ),
    (
      SELECT CASE WHEN role = 'admin' THEN 'admin' WHEN role = 'host' THEN 'manager' END
      FROM public.profiles
      WHERE id = auth.uid() AND role IN ('host', 'admin')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_staff_has_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN required_permission IN ('staff.view', 'staff.manage', 'audit.view') THEN
      public.current_staff_access_role() IN ('owner', 'admin')
    ELSE
      EXISTS (
        SELECT 1
        FROM public.host_staff_members
        WHERE user_id = auth.uid()
          AND status = 'active'
          AND (
            access_role IN ('owner', 'admin')
            OR required_permission = ANY(permissions)
          )
      ) OR (
        NOT EXISTS (SELECT 1 FROM public.host_staff_members WHERE user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('host', 'admin'))
      )
  END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_host()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('host', 'admin')
      AND (
        NOT EXISTS (SELECT 1 FROM public.host_staff_members s WHERE s.user_id = p.id)
        OR EXISTS (
          SELECT 1 FROM public.host_staff_members s
          WHERE s.user_id = p.id AND s.status = 'active'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_required_host_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_active_owners integer;
BEGIN
  IF OLD.access_role = 'owner' AND OLD.status = 'active'
    AND (
      TG_OP = 'DELETE'
      OR (TG_OP = 'UPDATE' AND (NEW.access_role <> 'owner' OR NEW.status <> 'active'))
    ) THEN
    LOCK TABLE public.host_staff_members IN SHARE ROW EXCLUSIVE MODE;
  END IF;

  IF lower(OLD.email) = 'canyonfsp@gmail.com' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'The primary Pet Villa owner cannot be demoted, suspended, disabled, or deleted.';
    ELSIF NEW.access_role <> 'owner'
      OR NEW.status <> 'active'
      OR lower(NEW.email) <> 'canyonfsp@gmail.com'
      OR NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'The primary Pet Villa owner cannot be demoted, suspended, disabled, or deleted.';
    END IF;
  END IF;

  IF OLD.access_role = 'owner' AND OLD.status = 'active' AND TG_OP = 'DELETE' THEN
    SELECT count(*) INTO remaining_active_owners
    FROM public.host_staff_members
    WHERE access_role = 'owner' AND status = 'active' AND id <> OLD.id;
    IF remaining_active_owners < 1 THEN
      RAISE EXCEPTION 'At least one active Owner / Admin is required.';
    END IF;
  ELSIF OLD.access_role = 'owner' AND OLD.status = 'active' AND TG_OP = 'UPDATE'
    AND (NEW.access_role <> 'owner' OR NEW.status <> 'active') THEN
    SELECT count(*) INTO remaining_active_owners
    FROM public.host_staff_members
    WHERE access_role = 'owner' AND status = 'active' AND id <> OLD.id;
    IF remaining_active_owners < 1 THEN
      RAISE EXCEPTION 'At least one active Owner / Admin is required.';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_sensitive_host_audit_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.details::text ~* '"(password|current_password|new_password|token|access_token|refresh_token|secret|service_role_key|authorization)"[[:space:]]*:' THEN
    RAISE EXCEPTION 'Audit Log details cannot contain credentials, tokens, or secrets.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_required_host_owner_update ON public.host_staff_members;
CREATE TRIGGER protect_required_host_owner_update
  BEFORE UPDATE ON public.host_staff_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_required_host_owner();

DROP TRIGGER IF EXISTS protect_required_host_owner_delete ON public.host_staff_members;
CREATE TRIGGER protect_required_host_owner_delete
  BEFORE DELETE ON public.host_staff_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_required_host_owner();

DROP TRIGGER IF EXISTS set_host_staff_members_updated_at ON public.host_staff_members;
CREATE TRIGGER set_host_staff_members_updated_at
  BEFORE UPDATE ON public.host_staff_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS reject_sensitive_host_audit_details_write ON public.host_audit_log;
CREATE TRIGGER reject_sensitive_host_audit_details_write
  BEFORE INSERT OR UPDATE ON public.host_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_sensitive_host_audit_details();

ALTER TABLE public.host_staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "host_staff_select_authorized" ON public.host_staff_members;
CREATE POLICY "host_staff_select_authorized"
  ON public.host_staff_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_staff_access_role() IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "host_staff_insert_managers" ON public.host_staff_members;
CREATE POLICY "host_staff_insert_managers"
  ON public.host_staff_members FOR INSERT TO authenticated
  WITH CHECK (
    public.current_staff_access_role() = 'owner'
    OR (
      public.current_staff_access_role() = 'admin'
      AND access_role NOT IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "host_staff_update_managers" ON public.host_staff_members;
CREATE POLICY "host_staff_update_managers"
  ON public.host_staff_members FOR UPDATE TO authenticated
  USING (
    public.current_staff_access_role() = 'owner'
    OR (
      public.current_staff_access_role() = 'admin'
      AND access_role NOT IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.current_staff_access_role() = 'owner'
    OR (
      public.current_staff_access_role() = 'admin'
      AND access_role NOT IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "host_staff_delete_managers" ON public.host_staff_members;
CREATE POLICY "host_staff_delete_managers"
  ON public.host_staff_members FOR DELETE TO authenticated
  USING (
    public.current_staff_access_role() = 'owner'
    OR (
      public.current_staff_access_role() = 'admin'
      AND access_role NOT IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "host_audit_select_authorized" ON public.host_audit_log;
CREATE POLICY "host_audit_select_authorized"
  ON public.host_audit_log FOR SELECT TO authenticated
  USING (public.current_staff_access_role() IN ('owner', 'admin'));

-- Existing Host policies remain permissive for backwards compatibility. These
-- restrictive policies add the permission check to each sensitive write path.
DROP POLICY IF EXISTS "staff_permission_profiles_update" ON public.profiles;
CREATE POLICY "staff_permission_profiles_update" ON public.profiles AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.current_staff_has_permission('crm.manage'))
  WITH CHECK (auth.uid() = id OR public.current_staff_has_permission('crm.manage'));

DROP POLICY IF EXISTS "staff_permission_pets_insert" ON public.pets;
CREATE POLICY "staff_permission_pets_insert" ON public.pets AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('crm.manage'));
DROP POLICY IF EXISTS "staff_permission_pets_update" ON public.pets;
CREATE POLICY "staff_permission_pets_update" ON public.pets AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.current_staff_has_permission('crm.manage'))
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('crm.manage'));
DROP POLICY IF EXISTS "staff_permission_pets_delete" ON public.pets;
CREATE POLICY "staff_permission_pets_delete" ON public.pets AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.current_staff_has_permission('crm.manage'));

DROP POLICY IF EXISTS "staff_permission_bookings_insert" ON public.bookings;
CREATE POLICY "staff_permission_bookings_insert" ON public.bookings AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('bookings.manage'));
DROP POLICY IF EXISTS "staff_permission_bookings_update" ON public.bookings;
CREATE POLICY "staff_permission_bookings_update" ON public.bookings AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.current_staff_has_permission('bookings.manage'))
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('bookings.manage'));

DROP POLICY IF EXISTS "staff_permission_orders_insert" ON public.orders;
CREATE POLICY "staff_permission_orders_insert" ON public.orders AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('bookings.manage'));
DROP POLICY IF EXISTS "staff_permission_orders_update" ON public.orders;
CREATE POLICY "staff_permission_orders_update" ON public.orders AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.current_staff_has_permission('bookings.manage')
    OR public.current_staff_has_permission('payments.manage')
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR public.current_staff_has_permission('bookings.manage')
    OR public.current_staff_has_permission('payments.manage')
  );
DROP POLICY IF EXISTS "staff_permission_orders_delete" ON public.orders;
CREATE POLICY "staff_permission_orders_delete" ON public.orders AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.current_staff_has_permission('bookings.manage'));

DROP POLICY IF EXISTS "staff_permission_calendar_insert" ON public.host_off_days;
CREATE POLICY "staff_permission_calendar_insert" ON public.host_off_days AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (public.current_staff_has_permission('calendar.manage'));
DROP POLICY IF EXISTS "staff_permission_calendar_update" ON public.host_off_days;
CREATE POLICY "staff_permission_calendar_update" ON public.host_off_days AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.current_staff_has_permission('calendar.manage'))
  WITH CHECK (public.current_staff_has_permission('calendar.manage'));
DROP POLICY IF EXISTS "staff_permission_calendar_delete" ON public.host_off_days;
CREATE POLICY "staff_permission_calendar_delete" ON public.host_off_days AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.current_staff_has_permission('calendar.manage'));

DROP POLICY IF EXISTS "staff_permission_chat_insert" ON public.chat_messages;
CREATE POLICY "staff_permission_chat_insert" ON public.chat_messages AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('inbox.manage'));
DROP POLICY IF EXISTS "staff_permission_chat_update" ON public.chat_messages;
CREATE POLICY "staff_permission_chat_update" ON public.chat_messages AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.current_staff_has_permission('inbox.manage'))
  WITH CHECK (public.current_staff_has_permission('inbox.manage'));
DROP POLICY IF EXISTS "staff_permission_chat_delete" ON public.chat_messages;
CREATE POLICY "staff_permission_chat_delete" ON public.chat_messages AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.current_staff_has_permission('inbox.manage'));

DROP POLICY IF EXISTS "staff_permission_diary_insert" ON public.pet_diary_updates;
CREATE POLICY "staff_permission_diary_insert" ON public.pet_diary_updates AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (public.current_staff_has_permission('diary.manage'));
DROP POLICY IF EXISTS "staff_permission_diary_update" ON public.pet_diary_updates;
CREATE POLICY "staff_permission_diary_update" ON public.pet_diary_updates AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.current_staff_has_permission('diary.manage'))
  WITH CHECK (public.current_staff_has_permission('diary.manage'));
DROP POLICY IF EXISTS "staff_permission_diary_delete" ON public.pet_diary_updates;
CREATE POLICY "staff_permission_diary_delete" ON public.pet_diary_updates AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.current_staff_has_permission('diary.manage'));

DROP POLICY IF EXISTS "staff_permission_reviews_insert" ON public.reviews;
CREATE POLICY "staff_permission_reviews_insert" ON public.reviews AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('reviews.manage'));
DROP POLICY IF EXISTS "staff_permission_reviews_update" ON public.reviews;
CREATE POLICY "staff_permission_reviews_update" ON public.reviews AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.current_staff_has_permission('reviews.manage'))
  WITH CHECK (auth.uid() = owner_id OR public.current_staff_has_permission('reviews.manage'));
DROP POLICY IF EXISTS "staff_permission_reviews_delete" ON public.reviews;
CREATE POLICY "staff_permission_reviews_delete" ON public.reviews AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.current_staff_has_permission('reviews.manage'));

DROP POLICY IF EXISTS "staff_permission_vouchers_insert" ON public.voucher_campaigns;
CREATE POLICY "staff_permission_vouchers_insert" ON public.voucher_campaigns AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (public.current_staff_has_permission('vouchers.manage'));
DROP POLICY IF EXISTS "staff_permission_vouchers_update" ON public.voucher_campaigns;
CREATE POLICY "staff_permission_vouchers_update" ON public.voucher_campaigns AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.current_staff_has_permission('vouchers.manage'))
  WITH CHECK (public.current_staff_has_permission('vouchers.manage'));
DROP POLICY IF EXISTS "staff_permission_vouchers_delete" ON public.voucher_campaigns;
CREATE POLICY "staff_permission_vouchers_delete" ON public.voucher_campaigns AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.current_staff_has_permission('vouchers.manage'));

DROP POLICY IF EXISTS "staff_permission_settings_insert" ON public.business_settings;
CREATE POLICY "staff_permission_settings_insert" ON public.business_settings AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_staff_has_permission('settings.manage')
    OR public.current_staff_has_permission('vouchers.manage')
  );
DROP POLICY IF EXISTS "staff_permission_settings_update" ON public.business_settings;
CREATE POLICY "staff_permission_settings_update" ON public.business_settings AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    public.current_staff_has_permission('settings.manage')
    OR public.current_staff_has_permission('vouchers.manage')
  )
  WITH CHECK (
    public.current_staff_has_permission('settings.manage')
    OR public.current_staff_has_permission('vouchers.manage')
  );

DROP POLICY IF EXISTS "staff_permission_pet_photos_insert" ON storage.objects;
CREATE POLICY "staff_permission_pet_photos_insert" ON storage.objects AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id <> 'pet-photos'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_staff_has_permission('crm.manage')
  );
DROP POLICY IF EXISTS "staff_permission_pet_photos_update" ON storage.objects;
CREATE POLICY "staff_permission_pet_photos_update" ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    bucket_id <> 'pet-photos'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_staff_has_permission('crm.manage')
  )
  WITH CHECK (
    bucket_id <> 'pet-photos'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_staff_has_permission('crm.manage')
  );
DROP POLICY IF EXISTS "staff_permission_pet_photos_delete" ON storage.objects;
CREATE POLICY "staff_permission_pet_photos_delete" ON storage.objects AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (
    bucket_id <> 'pet-photos'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_staff_has_permission('crm.manage')
  );

DROP POLICY IF EXISTS "staff_permission_host_media_insert" ON storage.objects;
CREATE POLICY "staff_permission_host_media_insert" ON storage.objects AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    (bucket_id <> 'pet-diary-media' OR public.current_staff_has_permission('diary.manage'))
    AND (bucket_id <> 'gallery-photos' OR public.current_staff_has_permission('settings.manage'))
    AND (bucket_id <> 'business-assets' OR public.current_staff_has_permission('settings.manage'))
  );
DROP POLICY IF EXISTS "staff_permission_host_media_update" ON storage.objects;
CREATE POLICY "staff_permission_host_media_update" ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    (bucket_id <> 'pet-diary-media' OR public.current_staff_has_permission('diary.manage'))
    AND (bucket_id <> 'gallery-photos' OR public.current_staff_has_permission('settings.manage'))
    AND (bucket_id <> 'business-assets' OR public.current_staff_has_permission('settings.manage'))
  )
  WITH CHECK (
    (bucket_id <> 'pet-diary-media' OR public.current_staff_has_permission('diary.manage'))
    AND (bucket_id <> 'gallery-photos' OR public.current_staff_has_permission('settings.manage'))
    AND (bucket_id <> 'business-assets' OR public.current_staff_has_permission('settings.manage'))
  );
DROP POLICY IF EXISTS "staff_permission_host_media_delete" ON storage.objects;
CREATE POLICY "staff_permission_host_media_delete" ON storage.objects AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (
    (bucket_id <> 'pet-diary-media' OR public.current_staff_has_permission('diary.manage'))
    AND (bucket_id <> 'gallery-photos' OR public.current_staff_has_permission('settings.manage'))
    AND (bucket_id <> 'business-assets' OR public.current_staff_has_permission('settings.manage'))
  );

INSERT INTO public.host_staff_members (user_id, email, display_name, access_role, status, permissions)
SELECT
  p.id,
  p.email,
  COALESCE(p.full_name, split_part(p.email, '@', 1), 'Pet Villa Staff'),
  CASE
    WHEN lower(p.email) = 'canyonfsp@gmail.com' THEN 'owner'
    WHEN p.role = 'admin' THEN 'admin'
    ELSE 'manager'
  END,
  'active',
  CASE
    WHEN lower(p.email) = 'canyonfsp@gmail.com' OR p.role = 'admin' THEN ARRAY[]::text[]
    ELSE ARRAY[
      'dashboard.view',
      'bookings.view', 'bookings.manage',
      'calendar.view', 'calendar.manage',
      'crm.view', 'crm.manage',
      'inbox.view', 'inbox.manage',
      'diary.view', 'diary.manage',
      'payments.view', 'payments.manage',
      'vouchers.view', 'vouchers.manage',
      'reviews.view', 'reviews.manage',
      'notifications.view', 'notifications.manage',
      'settings.view'
    ]::text[]
  END
FROM public.profiles p
WHERE p.role IN ('host', 'admin') AND p.email <> ''
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  display_name = CASE WHEN public.host_staff_members.display_name = '' THEN EXCLUDED.display_name ELSE public.host_staff_members.display_name END,
  access_role = CASE WHEN lower(EXCLUDED.email) = 'canyonfsp@gmail.com' THEN 'owner' ELSE public.host_staff_members.access_role END,
  status = CASE WHEN lower(EXCLUDED.email) = 'canyonfsp@gmail.com' THEN 'active' ELSE public.host_staff_members.status END,
  updated_at = now();

-- Remove privileged access-management permissions from any non-privileged row
-- left by an interrupted or older execution of this migration.
UPDATE public.host_staff_members
SET permissions = ARRAY(
  SELECT permission
  FROM unnest(permissions) AS permission
  WHERE permission NOT IN ('staff.view', 'staff.manage', 'audit.view')
), updated_at = now()
WHERE access_role NOT IN ('owner', 'admin')
  AND permissions && ARRAY['staff.view', 'staff.manage', 'audit.view']::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.host_staff_members
    WHERE lower(email) = 'canyonfsp@gmail.com'
      AND access_role = 'owner'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Primary owner canyonfsp@gmail.com was not preserved as an active Owner.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.host_staff_members
    WHERE access_role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'At least one active Owner is required.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.host_audit_log
    WHERE details::text ~* '"(password|current_password|new_password|token|access_token|refresh_token|secret|service_role_key|authorization)"[[:space:]]*:'
  ) THEN
    RAISE EXCEPTION 'Existing Audit Log details contain a credential, token, or secret key.';
  END IF;
END;
$$;

COMMIT;
