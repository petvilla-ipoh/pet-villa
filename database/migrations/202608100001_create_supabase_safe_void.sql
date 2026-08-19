-- Pet Villa Safe Void Stage A
-- Additive only. Run after the Host Staff Access migration.
-- This migration preserves every original order amount and status.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

alter table public.orders
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_voided_by_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_voided_by_fkey
      foreign key (voided_by) references public.profiles(id) on delete restrict;
  end if;
end
$$;

create index if not exists orders_voided_at_idx
  on public.orders (voided_at)
  where voided_at is not null;

create table if not exists public.order_void_records (
  order_row_id uuid not null references public.orders(id) on delete restrict,
  order_id text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  reason_code text not null check (
    reason_code in ('test_order', 'duplicate_record', 'invalid_record', 'created_in_error', 'other')
  ),
  reason text not null check (length(btrim(reason)) > 0),
  original_status text not null,
  original_total_rm numeric(12, 2) not null,
  original_paid_rm numeric(12, 2) not null,
  original_balance_rm numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint order_void_records_pkey primary key (order_row_id)
);

create index if not exists order_void_records_display_order_id_idx
  on public.order_void_records (order_id);

create index if not exists order_void_records_actor_created_idx
  on public.order_void_records (actor_id, created_at desc);

alter table public.order_void_records enable row level security;

revoke all on public.order_void_records from anon, authenticated;

create or replace function public.protect_voided_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.voided_at is not null then
    raise exception 'Voided orders are immutable and cannot be deleted.';
  end if;

  if tg_op = 'UPDATE' and old.voided_at is not null then
    raise exception 'Voided orders are immutable and cannot be updated.';
  end if;

  if tg_op = 'UPDATE' and old.voided_at is null and new.voided_at is not null then
    if coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'Safe Void must use the protected Host operation.';
    end if;
    if new.voided_by is null then
      raise exception 'Safe Void requires an authenticated Primary Owner actor.';
    end if;
    if new.status is distinct from old.status
      or new.total_rm is distinct from old.total_rm
      or new.paid_rm is distinct from old.paid_rm
      or new.balance_rm is distinct from old.balance_rm then
      raise exception 'Safe Void cannot modify order status or financial amounts.';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_voided_order_trigger on public.orders;
create trigger protect_voided_order_trigger
before update or delete on public.orders
for each row execute function public.protect_voided_order();

create or replace function public.protect_order_void_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Safe Void audit records are immutable.';
end;
$$;

drop trigger if exists protect_order_void_record_trigger on public.order_void_records;
create trigger protect_order_void_record_trigger
before update or delete on public.order_void_records
for each row execute function public.protect_order_void_record();

create or replace function public.void_order_as_primary_owner(
  p_order_row_id uuid,
  p_actor_user_id uuid,
  p_reason_code text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_order public.orders%rowtype;
  v_existing public.order_void_records%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_staff public.host_staff_members%rowtype;
begin
  select * into v_staff
  from public.host_staff_members
  where user_id = p_actor_user_id
    and lower(email) = 'canyonfsp@gmail.com'
    and access_role = 'owner'
    and status = 'active';

  if not found then
    raise exception 'Only the active Primary Owner can void an order.';
  end if;

  if p_reason_code not in ('test_order', 'duplicate_record', 'invalid_record', 'created_in_error', 'other') then
    raise exception 'Invalid Safe Void reason code.';
  end if;
  if p_reason_code = 'other' and v_reason = '' then
    raise exception 'A reason is required for Other.';
  end if;
  if v_reason = '' then
    v_reason := replace(initcap(replace(p_reason_code, '_', ' ')), '  ', ' ');
  end if;

  select * into v_order
  from public.orders
  where id = p_order_row_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.voided_at is not null then
    select * into v_existing
    from public.order_void_records
    where order_row_id = v_order.id;

    return jsonb_build_object(
      'order_row_id', v_order.id,
      'order_id', v_order.order_id,
      'voided_at', v_order.voided_at,
      'voided_by', v_order.voided_by,
      'already_voided', true,
      'reason_code', v_existing.reason_code,
      'reason', v_existing.reason
    );
  end if;

  update public.orders
  set voided_at = now(), voided_by = p_actor_user_id
  where id = v_order.id
  returning * into v_order;

  insert into public.order_void_records (
    order_row_id,
    order_id,
    actor_id,
    reason_code,
    reason,
    original_status,
    original_total_rm,
    original_paid_rm,
    original_balance_rm
  ) values (
    v_order.id,
    v_order.order_id,
    p_actor_user_id,
    p_reason_code,
    v_reason,
    v_order.status,
    coalesce(v_order.total_rm, 0),
    coalesce(v_order.paid_rm, 0),
    coalesce(v_order.balance_rm, 0)
  );

  insert into public.host_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    p_actor_user_id,
    'order.voided',
    'order',
    v_order.id::text,
    jsonb_build_object(
      'order_row_id', v_order.id,
      'display_order_id', v_order.order_id,
      'reason_code', p_reason_code,
      'reason', v_reason,
      'original_status', v_order.status,
      'original_total_rm', coalesce(v_order.total_rm, 0),
      'original_paid_rm', coalesce(v_order.paid_rm, 0),
      'original_balance_rm', coalesce(v_order.balance_rm, 0)
    )
  );

  return jsonb_build_object(
    'order_row_id', v_order.id,
    'order_id', v_order.order_id,
    'voided_at', v_order.voided_at,
    'voided_by', v_order.voided_by,
    'already_voided', false,
    'reason_code', p_reason_code,
    'reason', v_reason
  );
end;
$$;

revoke all on function public.void_order_as_primary_owner(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.void_order_as_primary_owner(uuid, uuid, text, text) to service_role;

commit;
