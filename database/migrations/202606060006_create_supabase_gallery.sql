-- Pet Villa: Supabase Gallery Migration
-- 202606060006_create_supabase_gallery.sql

CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pet_name text NOT NULL,
  breed text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '/hero-dogs.png',
  storage_path text,
  visible_on_home boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT '#f0b46e',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_photos_visible_created_idx
  ON public.gallery_photos(visible_on_home, created_at DESC);

CREATE INDEX IF NOT EXISTS gallery_photos_created_idx
  ON public.gallery_photos(created_at DESC);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gallery_photos_select_public" ON public.gallery_photos;
CREATE POLICY "gallery_photos_select_public"
  ON public.gallery_photos FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "gallery_photos_insert_host" ON public.gallery_photos;
CREATE POLICY "gallery_photos_insert_host"
  ON public.gallery_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "gallery_photos_update_host" ON public.gallery_photos;
CREATE POLICY "gallery_photos_update_host"
  ON public.gallery_photos FOR UPDATE
  TO authenticated
  USING (public.current_user_is_host())
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "gallery_photos_delete_host" ON public.gallery_photos;
CREATE POLICY "gallery_photos_delete_host"
  ON public.gallery_photos FOR DELETE
  TO authenticated
  USING (public.current_user_is_host());

DROP TRIGGER IF EXISTS set_gallery_photos_updated_at ON public.gallery_photos;
CREATE TRIGGER set_gallery_photos_updated_at
  BEFORE UPDATE ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
VALUES (
  'gallery-photos',
  'gallery-photos',
  true,
  10485760
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "gallery_photos_storage_select_public" ON storage.objects;
CREATE POLICY "gallery_photos_storage_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'gallery-photos');

DROP POLICY IF EXISTS "gallery_photos_storage_insert_host" ON storage.objects;
CREATE POLICY "gallery_photos_storage_insert_host"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gallery-photos'
    AND public.current_user_is_host()
  );

DROP POLICY IF EXISTS "gallery_photos_storage_update_host" ON storage.objects;
CREATE POLICY "gallery_photos_storage_update_host"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gallery-photos'
    AND public.current_user_is_host()
  )
  WITH CHECK (
    bucket_id = 'gallery-photos'
    AND public.current_user_is_host()
  );

DROP POLICY IF EXISTS "gallery_photos_storage_delete_host" ON storage.objects;
CREATE POLICY "gallery_photos_storage_delete_host"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gallery-photos'
    AND public.current_user_is_host()
  );
