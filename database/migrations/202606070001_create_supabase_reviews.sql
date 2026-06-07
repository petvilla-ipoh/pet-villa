-- Pet Villa: Supabase Reviews Migration
-- 202606070001_create_supabase_reviews.sql

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid,
  reviewer_id uuid,
  host_id uuid,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews
  ALTER COLUMN booking_id DROP NOT NULL,
  ALTER COLUMN reviewer_id DROP NOT NULL,
  ALTER COLUMN host_id DROP NOT NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'customer' CHECK (source IN ('customer', 'host')),
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS order_uuid uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_name text NOT NULL DEFAULT 'Pet Owner',
  ADD COLUMN IF NOT EXISTS pet_name text NOT NULL DEFAULT 'Pet',
  ADD COLUMN IF NOT EXISTS dog_name text NOT NULL DEFAULT 'Pet',
  ADD COLUMN IF NOT EXISTS breed text NOT NULL DEFAULT 'Small dog',
  ADD COLUMN IF NOT EXISTS quote jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS review_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.reviews
   SET quote = jsonb_build_object('en', COALESCE(comment, ''), 'zh', COALESCE(comment, ''))
 WHERE quote = '{}'::jsonb
   AND comment IS NOT NULL;

CREATE INDEX IF NOT EXISTS reviews_visible_date_idx
  ON public.reviews(hidden, review_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_owner_order_idx
  ON public.reviews(owner_id, order_id);

CREATE INDEX IF NOT EXISTS reviews_source_date_idx
  ON public.reviews(source, review_date DESC, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_customer_owner_order_key'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_customer_owner_order_key UNIQUE (owner_id, order_id, source);
  END IF;
END;
$$;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public_or_owner_or_host" ON public.reviews;
CREATE POLICY "reviews_select_public_or_owner_or_host"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (
    hidden = false
    OR auth.uid() = owner_id
    OR public.current_user_is_host()
  );

DROP POLICY IF EXISTS "reviews_insert_owner_or_host" ON public.reviews;
CREATE POLICY "reviews_insert_owner_or_host"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    (source = 'customer' AND auth.uid() = owner_id)
    OR public.current_user_is_host()
  );

DROP POLICY IF EXISTS "reviews_update_owner_or_host" ON public.reviews;
CREATE POLICY "reviews_update_owner_or_host"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.current_user_is_host()
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR public.current_user_is_host()
  );

DROP POLICY IF EXISTS "reviews_delete_host" ON public.reviews;
CREATE POLICY "reviews_delete_host"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (public.current_user_is_host());

DROP TRIGGER IF EXISTS set_reviews_updated_at ON public.reviews;
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
