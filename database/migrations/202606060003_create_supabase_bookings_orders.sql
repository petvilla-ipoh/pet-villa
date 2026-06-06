CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.current_user_is_host()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('host', 'admin')
  );
$$;

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_id uuid,
  pet_id uuid,
  client_draft_id text,
  service text NOT NULL DEFAULT 'overnight',
  service_type text,
  service_label text NOT NULL DEFAULT '',
  date_label text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  start_at timestamptz,
  end_at timestamptz,
  nights integer NOT NULL DEFAULT 0,
  hours numeric(6,2) NOT NULL DEFAULT 0,
  pets jsonb NOT NULL DEFAULT jsonb_build_array(),
  subtotal_rm numeric(10,2) NOT NULL DEFAULT 0,
  total_rm numeric(10,2) NOT NULL DEFAULT 0,
  deposit_rm numeric(10,2) NOT NULL DEFAULT 0,
  balance_rm numeric(10,2) NOT NULL DEFAULT 0,
  subtotal_sen integer,
  deposit_sen integer,
  final_payment_sen integer,
  currency char(3) NOT NULL DEFAULT 'MYR',
  voucher_id text,
  voucher_code text,
  voucher_title text,
  voucher_discount_rm numeric(10,2) NOT NULL DEFAULT 0,
  special_request text NOT NULL DEFAULT '',
  owner_notes text,
  status text NOT NULL DEFAULT 'pending_confirmation',
  web_status text NOT NULL DEFAULT 'draft',
  draft_payload jsonb NOT NULL DEFAULT jsonb_build_object(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_draft_id text,
  ADD COLUMN IF NOT EXISTS service text NOT NULL DEFAULT 'overnight',
  ADD COLUMN IF NOT EXISTS service_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS date_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS nights integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hours numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pets jsonb NOT NULL DEFAULT jsonb_build_array(),
  ADD COLUMN IF NOT EXISTS subtotal_rm numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rm numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_rm numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_rm numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_id text,
  ADD COLUMN IF NOT EXISTS voucher_code text,
  ADD COLUMN IF NOT EXISTS voucher_title text,
  ADD COLUMN IF NOT EXISTS voucher_discount_rm numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS special_request text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS web_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS draft_payload jsonb NOT NULL DEFAULT jsonb_build_object();

ALTER TABLE public.bookings ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN pet_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN service_type DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN start_at DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN end_at DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN subtotal_sen DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN deposit_sen DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN final_payment_sen DROP NOT NULL;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS booking_time_order;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS booking_split_payment;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_owner_id_fkey;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_owner_client_draft_id_key'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_owner_client_draft_id_key UNIQUE (owner_id, client_draft_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_bookings_owner_web_status ON public.bookings(owner_id, web_status);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_created ON public.bookings(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_dates_status ON public.bookings(start_date, end_date, web_status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
CREATE POLICY "bookings_select_own"
  ON public.bookings FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
CREATE POLICY "bookings_update_own"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;
CREATE POLICY "bookings_delete_own"
  ON public.bookings FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  order_id text NOT NULL,
  client_draft_id text,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  service text NOT NULL DEFAULT 'overnight',
  service_label text NOT NULL DEFAULT '',
  date_label text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  nights integer NOT NULL DEFAULT 0,
  hours numeric(6,2) NOT NULL DEFAULT 0,
  pets jsonb NOT NULL DEFAULT jsonb_build_array(),
  subtotal_rm numeric(10,2) NOT NULL DEFAULT 0,
  total_rm numeric(10,2) NOT NULL DEFAULT 0,
  deposit_rm numeric(10,2) NOT NULL DEFAULT 0,
  balance_rm numeric(10,2) NOT NULL DEFAULT 0,
  paid_rm numeric(10,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'MYR',
  voucher_id text,
  voucher_code text,
  voucher_title text,
  voucher_discount_rm numeric(10,2) NOT NULL DEFAULT 0,
  special_request text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('balance', 'active', 'confirmed', 'staying', 'awaiting_checkout', 'ready_pickup', 'completed', 'cancelled')),
  cancelled_at timestamptz,
  photos_available integer NOT NULL DEFAULT 0,
  review jsonb,
  order_payload jsonb NOT NULL DEFAULT jsonb_build_object(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_owner_created ON public.orders(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_owner_status ON public.orders(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_booking ON public.orders(booking_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_owner_order_id_key'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_owner_order_id_key UNIQUE (owner_id, order_id);
  END IF;
END;
$$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own_or_host" ON public.orders;
CREATE POLICY "orders_select_own_or_host"
  ON public.orders FOR SELECT
  USING (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "orders_update_own_or_host" ON public.orders;
CREATE POLICY "orders_update_own_or_host"
  ON public.orders FOR UPDATE
  USING (auth.uid() = owner_id OR public.current_user_is_host())
  WITH CHECK (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "orders_delete_own" ON public.orders;
CREATE POLICY "orders_delete_own"
  ON public.orders FOR DELETE
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

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
