-- Pet Villa: customer-specific pet diary updates
-- Host staff can publish care notes and private media to the matching owner/order/pet.

CREATE TABLE IF NOT EXISTS public.pet_diary_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  pet_id text NOT NULL DEFAULT '',
  pet_name text NOT NULL DEFAULT 'Pet',
  customer_name text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT 'Happy & comfortable',
  meal_notes text NOT NULL DEFAULT '',
  water_notes text NOT NULL DEFAULT '',
  activity_notes text NOT NULL DEFAULT '',
  toilet_notes text NOT NULL DEFAULT '',
  health_notes text NOT NULL DEFAULT '',
  medication_notes text NOT NULL DEFAULT '',
  care_notes text NOT NULL DEFAULT '',
  reminder_notes text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  health_alert boolean NOT NULL DEFAULT false,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_diary_updates
  ADD COLUMN IF NOT EXISTS water_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS toilet_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS health_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medication_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS care_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reminder_notes text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'pet_diary_owner_order_fk'
       AND conrelid = 'public.pet_diary_updates'::regclass
  ) THEN
    ALTER TABLE public.pet_diary_updates
      ADD CONSTRAINT pet_diary_owner_order_fk
      FOREIGN KEY (owner_id, order_id)
      REFERENCES public.orders(owner_id, order_id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS pet_diary_owner_created_idx
  ON public.pet_diary_updates(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pet_diary_order_created_idx
  ON public.pet_diary_updates(owner_id, order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pet_diary_pet_created_idx
  ON public.pet_diary_updates(owner_id, pet_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_pet_diary_order_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_order public.orders%ROWTYPE;
BEGIN
  SELECT *
    INTO matching_order
    FROM public.orders
   WHERE owner_id = NEW.owner_id
     AND order_id = NEW.order_id
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Diary update requires an order belonging to the selected customer.';
  END IF;

  IF matching_order.status NOT IN ('balance', 'confirmed', 'active', 'staying', 'awaiting_checkout', 'ready_pickup', 'completed') THEN
    RAISE EXCEPTION 'Diary updates are not allowed for order status %.', matching_order.status;
  END IF;

  IF NEW.booking_id IS NOT NULL AND matching_order.booking_id IS DISTINCT FROM NEW.booking_id THEN
    RAISE EXCEPTION 'Diary booking does not match the selected order.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(COALESCE(matching_order.pets, '[]'::jsonb)) AS pet
     WHERE COALESCE(pet->>'id', '') = NEW.pet_id
        OR lower(COALESCE(pet->>'name', '')) = lower(NEW.pet_name)
  ) THEN
    RAISE EXCEPTION 'Diary pet does not belong to the selected order.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_pet_diary_order_eligibility() FROM PUBLIC;

DROP TRIGGER IF EXISTS validate_pet_diary_order ON public.pet_diary_updates;
CREATE TRIGGER validate_pet_diary_order
  BEFORE INSERT OR UPDATE
  ON public.pet_diary_updates
  FOR EACH ROW EXECUTE FUNCTION public.validate_pet_diary_order_eligibility();

ALTER TABLE public.pet_diary_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_diary_select_owner_or_host" ON public.pet_diary_updates;
CREATE POLICY "pet_diary_select_owner_or_host"
  ON public.pet_diary_updates FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_host()
    OR (
      auth.uid() = owner_id
      AND EXISTS (
        SELECT 1 FROM public.orders
         WHERE orders.owner_id = pet_diary_updates.owner_id
           AND orders.order_id = pet_diary_updates.order_id
           AND orders.status IN ('balance', 'confirmed', 'active', 'staying', 'awaiting_checkout', 'ready_pickup', 'completed')
      )
    )
  );

DROP POLICY IF EXISTS "pet_diary_insert_host" ON public.pet_diary_updates;
CREATE POLICY "pet_diary_insert_host"
  ON public.pet_diary_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_is_host()
    AND EXISTS (
      SELECT 1 FROM public.orders
       WHERE orders.owner_id = pet_diary_updates.owner_id
         AND orders.order_id = pet_diary_updates.order_id
         AND orders.status IN ('balance', 'confirmed', 'active', 'staying', 'awaiting_checkout', 'ready_pickup', 'completed')
    )
  );

DROP POLICY IF EXISTS "pet_diary_update_host" ON public.pet_diary_updates;
CREATE POLICY "pet_diary_update_host"
  ON public.pet_diary_updates FOR UPDATE
  TO authenticated
  USING (public.current_user_is_host())
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "pet_diary_delete_host" ON public.pet_diary_updates;
CREATE POLICY "pet_diary_delete_host"
  ON public.pet_diary_updates FOR DELETE
  TO authenticated
  USING (public.current_user_is_host());

DROP TRIGGER IF EXISTS set_pet_diary_updates_updated_at ON public.pet_diary_updates;
CREATE TRIGGER set_pet_diary_updates_updated_at
  BEFORE UPDATE ON public.pet_diary_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-diary-media',
  'pet-diary-media',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "pet_diary_media_select_owner_or_host" ON storage.objects;
CREATE POLICY "pet_diary_media_select_owner_or_host"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pet-diary-media'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      AND EXISTS (
        SELECT 1 FROM public.orders
         WHERE orders.owner_id = auth.uid()
           AND orders.order_id = (storage.foldername(name))[2]
           AND orders.status IN ('balance', 'confirmed', 'active', 'staying', 'awaiting_checkout', 'ready_pickup', 'completed')
      )
      OR public.current_user_is_host()
    )
  );

DROP POLICY IF EXISTS "pet_diary_media_insert_host" ON storage.objects;
CREATE POLICY "pet_diary_media_insert_host"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pet-diary-media'
    AND public.current_user_is_host()
    AND EXISTS (
      SELECT 1 FROM public.orders
       WHERE orders.owner_id::text = (storage.foldername(name))[1]
         AND orders.order_id = (storage.foldername(name))[2]
         AND orders.status IN ('balance', 'confirmed', 'active', 'staying', 'awaiting_checkout', 'ready_pickup', 'completed')
    )
  );

DROP POLICY IF EXISTS "pet_diary_media_update_host" ON storage.objects;
CREATE POLICY "pet_diary_media_update_host"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pet-diary-media' AND public.current_user_is_host())
  WITH CHECK (bucket_id = 'pet-diary-media' AND public.current_user_is_host());

DROP POLICY IF EXISTS "pet_diary_media_delete_host" ON storage.objects;
CREATE POLICY "pet_diary_media_delete_host"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pet-diary-media' AND public.current_user_is_host());
