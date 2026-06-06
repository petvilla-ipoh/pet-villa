ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS stripe_deposit_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_balance_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_last_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_last_payment_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_stripe_order_payment_target(
  p_order_id text,
  p_owner_id uuid,
  p_stage text
)
RETURNS TABLE (
  order_id text,
  owner_id uuid,
  amount_rm numeric,
  currency text,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_amount numeric(10,2);
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE orders.order_id = p_order_id
    AND orders.owner_id = p_owner_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Order is not payable';
  END IF;

  v_amount := CASE p_stage
    WHEN 'deposit' THEN LEAST(v_order.deposit_rm, GREATEST(v_order.total_rm - v_order.paid_rm, 0))
    WHEN 'full' THEN GREATEST(v_order.total_rm - v_order.paid_rm, 0)
    WHEN 'balance' THEN GREATEST(v_order.total_rm - v_order.paid_rm, 0)
    ELSE 0
  END;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'No payable amount remaining';
  END IF;

  RETURN QUERY SELECT
    v_order.order_id,
    v_order.owner_id,
    v_amount,
    v_order.currency::text,
    CASE p_stage
      WHEN 'deposit' THEN 'Pet Villa booking deposit'
      WHEN 'full' THEN 'Pet Villa full payment'
      ELSE 'Pet Villa balance payment'
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_stripe_order_paid(
  p_order_id text,
  p_owner_id uuid,
  p_stage text,
  p_payment_intent_id text,
  p_amount_rm numeric
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_next_paid numeric(10,2);
  v_next_balance numeric(10,2);
  v_next_status text;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE orders.order_id = p_order_id
    AND orders.owner_id = p_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_payment_intent_id = ANY(v_order.stripe_payment_intent_ids) THEN
    RETURN v_order;
  END IF;

  v_next_paid := LEAST(v_order.total_rm, v_order.paid_rm + GREATEST(p_amount_rm, 0));
  v_next_balance := GREATEST(v_order.total_rm - v_next_paid, 0);
  v_next_status := CASE
    WHEN v_order.status IN ('cancelled', 'completed') THEN v_order.status
    WHEN v_next_balance <= 0 AND p_stage = 'balance' THEN 'ready_pickup'
    WHEN v_next_balance <= 0 THEN 'confirmed'
    ELSE 'confirmed'
  END;

  UPDATE public.orders
  SET
    paid_rm = v_next_paid,
    balance_rm = v_next_balance,
    status = v_next_status,
    stripe_payment_intent_ids = array_append(stripe_payment_intent_ids, p_payment_intent_id),
    stripe_deposit_payment_intent_id = CASE
      WHEN p_stage = 'deposit' THEN p_payment_intent_id
      ELSE stripe_deposit_payment_intent_id
    END,
    stripe_balance_payment_intent_id = CASE
      WHEN p_stage IN ('balance', 'full') THEN p_payment_intent_id
      ELSE stripe_balance_payment_intent_id
    END,
    stripe_last_payment_intent_id = p_payment_intent_id,
    stripe_last_payment_at = now(),
    updated_at = now()
  WHERE orders.id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stripe_order_payment_target(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_stripe_order_paid(text, uuid, text, text, numeric) TO anon, authenticated;
