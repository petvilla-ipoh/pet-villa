begin;

set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- Stage C1A is additive foundation only. Runtime payment/order behavior is
-- intentionally unchanged until a separately reviewed cutover migration.

create table public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  order_row_id uuid not null references public.orders(id) on delete restrict,
  idempotency_key text not null,
  amount_rm numeric(10, 2) not null,
  method text not null,
  status text not null default 'pending',
  previous_order_status text not null,
  paid_before_rm numeric(10, 2) not null,
  balance_before_rm numeric(10, 2) not null,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  verified_amount_rm numeric(10, 2),
  rejection_reason_code text,
  rejection_reason text,
  constraint payment_submissions_idempotency_key_not_blank
    check (btrim(idempotency_key) <> ''),
  constraint payment_submissions_amount_positive
    check (amount_rm > 0),
  constraint payment_submissions_paid_before_nonnegative
    check (paid_before_rm >= 0),
  constraint payment_submissions_balance_before_positive
    check (balance_before_rm > 0),
  constraint payment_submissions_amount_within_balance
    check (amount_rm <= balance_before_rm),
  constraint payment_submissions_method_allowed
    check (method in ('qr', 'bank')),
  constraint payment_submissions_status_allowed
    check (status in ('pending', 'verified', 'rejected')),
  constraint payment_submissions_resolution_consistent
    check (
      (
        status = 'pending'
        and resolved_by is null
        and resolved_at is null
        and verified_amount_rm is null
        and rejection_reason_code is null
        and rejection_reason is null
      )
      or
      (
        status = 'verified'
        and resolved_by is not null
        and resolved_at is not null
        and verified_amount_rm > 0
        and rejection_reason_code is null
        and rejection_reason is null
      )
      or
      (
        status = 'rejected'
        and resolved_by is not null
        and resolved_at is not null
        and verified_amount_rm is null
        and rejection_reason_code is not null
      )
    ),
  constraint payment_submissions_submitter_idempotency_unique
    unique (submitted_by, idempotency_key)
);

create unique index payment_submissions_one_pending_per_order_idx
  on public.payment_submissions (order_row_id)
  where status = 'pending';

create index payment_submissions_order_history_idx
  on public.payment_submissions (order_row_id, submitted_at desc);

create index payment_submissions_pending_host_queue_idx
  on public.payment_submissions (submitted_at)
  where status = 'pending';

comment on table public.payment_submissions is
  'Durable Customer payment claims. Only status=verified contributes verified money; rejected claims contribute RM0.';
comment on column public.payment_submissions.previous_order_status is
  'Operational status restoration context only; it is not proof that a Booking was confirmed.';
comment on column public.payment_submissions.verified_amount_rm is
  'Verified financial contribution. Must remain NULL for pending and rejected submissions.';

create function public.protect_payment_submission_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Payment submission history is immutable and cannot be deleted.';
  end if;

  if new.id is distinct from old.id
    or new.order_row_id is distinct from old.order_row_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.amount_rm is distinct from old.amount_rm
    or new.method is distinct from old.method
    or new.previous_order_status is distinct from old.previous_order_status
    or new.paid_before_rm is distinct from old.paid_before_rm
    or new.balance_before_rm is distinct from old.balance_before_rm
    or new.submitted_by is distinct from old.submitted_by
    or new.submitted_at is distinct from old.submitted_at then
    raise exception 'Payment submission identity and submitted facts are immutable.';
  end if;

  if old.status <> 'pending' then
    raise exception 'Resolved payment submissions are terminal.';
  end if;

  if new.status not in ('verified', 'rejected') then
    raise exception 'Payment submissions may only transition from pending to verified or rejected.';
  end if;

  return new;
end;
$$;

create trigger protect_payment_submission_history_trigger
before update or delete on public.payment_submissions
for each row execute function public.protect_payment_submission_history();

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  order_row_id uuid not null references public.orders(id) on delete restrict,
  payment_submission_id uuid references public.payment_submissions(id) on delete restrict,
  occurrence_key text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint notification_events_occurrence_key_not_blank
    check (btrim(occurrence_key) <> ''),
  constraint notification_events_type_allowed
    check (
      event_type in (
        'FIRST_PAYMENT_SUBMITTED_PENDING_VERIFICATION',
        'LATER_BALANCE_PAYMENT_SUBMITTED_PENDING_VERIFICATION',
        'BOOKING_CONFIRMED',
        'PAYMENT_SUBMISSION_REJECTED',
        'ORDER_COMPLETED'
      )
    ),
  constraint notification_events_submission_reference_required
    check (
      event_type = 'ORDER_COMPLETED'
      or payment_submission_id is not null
    )
);

create index notification_events_created_idx
  on public.notification_events (created_at, id);

create index notification_events_type_created_idx
  on public.notification_events (event_type, created_at);

comment on table public.notification_events is
  'Provider-neutral immutable business events. Provider delivery and retry state are intentionally outside Stage C1A.';

