-- Pet Villa Host operations, shared business settings, and payment assets.

DROP POLICY IF EXISTS "profiles_update_own_or_host" ON public.profiles;
CREATE POLICY "profiles_update_own_or_host"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.current_user_is_host())
  WITH CHECK (auth.uid() = id OR public.current_user_is_host());

DROP POLICY IF EXISTS "pets_insert_own_or_host" ON public.pets;
CREATE POLICY "pets_insert_own_or_host"
  ON public.pets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "pets_update_own_or_host" ON public.pets;
CREATE POLICY "pets_update_own_or_host"
  ON public.pets FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.current_user_is_host())
  WITH CHECK (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "pets_delete_own_or_host" ON public.pets;
CREATE POLICY "pets_delete_own_or_host"
  ON public.pets FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "pet_photos_insert_owner_or_host" ON storage.objects;
CREATE POLICY "pet_photos_insert_owner_or_host"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_is_host())
  );

DROP POLICY IF EXISTS "pet_photos_update_owner_or_host" ON storage.objects;
CREATE POLICY "pet_photos_update_owner_or_host"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_is_host())
  )
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_is_host())
  );

DROP POLICY IF EXISTS "pet_photos_delete_owner_or_host" ON storage.objects;
CREATE POLICY "pet_photos_delete_owner_or_host"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_is_host())
  );

DROP POLICY IF EXISTS "bookings_select_own_or_host" ON public.bookings;
CREATE POLICY "bookings_select_own_or_host"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "bookings_insert_own_or_host" ON public.bookings;
CREATE POLICY "bookings_insert_own_or_host"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "bookings_update_own_or_host" ON public.bookings;
CREATE POLICY "bookings_update_own_or_host"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.current_user_is_host())
  WITH CHECK (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "orders_insert_own_or_host" ON public.orders;
CREATE POLICY "orders_insert_own_or_host"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "orders_delete_own_or_host" ON public.orders;
CREATE POLICY "orders_delete_own_or_host"
  ON public.orders FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.current_user_is_host());

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN ('pending_verification', 'balance', 'active', 'confirmed', 'staying', 'awaiting_checkout', 'ready_pickup', 'completed', 'cancelled')
  );

CREATE TABLE IF NOT EXISTS public.business_settings (
  id text PRIMARY KEY DEFAULT 'pet-villa',
  boarding_rate_rm numeric(10,2) NOT NULL DEFAULT 35,
  daycare_rate_rm numeric(10,2) NOT NULL DEFAULT 5,
  account_name text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '601163830339',
  notification_sound boolean NOT NULL DEFAULT true,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  payment_qr_url text,
  payment_qr_path text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_settings_select_public" ON public.business_settings;
CREATE POLICY "business_settings_select_public"
  ON public.business_settings FOR SELECT
  TO anon, authenticated
  USING (id = 'pet-villa');

DROP POLICY IF EXISTS "business_settings_insert_host" ON public.business_settings;
CREATE POLICY "business_settings_insert_host"
  ON public.business_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "business_settings_update_host" ON public.business_settings;
CREATE POLICY "business_settings_update_host"
  ON public.business_settings FOR UPDATE
  TO authenticated
  USING (public.current_user_is_host())
  WITH CHECK (public.current_user_is_host());

DROP TRIGGER IF EXISTS set_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER set_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.business_settings (id, account_name, bank_name, account_number)
VALUES ('pet-villa', 'SAM KAH YEE', 'Bank Transfer', 'Pending setup')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  10485760,
  ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "business_assets_select_public" ON storage.objects;
CREATE POLICY "business_assets_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "business_assets_insert_host" ON storage.objects;
CREATE POLICY "business_assets_insert_host"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business-assets' AND public.current_user_is_host());

DROP POLICY IF EXISTS "business_assets_update_host" ON storage.objects;
CREATE POLICY "business_assets_update_host"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'business-assets' AND public.current_user_is_host())
  WITH CHECK (bucket_id = 'business-assets' AND public.current_user_is_host());

DROP POLICY IF EXISTS "business_assets_delete_host" ON storage.objects;
CREATE POLICY "business_assets_delete_host"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'business-assets' AND public.current_user_is_host());
