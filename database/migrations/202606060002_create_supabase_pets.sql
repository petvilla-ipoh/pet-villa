CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL DEFAULT 'dog',
  breed text NOT NULL DEFAULT '',
  weight_kg numeric(5,2),
  age_text text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  sex text DEFAULT 'unknown',
  vaccine_status text NOT NULL DEFAULT 'unknown',
  vaccinated boolean NOT NULL DEFAULT false,
  neutered boolean NOT NULL DEFAULT false,
  friendly boolean NOT NULL DEFAULT true,
  calm boolean NOT NULL DEFAULT true,
  coat_color text NOT NULL DEFAULT '',
  food_brand text NOT NULL DEFAULT '',
  meals_per_day text NOT NULL DEFAULT '',
  allergies text NOT NULL DEFAULT '',
  medication text NOT NULL DEFAULT '',
  special_notes text NOT NULL DEFAULT '',
  feeding_instructions text,
  medical_notes text,
  photo_url text,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS age_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vaccinated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS neutered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS friendly boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS calm boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS coat_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS food_brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meals_per_day text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS allergies text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medication text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS special_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_path text;

ALTER TABLE public.pets ALTER COLUMN breed SET DEFAULT '';
ALTER TABLE public.pets ALTER COLUMN weight_kg DROP NOT NULL;

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_owner_id_fkey;
ALTER TABLE public.pets
  ADD CONSTRAINT pets_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;

CREATE INDEX IF NOT EXISTS idx_pets_owner_created ON public.pets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_owner_name ON public.pets(owner_id, name);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pets_select_own" ON public.pets;
CREATE POLICY "pets_select_own"
  ON public.pets FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pets_insert_own" ON public.pets;
CREATE POLICY "pets_insert_own"
  ON public.pets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pets_update_own" ON public.pets;
CREATE POLICY "pets_update_own"
  ON public.pets FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pets_delete_own" ON public.pets;
CREATE POLICY "pets_delete_own"
  ON public.pets FOR DELETE
  USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_pets_updated_at ON public.pets;
CREATE TRIGGER set_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-photos',
  'pet-photos',
  true,
  5242880,
  ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "pet_photos_select_public" ON storage.objects;
CREATE POLICY "pet_photos_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-photos');

DROP POLICY IF EXISTS "pet_photos_insert_own_folder" ON storage.objects;
CREATE POLICY "pet_photos_insert_own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "pet_photos_update_own_folder" ON storage.objects;
CREATE POLICY "pet_photos_update_own_folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "pet_photos_delete_own_folder" ON storage.objects;
CREATE POLICY "pet_photos_delete_own_folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
