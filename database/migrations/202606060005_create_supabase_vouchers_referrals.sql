-- Pet Villa: Supabase Vouchers + Referrals Migration
-- 202606060005_create_supabase_vouchers_referrals.sql

CREATE TABLE IF NOT EXISTS public.vouchers (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  voucher_type text NOT NULL CHECK (voucher_type IN ('fixed', 'second_dog_half')),
  value_rm numeric(10,2) NOT NULL DEFAULT 0,
  min_spend_rm numeric(10,2) NOT NULL DEFAULT 0,
  source text NOT NULL CHECK (source IN ('promotion', 'referral')),
  title jsonb NOT NULL DEFAULT '{}'::jsonb,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  label jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  restored_at timestamptz,
  order_id text,
  discount_amount_rm numeric(10,2),
  booking_date_range text,
  voucher_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vouchers_owner_status_idx ON public.vouchers(owner_id, status, claimed_at DESC);
CREATE INDEX IF NOT EXISTS vouchers_owner_order_idx ON public.vouchers(owner_id, order_id);
CREATE UNIQUE INDEX IF NOT EXISTS vouchers_owner_active_promotion_code_idx
  ON public.vouchers(owner_id, code)
  WHERE source = 'promotion' AND status <> 'expired';
CREATE UNIQUE INDEX IF NOT EXISTS vouchers_owner_referral_order_idx
  ON public.vouchers(owner_id, code, ((voucher_payload->>'rewardForOrderId')))
  WHERE source = 'referral' AND voucher_payload ? 'rewardForOrderId';

CREATE TABLE IF NOT EXISTS public.referral_codes (
  owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  first_order_id text,
  reward_issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_referred_idx ON public.referrals(referred_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON public.referrals(referral_code);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vouchers_select_own" ON public.vouchers;
CREATE POLICY "vouchers_select_own"
  ON public.vouchers FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "vouchers_insert_own" ON public.vouchers;
CREATE POLICY "vouchers_insert_own"
  ON public.vouchers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "vouchers_update_own" ON public.vouchers;
CREATE POLICY "vouchers_update_own"
  ON public.vouchers FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "vouchers_delete_own" ON public.vouchers;
CREATE POLICY "vouchers_delete_own"
  ON public.vouchers FOR DELETE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "referral_codes_select_authenticated" ON public.referral_codes;
CREATE POLICY "referral_codes_select_authenticated"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "referral_codes_insert_own" ON public.referral_codes;
CREATE POLICY "referral_codes_insert_own"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "referral_codes_update_own" ON public.referral_codes;
CREATE POLICY "referral_codes_update_own"
  ON public.referral_codes FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "referrals_select_participant" ON public.referrals;
CREATE POLICY "referrals_select_participant"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

DROP POLICY IF EXISTS "referrals_insert_referred" ON public.referrals;
DROP POLICY IF EXISTS "referrals_update_referred" ON public.referrals;

DROP TRIGGER IF EXISTS set_vouchers_updated_at ON public.vouchers;
CREATE TRIGGER set_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_referral_codes_updated_at ON public.referral_codes;
CREATE TRIGGER set_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_referrals_updated_at ON public.referrals;
CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.claim_voucher(p_code text, p_voucher_payload jsonb)
RETURNS public.vouchers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_code text := upper(trim(p_code));
  v_existing public.vouchers;
  v_voucher public.vouchers;
  v_type text;
  v_value numeric(10,2);
  v_min_spend numeric(10,2);
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;

  IF v_code = 'WELCOME10' THEN
    v_type := 'fixed';
    v_value := 10;
    v_min_spend := 35;
  ELSIF v_code = 'SECOND50' THEN
    v_type := 'second_dog_half';
    v_value := 50;
    v_min_spend := 0;
  ELSE
    RAISE EXCEPTION 'voucher_not_claimable';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.vouchers
   WHERE owner_id = v_owner
     AND code = v_code
     AND source = 'promotion'
     AND status <> 'expired'
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'duplicate_voucher_claim';
  END IF;

  INSERT INTO public.vouchers (
    id,
    owner_id,
    code,
    voucher_type,
    value_rm,
    min_spend_rm,
    source,
    title,
    body,
    label,
    status,
    voucher_payload
  )
  VALUES (
    COALESCE(NULLIF(p_voucher_payload->>'id', ''), gen_random_uuid()::text),
    v_owner,
    v_code,
    v_type,
    v_value,
    v_min_spend,
    'promotion',
    COALESCE(p_voucher_payload->'title', '{}'::jsonb),
    COALESCE(p_voucher_payload->'body', '{}'::jsonb),
    COALESCE(p_voucher_payload->'label', '{}'::jsonb),
    'available',
    COALESCE(p_voucher_payload, '{}'::jsonb)
  )
  RETURNING * INTO v_voucher;

  RETURN v_voucher;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_referral_code(p_code text)
RETURNS public.referral_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_code text := upper(trim(p_code));
  v_row public.referral_codes;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;
  IF v_code = '' THEN
    RAISE EXCEPTION 'referral_code_required';
  END IF;

  INSERT INTO public.referral_codes (owner_id, code)
  VALUES (v_owner, v_code)
  ON CONFLICT (owner_id) DO UPDATE
    SET code = EXCLUDED.code,
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_pending_referral(p_referral_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred uuid := auth.uid();
  v_code text := upper(trim(p_referral_code));
  v_referrer uuid;
BEGIN
  IF v_referred IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;
  IF v_code = '' THEN
    RETURN false;
  END IF;

  SELECT owner_id
    INTO v_referrer
    FROM public.referral_codes
   WHERE upper(code) = v_code
   LIMIT 1;

  IF v_referrer IS NULL OR v_referrer = v_referred THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id, referral_code, status)
  VALUES (v_referrer, v_referred, v_code, 'pending')
  ON CONFLICT (referred_user_id) DO NOTHING;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_voucher_for_booking(
  p_voucher_id text,
  p_subtotal numeric,
  p_selected_pet_count integer,
  p_unit_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_voucher public.vouchers;
  v_discount numeric(10,2) := 0;
BEGIN
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'login_required');
  END IF;

  SELECT *
    INTO v_voucher
    FROM public.vouchers
   WHERE id = p_voucher_id
     AND owner_id = v_owner
     AND status = 'available'
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'voucher_unavailable');
  END IF;

  IF p_subtotal < v_voucher.min_spend_rm THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'minimum_spend');
  END IF;

  IF v_voucher.voucher_type = 'second_dog_half' THEN
    IF p_selected_pet_count < 2 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'minimum_pets');
    END IF;
    v_discount := LEAST(p_subtotal, round(p_unit_total * 0.5));
  ELSE
    v_discount := LEAST(p_subtotal, v_voucher.value_rm);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'discount', v_discount,
    'voucher', to_jsonb(v_voucher)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_voucher_used(
  p_voucher_id text,
  p_order_id text,
  p_discount_amount numeric,
  p_booking_date_range text
)
RETURNS public.vouchers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_voucher public.vouchers;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;

  UPDATE public.vouchers
     SET status = 'used',
         used_at = now(),
         restored_at = NULL,
         order_id = p_order_id,
         discount_amount_rm = p_discount_amount,
         booking_date_range = p_booking_date_range,
         updated_at = now()
   WHERE id = p_voucher_id
     AND owner_id = v_owner
     AND status = 'available'
  RETURNING * INTO v_voucher;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'voucher_unavailable';
  END IF;

  RETURN v_voucher;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_voucher_for_order(p_order_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;

  UPDATE public.vouchers
     SET status = 'available',
         restored_at = now(),
         used_at = NULL,
         order_id = NULL,
         discount_amount_rm = NULL,
         booking_date_range = NULL,
         updated_at = now()
   WHERE owner_id = v_owner
     AND order_id = p_order_id
     AND status = 'used';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_referral_reward(p_order_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred uuid := auth.uid();
  v_referral public.referrals;
BEGIN
  IF v_referred IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;

  SELECT *
    INTO v_referral
    FROM public.referrals
   WHERE referred_user_id = v_referred
     AND status = 'pending'
   LIMIT 1;

  IF NOT FOUND OR v_referral.referrer_id IS NULL OR v_referral.referrer_id = v_referred THEN
    RETURN false;
  END IF;

  INSERT INTO public.vouchers (
    id, owner_id, code, voucher_type, value_rm, min_spend_rm, source,
    status, voucher_payload
  )
  VALUES (
    gen_random_uuid()::text,
    v_referred,
    'REFER10',
    'fixed',
    10,
    35,
    'referral',
    'available',
    jsonb_build_object('rewardForOrderId', p_order_id)
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.vouchers (
    id, owner_id, code, voucher_type, value_rm, min_spend_rm, source,
    status, voucher_payload
  )
  VALUES (
    gen_random_uuid()::text,
    v_referral.referrer_id,
    'REFER10',
    'fixed',
    10,
    35,
    'referral',
    'available',
    jsonb_build_object('rewardForOrderId', p_order_id)
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.referrals
     SET status = 'completed',
         first_order_id = p_order_id,
         reward_issued_at = now(),
         updated_at = now()
   WHERE id = v_referral.id;

  RETURN true;
END;
$$;
