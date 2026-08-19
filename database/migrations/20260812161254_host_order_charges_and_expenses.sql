begin;

alter table public.orders
  add column if not exists charge_total_rm numeric(10, 2) not null default 0;

create table if not exists public.order_charges (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  order_row_id uuid not null references public.orders(id) on delete restrict,
  amount_rm numeric(10, 2) not null check (amount_rm > 0),
  reason_code text not null check (reason_code in ('late_checkout')),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_charges_order_created_idx
  on public.order_charges (order_row_id, created_at desc);

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  expense_date date not null,
  amount_rm numeric(10, 2) not null check (amount_rm > 0),
  category text not null check (category in ('supplies', 'utilities', 'maintenance', 'transport', 'other')),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists business_expenses_date_created_idx
  on public.business_expenses (expense_date desc, created_at desc);

alter table public.order_charges enable row level security;
alter table public.business_expenses enable row level security;

revoke all on table public.order_charges from public, anon, authenticated;
revoke all on table public.business_expenses from public, anon, authenticated;
grant select, insert on table public.order_charges to service_role;
grant select, insert on table public.business_expenses to service_role;

create or replace function public.protect_customer_order_financial_values()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
    or new.host_customer_id is distinct from old.host_customer_id
    or new.order_id is distinct from old.order_id
    or new.subtotal_rm is distinct from old.subtotal_rm
    or new.total_rm is distinct from old.total_rm
    or new.deposit_rm is distinct from old.deposit_rm
    or new.paid_rm is distinct from old.paid_rm
    or new.balance_rm is distinct from old.balance_rm
    or new.voucher_id is distinct from old.voucher_id
    or new.voucher_code is distinct from old.voucher_code
    or new.voucher_discount_rm is distinct from old.voucher_discount_rm
    or new.manual_discount_rm is distinct from old.manual_discount_rm
    or new.charge_total_rm is distinct from old.charge_total_rm
    or new.voided_at is distinct from old.voided_at
    or new.voided_by is distinct from old.voided_by then
    raise exception 'Customer sessions cannot change verified order financial values.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_customer_order_financial_values_trigger on public.orders;
create trigger protect_customer_order_financial_values_trigger
before update on public.orders
for each row execute function public.protect_customer_order_financial_values();

drop policy if exists "orders_delete_own" on public.orders;
drop policy if exists "orders_delete_own_or_host" on public.orders;
drop policy if exists "staff_permission_orders_delete" on public.orders;

create or replace function public.add_host_order_charge(
  p_request_id uuid,
  p_order_row_id uuid,
  p_actor_user_id uuid,
  p_amount_rm numeric,
  p_reason_code text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  existing_charge public.order_charges%rowtype;
  created_charge public.order_charges%rowtype;
  next_total numeric(10, 2);
  next_balance numeric(10, 2);
  next_charge_total numeric(10, 2);
  next_payload jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Add Charge requires the protected Host server operation.';
  end if;
  if p_request_id is null or p_order_row_id is null or p_actor_user_id is null then
    raise exception 'A permanent request, order and Host identity are required.';
  end if;
  if p_amount_rm is null or p_amount_rm <= 0 or p_amount_rm > 999999.99 then
    raise exception 'Charge amount must be greater than zero.';
  end if;
  if p_reason_code <> 'late_checkout' then
    raise exception 'Unsupported charge reason.';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Charge note is too long.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;
  if target_order.voided_at is not null then
    raise exception 'Voided orders cannot receive charges.';
  end if;
  if target_order.status in ('cancelled', 'completed') then
    raise exception 'Closed orders cannot receive charges.';
  end if;

  select * into existing_charge
  from public.order_charges
  where request_id = p_request_id;
  if found then
    return jsonb_build_object(
      'already_added', true,
      'charge_id', existing_charge.id,
      'order_row_id', target_order.id,
      'amount', existing_charge.amount_rm,
      'total', target_order.total_rm,
      'paid', target_order.paid_rm,
      'balance', target_order.balance_rm,
      'charge_total', target_order.charge_total_rm
    );
  end if;

  insert into public.order_charges (
    request_id, order_row_id, amount_rm, reason_code, note, created_by
  ) values (
    p_request_id, target_order.id, round(p_amount_rm, 2), p_reason_code,
    nullif(btrim(coalesce(p_note, '')), ''), p_actor_user_id
  ) returning * into created_charge;

  next_charge_total := coalesce(target_order.charge_total_rm, 0) + created_charge.amount_rm;
  next_total := coalesce(target_order.total_rm, 0) + created_charge.amount_rm;
  next_balance := greatest(0, next_total - coalesce(target_order.paid_rm, 0));
  next_payload := coalesce(target_order.order_payload, '{}'::jsonb)
    || jsonb_build_object(
      'chargeTotal', next_charge_total,
      'total', next_total,
      'paid', coalesce(target_order.paid_rm, 0),
      'balance', next_balance
    );

  update public.orders
  set charge_total_rm = next_charge_total,
      total_rm = next_total,
      balance_rm = next_balance,
      order_payload = next_payload,
      updated_at = now()
  where id = target_order.id;

  insert into public.host_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_user_id,
    'order.charge_added',
    'order',
    target_order.id::text,
    jsonb_build_object(
      'orderId', target_order.order_id,
      'chargeId', created_charge.id,
      'amount', created_charge.amount_rm,
      'reasonCode', created_charge.reason_code
    )
  );

  return jsonb_build_object(
    'already_added', false,
    'charge_id', created_charge.id,
    'order_row_id', target_order.id,
    'amount', created_charge.amount_rm,
    'total', next_total,
    'paid', coalesce(target_order.paid_rm, 0),
    'balance', next_balance,
    'charge_total', next_charge_total
  );
end;
$$;

create or replace function public.record_host_business_expense(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_expense_date date,
  p_amount_rm numeric,
  p_category text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_expense public.business_expenses%rowtype;
  created_expense public.business_expenses%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Expense recording requires the protected Host server operation.';
  end if;
  if p_request_id is null or p_actor_user_id is null or p_expense_date is null then
    raise exception 'A request, Host identity and expense date are required.';
  end if;
  if p_amount_rm is null or p_amount_rm <= 0 or p_amount_rm > 999999.99 then
    raise exception 'Expense amount must be greater than zero.';
  end if;
  if p_category not in ('supplies', 'utilities', 'maintenance', 'transport', 'other') then
    raise exception 'Unsupported expense category.';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Expense note is too long.';
  end if;

  select * into existing_expense
  from public.business_expenses
  where request_id = p_request_id;
  if found then
    return jsonb_build_object(
      'already_recorded', true,
      'expense_id', existing_expense.id,
      'expense_date', existing_expense.expense_date,
      'amount', existing_expense.amount_rm,
      'category', existing_expense.category
    );
  end if;

  insert into public.business_expenses (
    request_id, expense_date, amount_rm, category, note, created_by
  ) values (
    p_request_id, p_expense_date, round(p_amount_rm, 2), p_category,
    nullif(btrim(coalesce(p_note, '')), ''), p_actor_user_id
  ) on conflict (request_id) do nothing
  returning * into created_expense;

  if not found then
    select * into existing_expense
    from public.business_expenses
    where request_id = p_request_id;
    return jsonb_build_object(
      'already_recorded', true,
      'expense_id', existing_expense.id,
      'expense_date', existing_expense.expense_date,
      'amount', existing_expense.amount_rm,
      'category', existing_expense.category
    );
  end if;

  insert into public.host_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_user_id,
    'expense.recorded',
    'business_expense',
    created_expense.id::text,
    jsonb_build_object(
      'expenseDate', created_expense.expense_date,
      'amount', created_expense.amount_rm,
      'category', created_expense.category
    )
  );

  return jsonb_build_object(
    'already_recorded', false,
    'expense_id', created_expense.id,
    'expense_date', created_expense.expense_date,
    'amount', created_expense.amount_rm,
    'category', created_expense.category
  );
end;
$$;

revoke all on function public.add_host_order_charge(uuid, uuid, uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.add_host_order_charge(uuid, uuid, uuid, numeric, text, text) to service_role;
revoke all on function public.record_host_business_expense(uuid, uuid, date, numeric, text, text) from public, anon, authenticated;
grant execute on function public.record_host_business_expense(uuid, uuid, date, numeric, text, text) to service_role;

commit;
