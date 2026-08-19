begin;

set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- host_staff_members is the only authorization source for Host operations.
create or replace function public.current_staff_access_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select access_role
  from public.host_staff_members
  where user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_staff_has_permission(required_permission text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when required_permission in ('staff.view', 'staff.manage', 'audit.view') then
      exists (
        select 1
        from public.host_staff_members
        where user_id = auth.uid()
          and status = 'active'
          and access_role in ('owner', 'admin')
      )
    else
      exists (
        select 1
        from public.host_staff_members
        where user_id = auth.uid()
          and status = 'active'
          and (
            access_role in ('owner', 'admin')
            or required_permission = any(permissions)
          )
      )
  end;
$$;

create or replace function public.current_user_is_host()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.host_staff_members
    where user_id = auth.uid()
      and status = 'active'
  );
$$;

-- A customer may edit their normal profile fields, but cannot promote their
-- own authorization role through the public profiles table.
create or replace function public.protect_profile_authorization_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.role is distinct from 'customer' then
    raise exception 'Profile authorization fields can only be managed by protected Host operations.';
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'Profile authorization fields can only be managed by protected Host operations.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_authorization_fields_trigger on public.profiles;
create trigger protect_profile_authorization_fields_trigger
before insert or update on public.profiles
for each row execute function public.protect_profile_authorization_fields();

-- Customers keep INSERT and SELECT for their own orders. Authoritative updates
-- are only performed by protected server operations.
drop policy if exists "orders_update_own_or_host" on public.orders;
drop policy if exists "staff_permission_orders_update" on public.orders;
drop policy if exists "orders_update_active_staff" on public.orders;
create policy "orders_update_active_staff"
on public.orders for update to authenticated
using (
  public.current_staff_has_permission('bookings.manage')
  or public.current_staff_has_permission('payments.manage')
)
with check (
  public.current_staff_has_permission('bookings.manage')
  or public.current_staff_has_permission('payments.manage')
);

create or replace function public.protect_customer_order_financial_values()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  raise exception 'Orders can only be updated through protected operations.';
end;
$$;

