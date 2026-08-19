-- Host-managed voucher rules shared by the customer voucher and booking flows.

CREATE TABLE IF NOT EXISTS public.voucher_campaigns (
  code text PRIMARY KEY,
  voucher_type text NOT NULL CHECK (voucher_type IN ('fixed', 'second_dog_percent', 'long_stay_flat')),
  value_rm numeric(10,2) NOT NULL DEFAULT 0 CHECK (value_rm >= 0),
  min_spend_rm numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_spend_rm >= 0),
  claimable boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'promotion' CHECK (source IN ('promotion', 'referral')),
  title jsonb NOT NULL DEFAULT '{"en":"Voucher","zh":"优惠券"}'::jsonb,
  body jsonb NOT NULL DEFAULT '{"en":"","zh":""}'::jsonb,
  label jsonb NOT NULL DEFAULT '{"en":"Promotion","zh":"优惠"}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voucher_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voucher_campaigns_select_public" ON public.voucher_campaigns;
CREATE POLICY "voucher_campaigns_select_public"
  ON public.voucher_campaigns FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "voucher_campaigns_insert_host" ON public.voucher_campaigns;
CREATE POLICY "voucher_campaigns_insert_host"
  ON public.voucher_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "voucher_campaigns_update_host" ON public.voucher_campaigns;
CREATE POLICY "voucher_campaigns_update_host"
  ON public.voucher_campaigns FOR UPDATE
  TO authenticated
  USING (public.current_user_is_host())
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "voucher_campaigns_delete_host" ON public.voucher_campaigns;
CREATE POLICY "voucher_campaigns_delete_host"
  ON public.voucher_campaigns FOR DELETE
  TO authenticated
  USING (public.current_user_is_host());

DROP TRIGGER IF EXISTS set_voucher_campaigns_updated_at ON public.voucher_campaigns;
CREATE TRIGGER set_voucher_campaigns_updated_at
  BEFORE UPDATE ON public.voucher_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.voucher_campaigns
  (code, voucher_type, value_rm, min_spend_rm, claimable, source, title, body, label, enabled)
VALUES
  (
    'WELCOMEPETVILLA', 'fixed', 10, 70, true, 'promotion',
    '{"en":"RM10 OFF First Boarding","zh":"首次寄宿减 RM10"}'::jsonb,
    '{"en":"Minimum spend RM70. Boarding only.","zh":"最低消费 RM70，只限寄宿。"}'::jsonb,
    '{"en":"New Guest","zh":"新客优惠"}'::jsonb,
    true
  ),
  (
    'SECOND20%', 'second_dog_percent', 20, 0, true, 'promotion',
    '{"en":"Second Dog 20% OFF","zh":"第二只狗寄宿费 20% OFF"}'::jsonb,
    '{"en":"At least 2 dogs in the same boarding order.","zh":"同一张寄宿订单至少 2 只宠物。"}'::jsonb,
    '{"en":"Second Dog","zh":"第二只狗优惠"}'::jsonb,
    true
  ),
  (
    'LONGSTAY', 'long_stay_flat', 30, 0, true, 'promotion',
    '{"en":"RM30 / night Long Stay","zh":"满 7 晚统一 RM30 / 晚 / 只"}'::jsonb,
    '{"en":"Boarding for 7 consecutive nights or more.","zh":"连续寄宿满 7 晚或以上。"}'::jsonb,
    '{"en":"Long Stay","zh":"长期寄宿优惠"}'::jsonb,
    true
  )
ON CONFLICT (code) DO NOTHING;
