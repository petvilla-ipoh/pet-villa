BEGIN;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS special_date_rates jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_settings_special_date_rates_array'
      AND conrelid = 'public.business_settings'::regclass
  ) THEN
    ALTER TABLE public.business_settings
      ADD CONSTRAINT business_settings_special_date_rates_array
      CHECK (jsonb_typeof(special_date_rates) = 'array');
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS manual_discount_rm numeric(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_manual_discount_nonnegative'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_manual_discount_nonnegative
      CHECK (manual_discount_rm >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_manual_discount_not_above_subtotal'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_manual_discount_not_above_subtotal
      CHECK (manual_discount_rm <= subtotal_rm);
  END IF;
END $$;

COMMIT;