create or replace function public.submit_customer_order_payment(
  p_order_row_id uuid,
  p_owner_user_id uuid,
  p_amount numeric,
  p_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  submitted_amount numeric(10,2);
  next_payload jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Customer payment submission requires the protected server operation.';
  end if;
  if p_method not in ('qr', 'bank') or p_amount <= 0 then
    raise exception 'Invalid payment submission.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
    and owner_id = p_owner_user_id
    and host_customer_id is null
  for update;

  if not found then raise exception 'Order not found.'; end if;
  if target_order.voided_at is not null
    or target_order.status in ('cancelled', 'completed') then
    raise exception 'This order is not available for payment.';
  end if;
  if greatest(0, target_order.balance_rm) <= 0 then
    raise exception 'This order has no outstanding balance.';
  end if;
  if coalesce(target_order.order_payload, '{}'::jsonb) ? 'paymentSubmission' then
    return jsonb_build_object(
      'already_submitted', true,
      'order_row_id', target_order.id,
      'status', target_order.status
    );
  end if;

  submitted_amount := least(greatest(0, target_order.balance_rm), p_amount);
  next_payload := coalesce(target_order.order_payload, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'pending_verification',
      'paymentSubmission', jsonb_build_object(
        'amount', submitted_amount,
        'method', p_method,
        'submittedAt', now(),
        'previousStatus', target_order.status
      )
    );

  update public.orders
  set status = 'pending_verification',
      order_payload = next_payload,
      updated_at = now()
  where id = target_order.id;

  return jsonb_build_object(
    'already_submitted', false,
    'order_row_id', target_order.id,
    'amount', submitted_amount,
    'status', 'pending_verification'
  );
end;
$$;

create or replace function public.cancel_customer_order(
  p_order_row_id uuid,
  p_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  cancelled_time timestamptz;
  next_payload jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Customer cancellation requires the protected server operation.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
    and owner_id = p_owner_user_id
    and host_customer_id is null
  for update;

  if not found then raise exception 'Order not found.'; end if;
  if target_order.voided_at is not null then
    raise exception 'This order is not available for customer actions.';
  end if;
  if target_order.status = 'cancelled' then
    return jsonb_build_object('already_cancelled', true, 'order_row_id', target_order.id);
  end if;
  if target_order.status not in ('confirmed', 'pending_verification') then
    raise exception 'This booking can no longer be cancelled online.';
  end if;

  cancelled_time := now();
  next_payload := coalesce(target_order.order_payload, '{}'::jsonb)
    || jsonb_build_object('status', 'cancelled', 'cancelledAt', cancelled_time);
  update public.orders
  set status = 'cancelled',
      cancelled_at = cancelled_time,
      order_payload = next_payload,
      updated_at = now()
  where id = target_order.id;

  return jsonb_build_object('already_cancelled', false, 'order_row_id', target_order.id);
end;
$$;

-- Preserve an in-stay operational state after a balance payment is verified.
create or replace function public.verify_host_order_payment(
  p_order_row_id uuid,
  p_actor_user_id uuid,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  submitted_amount numeric(10,2);
  next_paid numeric(10,2);
  next_balance numeric(10,2);
  next_status text;
  previous_status text;
  next_payload jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Host payment verification requires the protected server operation.';
  end if;
  if p_mode not in ('submission', 'balance') then raise exception 'Unsupported payment verification mode.'; end if;

  select * into target_order from public.orders where id = p_order_row_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if target_order.voided_at is not null then raise exception 'Voided orders cannot receive payment updates.'; end if;

  if p_mode = 'submission' then
    submitted_amount := greatest(0, coalesce((target_order.order_payload #>> '{paymentSubmission,amount}')::numeric, 0));
    if submitted_amount <= 0 then
      return jsonb_build_object('already_verified', true, 'order_row_id', target_order.id);
    end if;
    submitted_amount := least(greatest(0, target_order.balance_rm), submitted_amount);
  else
    submitted_amount := greatest(0, target_order.balance_rm);
    if submitted_amount <= 0 then
      return jsonb_build_object('already_verified', true, 'order_row_id', target_order.id);
    end if;
  end if;

  previous_status := target_order.order_payload #>> '{paymentSubmission,previousStatus}';
  next_paid := least(target_order.total_rm, greatest(0, target_order.paid_rm) + submitted_amount);
  next_balance := greatest(0, target_order.total_rm - next_paid);
  next_status := case
    when previous_status in ('active', 'staying', 'awaiting_checkout', 'ready_pickup') then previous_status
    when target_order.status in ('pending_verification', 'balance', 'confirmed')
      then case when next_balance > 0 then 'balance' else 'confirmed' end
    else target_order.status
  end;
  next_payload := (coalesce(target_order.order_payload, '{}'::jsonb) - 'paymentSubmission')
    || jsonb_build_object(
      'paid', next_paid,
      'balance', next_balance,
      'status', next_status,
      'lastPaymentVerification', jsonb_build_object(
        'amount', submitted_amount,
        'verifiedAt', now(),
        'verifiedBy', p_actor_user_id,
        'mode', p_mode
      )
    );

  update public.orders
  set paid_rm = next_paid,
      balance_rm = next_balance,
      status = next_status,
      order_payload = next_payload,
      updated_at = now()
  where id = target_order.id;

  insert into public.host_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_user_id,
    'order.payment_verified',
    'order',
    target_order.id::text,
    jsonb_build_object('amount', submitted_amount, 'mode', p_mode, 'orderId', target_order.order_id)
  );

  return jsonb_build_object(
    'already_verified', false,
    'order_row_id', target_order.id,
    'amount', submitted_amount,
    'paid', next_paid,
    'balance', next_balance,
    'status', next_status
  );
end;
$$;

revoke all on function public.submit_customer_order_payment(uuid, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.submit_customer_order_payment(uuid, uuid, numeric, text) to service_role;
revoke all on function public.cancel_customer_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_customer_order(uuid, uuid) to service_role;
revoke all on function public.verify_host_order_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.verify_host_order_payment(uuid, uuid, text) to service_role;

commit;