create function public.enforce_notification_event_correlation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_submission_id is not null
    and not exists (
      select 1
      from public.payment_submissions
      where id = new.payment_submission_id
        and order_row_id = new.order_row_id
    ) then
    raise exception 'Notification payment submission must belong to the same order.';
  end if;

  return new;
end;
$$;

create trigger enforce_notification_event_correlation_trigger
before insert on public.notification_events
for each row execute function public.enforce_notification_event_correlation();

create function public.protect_notification_event_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Notification events are immutable.';
end;
$$;

create trigger protect_notification_event_history_trigger
before update or delete on public.notification_events
for each row execute function public.protect_notification_event_history();

-- Owner-approved future runtime wording. C1A creates no consent rows.
-- EN: I agree to receive essential booking, payment and pet-care service updates from The Pet Villa via WhatsApp. No marketing messages will be sent.
-- ZH: 我同意通过 WhatsApp 接收 The Pet Villa 必要的预订、付款及宠物照护服务通知。我们不会发送营销信息。
create table public.operational_whatsapp_consents (
  id uuid primary key default gen_random_uuid(),
  order_row_id uuid not null references public.orders(id) on delete restrict,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  normalized_delivery_phone text not null,
  wording_version text not null,
  wording_text text not null,
  language text not null,
  source text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint operational_whatsapp_consents_phone_not_blank
    check (btrim(normalized_delivery_phone) <> ''),
  constraint operational_whatsapp_consents_language_allowed
    check (language in ('en', 'zh')),
  constraint operational_whatsapp_consents_source_allowed
    check (source = 'online_booking'),
  constraint operational_whatsapp_consents_withdrawal_order
    check (withdrawn_at is null or withdrawn_at >= granted_at)
);

create unique index operational_whatsapp_consents_one_active_per_order_idx
  on public.operational_whatsapp_consents (order_row_id)
  where withdrawn_at is null;

comment on table public.operational_whatsapp_consents is
  'Durable operational WhatsApp consent history for online Booking; no historical Orders are backfilled.';
comment on column public.operational_whatsapp_consents.normalized_delivery_phone is
  'Consent-bound WhatsApp delivery address/contact information only. Never an Auth identity, ownership proof, merge key, or Host authorization.';

create function public.enforce_online_booking_consent_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.orders
    where id = new.order_row_id
      and owner_id = new.owner_user_id
      and host_customer_id is null
  ) then
    raise exception 'Operational WhatsApp consent must belong to the authenticated owner of an online Booking.';
  end if;

  return new;
end;
$$;

create trigger enforce_online_booking_consent_owner_trigger
before insert on public.operational_whatsapp_consents
for each row execute function public.enforce_online_booking_consent_owner();

create function public.protect_operational_whatsapp_consent_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Operational WhatsApp consent history cannot be deleted.';
  end if;

  if new.id is distinct from old.id
    or new.order_row_id is distinct from old.order_row_id
    or new.owner_user_id is distinct from old.owner_user_id
    or new.normalized_delivery_phone is distinct from old.normalized_delivery_phone
    or new.wording_version is distinct from old.wording_version
    or new.wording_text is distinct from old.wording_text
    or new.language is distinct from old.language
    or new.source is distinct from old.source
    or new.granted_at is distinct from old.granted_at then
    raise exception 'Granted operational WhatsApp consent facts are immutable.';
  end if;

  if old.withdrawn_at is not null then
    raise exception 'Withdrawn operational WhatsApp consent history is terminal.';
  end if;

  if new.withdrawn_at is null then
    raise exception 'Operational WhatsApp consent may only be updated to record withdrawal.';
  end if;

  return new;
end;
$$;

create trigger protect_operational_whatsapp_consent_history_trigger
before update or delete on public.operational_whatsapp_consents
for each row execute function public.protect_operational_whatsapp_consent_history();

alter table public.payment_submissions enable row level security;
alter table public.notification_events enable row level security;
alter table public.operational_whatsapp_consents enable row level security;

revoke all on table public.payment_submissions from public, anon, authenticated, service_role;
revoke all on table public.notification_events from public, anon, authenticated, service_role;
revoke all on table public.operational_whatsapp_consents from public, anon, authenticated, service_role;

grant select, insert, update on table public.payment_submissions to service_role;
grant select, insert on table public.notification_events to service_role;
grant select, insert, update on table public.operational_whatsapp_consents to service_role;

revoke all on function public.protect_payment_submission_history() from public, anon, authenticated;
revoke all on function public.enforce_notification_event_correlation() from public, anon, authenticated;
revoke all on function public.protect_notification_event_history() from public, anon, authenticated;
revoke all on function public.enforce_online_booking_consent_owner() from public, anon, authenticated;
revoke all on function public.protect_operational_whatsapp_consent_history() from public, anon, authenticated;

commit;
