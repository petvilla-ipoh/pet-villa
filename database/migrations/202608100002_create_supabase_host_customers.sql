-- Persistent Host-created customers and protected payment verification.
-- Additive only: existing Auth customers, pets, orders and financial history are preserved.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

create table if not exists public.host_customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) > 0),
  phone text not null check (length(btrim(phone)) > 0),
  email text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint host_customers_optional_email_check check (email is null or length(btrim(email)) > 0)
);

create index if not exists host_customers_name_idx on public.host_customers (lower(full_name));
create index if not exists host_customers_phone_idx on public.host_customers (phone);
create index if not exists host_customers_email_idx on public.host_customers (lower(email)) where email is not null;

create table if not exists public.host_customer_pets (
  id uuid primary key default gen_random_uuid(),
  host_customer_id uuid not null references public.host_customers(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  breed text not null default '',
  weight_kg numeric(5,2),
  age_text text not null default '',
  gender text not null default '',
  coat_color text not null default '',
  vaccinated boolean not null default false,
  neutered boolean not null default false,
  friendly boolean not null default true,
  calm boolean not null default true,
  food_brand text not null default '',
  meals_per_day text not null default '',
  allergies text not null default '',
  medication text not null default '',
  special_notes text not null default '',
  photo_url text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists host_customer_pets_customer_idx
  on public.host_customer_pets (host_customer_id, created_at desc);

alter table public.host_customers enable row level security;
alter table public.host_customer_pets enable row level security;
revoke all on public.host_customers from anon, authenticated;
revoke all on public.host_customer_pets from anon, authenticated;

drop trigger if exists set_host_customers_updated_at on public.host_customers;
create trigger set_host_customers_updated_at
  before update on public.host_customers
  for each row execute function public.set_updated_at();

drop trigger if exists set_host_customer_pets_updated_at on public.host_customer_pets;
create trigger set_host_customer_pets_updated_at
  before update on public.host_customer_pets
  for each row execute function public.set_updated_at();

alter table public.orders
  add column if not exists host_customer_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_host_customer_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_host_customer_id_fkey
      foreign key (host_customer_id) references public.host_customers(id) on delete restrict;
  end if;
end
$$;

alter table public.orders alter column owner_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_exactly_one_customer_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_exactly_one_customer_check
      check ((owner_id is not null) <> (host_customer_id is not null)) not valid;
    alter table public.orders validate constraint orders_exactly_one_customer_check;
  end if;
end
$$;

create index if not exists orders_host_customer_created_idx
  on public.orders (host_customer_id, created_at desc)
  where host_customer_id is not null;

create unique index if not exists orders_host_customer_order_id_key
  on public.orders (host_customer_id, order_id)
  where host_customer_id is not null;

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
  next_payload jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Host payment verification requires the protected server operation.';
  end if;

  if p_mode not in ('submission', 'balance') then
    raise exception 'Unsupported payment verification mode.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;
  if target_order.voided_at is not null then
    raise exception 'Voided orders cannot receive payment updates.';
  end if;

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

  next_paid := least(target_order.total_rm, greatest(0, target_order.paid_rm) + submitted_amount);
  next_balance := greatest(0, target_order.total_rm - next_paid);
  next_status := case
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

revoke all on function public.verify_host_order_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.verify_host_order_payment(uuid, uuid, text) to service_role;

commit;
