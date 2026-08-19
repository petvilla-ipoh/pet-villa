begin;

set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- Stage C1B is a forward-only transaction cutover. It deliberately does not
-- scan, backfill, rewrite, or delete historical Orders. A legacy payload is
-- materialized only while a protected payment action touches that one Order.

create or replace function public.materialize_legacy_pending_payment_submission(
  p_order_row_id uuid
)
returns public.payment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  existing_submission public.payment_submissions%rowtype;
  legacy_submission jsonb;
  submitted_amount numeric(10,2);
  submitted_at_value timestamptz;
  submitted_method text;
  previous_status text;
  legacy_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Legacy payment materialization requires the protected server operation.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
  for update;

  if not found or target_order.status <> 'pending_verification' then
    return null;
  end if;

  select * into existing_submission
  from public.payment_submissions
  where order_row_id = target_order.id
    and status = 'pending'
  for update;

  if found then
    return existing_submission;
  end if;

  legacy_submission := coalesce(target_order.order_payload, '{}'::jsonb) -> 'paymentSubmission';
  if jsonb_typeof(legacy_submission) <> 'object' then
    return null;
  end if;

  submitted_method := legacy_submission ->> 'method';
  previous_status := legacy_submission ->> 'previousStatus';
  if submitted_method not in ('qr', 'bank')
    or previous_status is null
    or btrim(previous_status) = ''
    or target_order.owner_id is null
    or target_order.host_customer_id is not null then
    raise exception 'Legacy pending payment facts are incomplete and cannot be materialized safely.';
  end if;

  begin
    submitted_amount := (legacy_submission ->> 'amount')::numeric(10,2);
    submitted_at_value := (legacy_submission ->> 'submittedAt')::timestamptz;
  exception when invalid_text_representation then
    raise exception 'Legacy pending payment facts are incomplete and cannot be materialized safely.';
  end;

  if submitted_amount <= 0
    or submitted_amount > greatest(0, coalesce(target_order.balance_rm, 0))
    or submitted_at_value is null then
    raise exception 'Legacy pending payment facts are incomplete and cannot be materialized safely.';
  end if;

  -- This is a deterministic compatibility key only. It is not a reconstructed
  -- payment timestamp, method, submitter, or financial fact.
  legacy_key := concat(
    'legacy-payload:',
    target_order.id::text,
    ':',
    to_char(submitted_at_value at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    ':',
    submitted_amount::text,
    ':',
    submitted_method
  );

  insert into public.payment_submissions (
    order_row_id,
    idempotency_key,
    amount_rm,
    method,
    status,
    previous_order_status,
    paid_before_rm,
    balance_before_rm,
    submitted_by,
    submitted_at
  ) values (
    target_order.id,
    legacy_key,
    submitted_amount,
    submitted_method,
    'pending',
    previous_status,
    greatest(0, coalesce(target_order.paid_rm, 0)),
    greatest(0, coalesce(target_order.balance_rm, 0)),
    target_order.owner_id,
    submitted_at_value
  )
  on conflict (submitted_by, idempotency_key) do nothing
  returning * into existing_submission;

  if not found then
    select * into existing_submission
    from public.payment_submissions
    where submitted_by = target_order.owner_id
      and idempotency_key = legacy_key
    for update;

    if not found or existing_submission.order_row_id <> target_order.id then
      raise exception 'Legacy pending payment identity could not be materialized safely.';
    end if;
  end if;

  -- No FIRST/LATER event is fabricated here: this is a historical payload
  -- compatibility projection, not a new Customer payment submission.
  return existing_submission;
end;
$$;

create or replace function public.submit_customer_order_payment(
  p_order_row_id uuid,
  p_owner_user_id uuid,
  p_amount numeric,
  p_method text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  pending_submission public.payment_submissions%rowtype;
  stored_submission public.payment_submissions%rowtype;
  submitted_amount numeric(10,2);
  submission_event_type text;
  next_payload jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Customer payment submission requires the protected server operation.';
  end if;
  if p_method not in ('qr', 'bank')
    or p_amount <= 0
    or p_amount <> round(p_amount, 2)
    or p_idempotency_key is null
    or btrim(p_idempotency_key) = '' then
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

  select * into stored_submission
  from public.payment_submissions
  where submitted_by = p_owner_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    if stored_submission.order_row_id <> target_order.id then
      raise exception 'This payment retry key belongs to a different order.';
    end if;
    return jsonb_build_object(
      'already_submitted', true,
      'order_row_id', target_order.id,
      'payment_submission_id', stored_submission.id,
      'amount', stored_submission.amount_rm,
      'status', stored_submission.status,
      'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
      'balance', greatest(0, coalesce(target_order.balance_rm, 0))
    );
  end if;

  select * into pending_submission
  from public.payment_submissions
  where order_row_id = target_order.id
    and status = 'pending'
  for update;

  if found then
    return jsonb_build_object(
      'already_submitted', true,
      'order_row_id', target_order.id,
      'payment_submission_id', pending_submission.id,
      'amount', pending_submission.amount_rm,
      'status', pending_submission.status,
      'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
      'balance', greatest(0, coalesce(target_order.balance_rm, 0))
    );
  end if;

  if target_order.status = 'pending_verification' then
    stored_submission := public.materialize_legacy_pending_payment_submission(target_order.id);
    if stored_submission.id is null then
      raise exception 'This pending payment cannot be resolved safely.';
    end if;
    return jsonb_build_object(
      'already_submitted', true,
      'order_row_id', target_order.id,
      'payment_submission_id', stored_submission.id,
      'amount', stored_submission.amount_rm,
      'status', stored_submission.status,
      'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
      'balance', greatest(0, coalesce(target_order.balance_rm, 0))
    );
  end if;

  if coalesce(target_order.order_payload, '{}'::jsonb) ? 'paymentSubmission' then
    raise exception 'This payment marker cannot be resolved safely.';
  end if;
  if greatest(0, coalesce(target_order.balance_rm, 0)) <= 0 then
    raise exception 'This order has no outstanding balance.';
  end if;
  if p_amount > greatest(0, coalesce(target_order.balance_rm, 0)) then
    raise exception 'The submitted amount cannot exceed the outstanding balance.';
  end if;

  submitted_amount := p_amount::numeric(10,2);
  submission_event_type := case
    when greatest(0, coalesce(target_order.paid_rm, 0)) = 0
      then 'FIRST_PAYMENT_SUBMITTED_PENDING_VERIFICATION'
    else 'LATER_BALANCE_PAYMENT_SUBMITTED_PENDING_VERIFICATION'
  end;

  insert into public.payment_submissions (
    order_row_id,
    idempotency_key,
    amount_rm,
    method,
    status,
    previous_order_status,
    paid_before_rm,
    balance_before_rm,
    submitted_by
  ) values (
    target_order.id,
    p_idempotency_key,
    submitted_amount,
    p_method,
    'pending',
    target_order.status,
    greatest(0, coalesce(target_order.paid_rm, 0)),
    greatest(0, coalesce(target_order.balance_rm, 0)),
    p_owner_user_id
  )
  returning * into stored_submission;

  next_payload := coalesce(target_order.order_payload, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'pending_verification',
      'paymentSubmission', jsonb_build_object(
        'id', stored_submission.id,
        'amount', stored_submission.amount_rm,
        'method', stored_submission.method,
        'submittedAt', stored_submission.submitted_at,
        'previousStatus', stored_submission.previous_order_status
      )
    );

  update public.orders
  set status = 'pending_verification',
      order_payload = next_payload,
      updated_at = now()
  where id = target_order.id;

  insert into public.notification_events (
    event_type,
    order_row_id,
    payment_submission_id,
    occurrence_key,
    payload
  ) values (
    submission_event_type,
    target_order.id,
    stored_submission.id,
    concat('PAYMENT_SUBMISSION:', stored_submission.id::text),
    jsonb_build_object(
      'amount_rm', stored_submission.amount_rm,
      'method', stored_submission.method,
      'submitted_at', stored_submission.submitted_at,
      'paid_before_rm', stored_submission.paid_before_rm,
      'balance_before_rm', stored_submission.balance_before_rm
    )
  )
  on conflict (occurrence_key) do nothing;

  return jsonb_build_object(
    'already_submitted', false,
    'order_row_id', target_order.id,
    'payment_submission_id', stored_submission.id,
    'amount', stored_submission.amount_rm,
    'status', 'pending',
    'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
    'balance', greatest(0, coalesce(target_order.balance_rm, 0))
  );
end;
$$;

-- Compatibility only for the already-deployed four-argument Customer route.
-- The new runtime always sends its durable request key to the five-argument RPC.
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
  compatibility_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Customer payment submission requires the protected server operation.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
    and owner_id = p_owner_user_id
    and host_customer_id is null;

  compatibility_key := concat(
    'legacy-runtime:', p_order_row_id::text, ':',
    coalesce(target_order.status, ''), ':',
    coalesce(target_order.paid_rm, 0)::text, ':',
    coalesce(target_order.balance_rm, 0)::text, ':',
    coalesce(p_amount, 0)::text, ':',
    coalesce(p_method, '')
  );

  return public.submit_customer_order_payment(
    p_order_row_id,
    p_owner_user_id,
    p_amount,
    p_method,
    compatibility_key
  );
end;
$$;

create or replace function public.verify_host_order_payment(
  p_order_row_id uuid,
  p_actor_user_id uuid,
  p_mode text,
  p_payment_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_submission public.payment_submissions%rowtype;
  pending_submission public.payment_submissions%rowtype;
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

  if not found then raise exception 'Order not found.'; end if;
  if target_order.voided_at is not null then
    raise exception 'Voided orders cannot receive payment updates.';
  end if;

  if p_mode = 'submission' then
    if p_payment_submission_id is null then
      raise exception 'A specific pending payment submission is required.';
    end if;

    perform public.materialize_legacy_pending_payment_submission(target_order.id);

    select * into target_submission
    from public.payment_submissions
    where id = p_payment_submission_id
      and order_row_id = target_order.id
    for update;

    if not found then
      raise exception 'Payment submission not found for this order.';
    end if;
    if target_submission.status = 'verified' then
      return jsonb_build_object(
        'already_verified', true,
        'order_row_id', target_order.id,
        'payment_submission_id', target_submission.id,
        'amount', coalesce(target_submission.verified_amount_rm, 0),
        'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
        'balance', greatest(0, coalesce(target_order.balance_rm, 0)),
        'status', target_order.status
      );
    end if;
    if target_submission.status = 'rejected' then
      raise exception 'A rejected payment submission cannot be verified.';
    end if;
    if target_order.status <> 'pending_verification' then
      raise exception 'The order is no longer pending payment verification.';
    end if;

    submitted_amount := target_submission.amount_rm;
    if submitted_amount > greatest(0, coalesce(target_order.balance_rm, 0)) then
      raise exception 'The submitted amount exceeds the current outstanding balance.';
    end if;
  else
    perform public.materialize_legacy_pending_payment_submission(target_order.id);

    select * into pending_submission
    from public.payment_submissions
    where order_row_id = target_order.id
      and status = 'pending'
    for update;

    if found or target_order.status = 'pending_verification' then
      raise exception 'Resolve the pending customer payment submission before recording a balance payment.';
    end if;
    if greatest(0, coalesce(target_order.paid_rm, 0)) <= 0 then
      raise exception 'The first verified payment must be a Customer payment submission.';
    end if;

    submitted_amount := greatest(0, coalesce(target_order.balance_rm, 0));
    if submitted_amount <= 0 then
      return jsonb_build_object(
        'already_verified', true,
        'order_row_id', target_order.id,
        'amount', 0,
        'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
        'balance', greatest(0, coalesce(target_order.balance_rm, 0)),
        'status', target_order.status
      );
    end if;
  end if;

  next_paid := least(target_order.total_rm, greatest(0, coalesce(target_order.paid_rm, 0)) + submitted_amount);
  next_balance := greatest(0, target_order.total_rm - next_paid);
  next_status := case
    when p_mode = 'submission'
      and target_submission.previous_order_status in ('active', 'staying', 'awaiting_checkout', 'ready_pickup')
      then target_submission.previous_order_status
    when target_order.status in ('active', 'staying', 'awaiting_checkout', 'ready_pickup')
      then target_order.status
    when next_balance > 0 then 'balance'
    else 'confirmed'
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
        'mode', p_mode,
        'paymentSubmissionId', case when p_mode = 'submission' then target_submission.id else null end
      )
    );

  update public.orders
  set paid_rm = next_paid,
      balance_rm = next_balance,
      status = next_status,
      order_payload = next_payload,
      updated_at = now()
  where id = target_order.id;

  if p_mode = 'submission' then
    update public.payment_submissions
    set status = 'verified',
        resolved_by = p_actor_user_id,
        resolved_at = now(),
        verified_amount_rm = submitted_amount
    where id = target_submission.id;
  end if;

  insert into public.host_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_user_id,
    'order.payment_verified',
    'order',
    target_order.id::text,
    jsonb_build_object(
      'amount', submitted_amount,
      'mode', p_mode,
      'orderId', target_order.order_id,
      'paymentSubmissionId', case when p_mode = 'submission' then target_submission.id else null end
    )
  );

  if p_mode = 'submission'
    and greatest(0, coalesce(target_order.paid_rm, 0)) = 0
    and next_paid > 0 then
    insert into public.notification_events (
      event_type,
      order_row_id,
      payment_submission_id,
      occurrence_key,
      payload
    ) values (
      'BOOKING_CONFIRMED',
      target_order.id,
      target_submission.id,
      concat('BOOKING_CONFIRMED:', target_order.id::text),
      jsonb_build_object(
        'paid_rm', next_paid,
        'balance_rm', next_balance,
        'verified_amount_rm', submitted_amount
      )
    )
    on conflict (occurrence_key) do nothing;
  end if;

  return jsonb_build_object(
    'already_verified', false,
    'order_row_id', target_order.id,
    'payment_submission_id', case when p_mode = 'submission' then target_submission.id else null end,
    'amount', submitted_amount,
    'paid', next_paid,
    'balance', next_balance,
    'status', next_status
  );
end;
$$;

-- Compatibility only for the existing three-argument Host route. New C1B
-- runtime must send the specific durable payment_submission.id.
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
  pending_submission public.payment_submissions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Host payment verification requires the protected server operation.';
  end if;

  if p_mode = 'submission' then
    select * into target_order
    from public.orders
    where id = p_order_row_id
    for update;

    if not found then
      raise exception 'Order not found.';
    end if;

    perform public.materialize_legacy_pending_payment_submission(target_order.id);
    select * into pending_submission
    from public.payment_submissions
    where order_row_id = target_order.id
      and status = 'pending'
    for update;

    if not found then
      return jsonb_build_object(
        'already_verified', true,
        'order_row_id', target_order.id,
        'amount', 0,
        'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
        'balance', greatest(0, coalesce(target_order.balance_rm, 0)),
        'status', target_order.status
      );
    end if;

    return public.verify_host_order_payment(
      p_order_row_id,
      p_actor_user_id,
      p_mode,
      pending_submission.id
    );
  end if;

  return public.verify_host_order_payment(
    p_order_row_id,
    p_actor_user_id,
    p_mode,
    null
  );
end;
$$;

create or replace function public.reject_host_order_payment(
  p_order_row_id uuid,
  p_payment_submission_id uuid,
  p_actor_user_id uuid,
  p_reason_code text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_submission public.payment_submissions%rowtype;
  restored_payload jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Host payment rejection requires the protected server operation.';
  end if;
  if p_reason_code not in ('not_received', 'incorrect_amount', 'other') then
    raise exception 'Unsupported payment rejection reason.';
  end if;
  if p_payment_submission_id is null then
    raise exception 'A specific pending payment submission is required.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
  for update;

  if not found then raise exception 'Order not found.'; end if;
  if target_order.voided_at is not null then
    raise exception 'Voided orders cannot receive payment updates.';
  end if;

  perform public.materialize_legacy_pending_payment_submission(target_order.id);

  select * into target_submission
  from public.payment_submissions
  where id = p_payment_submission_id
    and order_row_id = target_order.id
  for update;

  if not found then
    raise exception 'Payment submission not found for this order.';
  end if;
  if target_submission.status = 'verified' then
    raise exception 'A verified payment submission cannot be rejected.';
  end if;
  if target_submission.status = 'rejected' then
    return jsonb_build_object(
      'already_rejected', true,
      'order_row_id', target_order.id,
      'payment_submission_id', target_submission.id,
      'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
      'balance', greatest(0, coalesce(target_order.balance_rm, 0)),
      'status', target_order.status
    );
  end if;
  if target_order.status <> 'pending_verification' then
    raise exception 'The order is no longer pending payment verification.';
  end if;

  restored_payload := (coalesce(target_order.order_payload, '{}'::jsonb) - 'paymentSubmission')
    || jsonb_build_object(
      'status', target_submission.previous_order_status,
      'lastPaymentRejection', jsonb_build_object(
        'reasonCode', p_reason_code,
        'rejectedAt', now(),
        'rejectedBy', p_actor_user_id,
        'paymentSubmissionId', target_submission.id
      )
    );

  update public.payment_submissions
  set status = 'rejected',
      resolved_by = p_actor_user_id,
      resolved_at = now(),
      rejection_reason_code = p_reason_code,
      rejection_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = target_submission.id;

  -- Rejection restores only the exact pre-submission operational status. It
  -- does not modify paid_rm, balance_rm, cancellation, refund, void, or delete.
  update public.orders
  set status = target_submission.previous_order_status,
      order_payload = restored_payload,
      updated_at = now()
  where id = target_order.id;

  insert into public.host_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_user_id,
    'order.payment_submission_rejected',
    'order',
    target_order.id::text,
    jsonb_build_object(
      'orderId', target_order.order_id,
      'paymentSubmissionId', target_submission.id,
      'reasonCode', p_reason_code,
      'verifiedAmountRm', 0
    )
  );

  insert into public.notification_events (
    event_type,
    order_row_id,
    payment_submission_id,
    occurrence_key,
    payload
  ) values (
    'PAYMENT_SUBMISSION_REJECTED',
    target_order.id,
    target_submission.id,
    concat('PAYMENT_SUBMISSION_REJECTED:', target_submission.id::text),
    jsonb_build_object(
      'reason_code', p_reason_code,
      'claimed_amount_rm', target_submission.amount_rm,
      'verified_amount_rm', 0,
      'restored_status', target_submission.previous_order_status
    )
  )
  on conflict (occurrence_key) do nothing;

  return jsonb_build_object(
    'already_rejected', false,
    'order_row_id', target_order.id,
    'payment_submission_id', target_submission.id,
    'paid', greatest(0, coalesce(target_order.paid_rm, 0)),
    'balance', greatest(0, coalesce(target_order.balance_rm, 0)),
    'status', target_submission.previous_order_status
  );
end;
$$;

-- A Host may prepare a legacy payload for the C1B review screen. This action
-- creates only the durable pending identity; it never verifies money or emits
-- a historical payment-submitted notification.
create or replace function public.materialize_host_order_payment_submission(
  p_order_row_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_submission public.payment_submissions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Host payment review requires the protected server operation.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
  for update;

  if not found then raise exception 'Order not found.'; end if;
  if target_order.voided_at is not null or target_order.status <> 'pending_verification' then
    raise exception 'This order is not awaiting payment verification.';
  end if;

  select * into target_submission
  from public.payment_submissions
  where order_row_id = target_order.id
    and status = 'pending'
  for update;

  if not found then
    target_submission := public.materialize_legacy_pending_payment_submission(target_order.id);
  end if;
  if target_submission.id is null then
    raise exception 'This pending payment cannot be prepared safely.';
  end if;

  return jsonb_build_object(
    'payment_submission_id', target_submission.id,
    'amount', target_submission.amount_rm,
    'method', target_submission.method,
    'submitted_at', target_submission.submitted_at
  );
end;
$$;

create or replace function public.record_operational_whatsapp_consent(
  p_order_row_id uuid,
  p_owner_user_id uuid,
  p_language text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  existing_consent public.operational_whatsapp_consents%rowtype;
  normalized_phone text;
  approved_wording text;
  wording_version constant text := 'pet-villa-operational-whatsapp-v1';
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Operational WhatsApp consent requires the protected server operation.';
  end if;
  if p_language not in ('en', 'zh') then
    raise exception 'Unsupported consent language.';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_row_id
    and owner_id = p_owner_user_id
    and host_customer_id is null
  for update;

  if not found then
    raise exception 'Online booking order not found.';
  end if;

  select * into existing_consent
  from public.operational_whatsapp_consents
  where order_row_id = target_order.id
    and withdrawn_at is null
  for update;

  if found then
    return jsonb_build_object('already_recorded', true, 'consent_id', existing_consent.id);
  end if;

  normalized_phone := regexp_replace(btrim(coalesce(target_order.customer_phone, '')), '[^0-9]', '', 'g');
  if normalized_phone like '00%' then normalized_phone := substr(normalized_phone, 3); end if;
  if normalized_phone like '60%' then
    normalized_phone := normalized_phone;
  elsif normalized_phone like '0%' then
    normalized_phone := concat('60', substr(normalized_phone, 2));
  elsif normalized_phone like '1%' then
    normalized_phone := concat('60', normalized_phone);
  else
    normalized_phone := '';
  end if;
  if normalized_phone !~ '^60[1-9][0-9]{7,10}$' then
    raise exception 'A valid consent-bound delivery phone is required.';
  end if;

  approved_wording := case p_language
    when 'en' then 'I agree to receive essential booking, payment and pet-care service updates from The Pet Villa via WhatsApp. No marketing messages will be sent.'
    when 'zh' then '我同意通过 WhatsApp 接收 The Pet Villa 必要的预订、付款及宠物照护服务通知。我们不会发送营销信息。'
  end;

  insert into public.operational_whatsapp_consents (
    order_row_id,
    owner_user_id,
    normalized_delivery_phone,
    wording_version,
    wording_text,
    language,
    source
  ) values (
    target_order.id,
    p_owner_user_id,
    normalized_phone,
    wording_version,
    approved_wording,
    p_language,
    'online_booking'
  )
  returning * into existing_consent;

  return jsonb_build_object('already_recorded', false, 'consent_id', existing_consent.id);
end;
$$;

-- New Online Booking is the sole consent boundary.  A historical Order never
-- needs to gain a consent row to remain payable or operationally usable.
create or replace function public.create_customer_online_order_with_operational_whatsapp_consent(
  p_owner_user_id uuid,
  p_order jsonb,
  p_language text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
  existing_order public.orders%rowtype;
  created_order public.orders%rowtype;
  requested_booking_row_id uuid;
  booking_row_id uuid;
  order_value text;
  client_draft_value text;
  service_value text;
  service_label_value text;
  date_label_value text;
  start_date_value date;
  end_date_value date;
  nights_value integer;
  hours_value numeric(6,2);
  pets_value jsonb;
  subtotal_value numeric(10,2);
  total_value numeric(10,2);
  deposit_value numeric(10,2);
  voucher_id_value text;
  voucher_code_value text;
  voucher_title_value text;
  voucher_discount_value numeric(10,2);
  special_request_value text;
  photos_available_value integer;
  order_snapshot jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Customer online booking creation requires the protected server operation.';
  end if;
  if p_language not in ('en', 'zh') then
    raise exception 'Unsupported consent language.';
  end if;
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'Invalid online booking.';
  end if;

  order_value := btrim(coalesce(p_order->>'orderId', ''));
  client_draft_value := btrim(coalesce(p_order->>'id', ''));
  service_value := btrim(coalesce(p_order->>'service', ''));
  service_label_value := btrim(coalesce(p_order->>'serviceLabel', ''));
  date_label_value := btrim(coalesce(p_order->>'dateLabel', ''));
  requested_booking_row_id := nullif(p_order->>'bookingId', '')::uuid;
  start_date_value := nullif(p_order->>'startDateISO', '')::date;
  end_date_value := nullif(p_order->>'endDateISO', '')::date;
  nights_value := coalesce(nullif(p_order->>'nights', '')::integer, 0);
  hours_value := coalesce(nullif(p_order->>'hours', '')::numeric, 0);
  pets_value := coalesce(p_order->'pets', '[]'::jsonb);
  subtotal_value := coalesce(nullif(p_order->>'subtotal', '')::numeric, 0);
  total_value := coalesce(nullif(p_order->>'total', '')::numeric, 0);
  deposit_value := coalesce(nullif(p_order->>'deposit', '')::numeric, 0);
  voucher_id_value := nullif(btrim(coalesce(p_order->>'voucherId', '')), '');
  voucher_code_value := nullif(btrim(coalesce(p_order->>'voucherCode', '')), '');
  voucher_title_value := nullif(btrim(coalesce(p_order->>'voucherTitle', '')), '');
  voucher_discount_value := coalesce(nullif(p_order->>'voucherDiscount', '')::numeric, 0);
  special_request_value := coalesce(p_order->>'specialRequest', '');
  photos_available_value := coalesce(nullif(p_order->>'photosAvailable', '')::integer, 0);

  if order_value = ''
    or client_draft_value = ''
    or requested_booking_row_id is null
    or service_value not in ('overnight', 'daycare')
    or service_label_value = ''
    or date_label_value = ''
    or jsonb_typeof(pets_value) <> 'array'
    or jsonb_array_length(pets_value) = 0
    or total_value < 0
    or subtotal_value < 0
    or deposit_value < 0
    or deposit_value > total_value
    or voucher_discount_value < 0
    or nights_value < 0
    or hours_value < 0
    or photos_available_value < 0 then
    raise exception 'Invalid online booking.';
  end if;
  if service_value = 'overnight' and (start_date_value is null or end_date_value is null or end_date_value < start_date_value) then
    raise exception 'Invalid boarding dates.';
  end if;
  if service_value = 'daycare' and (start_date_value is null or end_date_value is null or start_date_value <> end_date_value) then
    raise exception 'Invalid daycare date.';
  end if;

  select * into target_profile
  from public.profiles
  where id = p_owner_user_id
  for share;
  if not found then
    raise exception 'Customer profile not found.';
  end if;
  if btrim(coalesce(target_profile.phone, '')) = '' then
    raise exception 'A Customer contact phone is required for this Online Booking.';
  end if;

  select target_booking.id into booking_row_id
  from public.bookings as target_booking
  where target_booking.id = requested_booking_row_id
    and owner_id = p_owner_user_id
  for update;
  if not found then
    raise exception 'Online booking draft not found.';
  end if;

  select * into existing_order
  from public.orders
  where owner_id = p_owner_user_id
    and order_id = order_value
  for update;
  if found then
    -- A successful first call wrote both Order and consent atomically.  Do not
    -- retroactively create consent for a historical Order that happens to use
    -- the same stable identity.
    return jsonb_build_object(
      'already_created', true,
      'order_row_id', existing_order.id,
      'order_id', existing_order.order_id
    );
  end if;

  order_snapshot := jsonb_build_object(
    'id', client_draft_value,
    'bookingId', booking_row_id,
    'orderId', order_value,
    'customerId', p_owner_user_id,
    'customerSource', 'auth',
    'customerName', target_profile.full_name,
    'customerPhone', target_profile.phone,
    'customerEmail', target_profile.email,
    'service', service_value,
    'serviceLabel', service_label_value,
    'dateLabel', date_label_value,
    'startDateISO', start_date_value,
    'endDateISO', end_date_value,
    'nights', nights_value,
    'hours', hours_value,
    'pets', pets_value,
    'subtotal', subtotal_value,
    'total', total_value,
    'deposit', deposit_value,
    'balance', total_value,
    'paid', 0,
    'voucherId', voucher_id_value,
    'voucherCode', voucher_code_value,
    'voucherTitle', voucher_title_value,
    'voucherDiscount', voucher_discount_value,
    'specialRequest', special_request_value,
    'status', 'balance',
    'photosAvailable', photos_available_value
  );

  insert into public.orders (
    owner_id,
    booking_id,
    order_id,
    client_draft_id,
    customer_name,
    customer_phone,
    customer_email,
    service,
    service_label,
    date_label,
    start_date,
    end_date,
    nights,
    hours,
    pets,
    subtotal_rm,
    total_rm,
    deposit_rm,
    balance_rm,
    paid_rm,
    currency,
    voucher_id,
    voucher_code,
    voucher_title,
    voucher_discount_rm,
    manual_discount_rm,
    charge_total_rm,
    special_request,
    status,
    photos_available,
    review,
    order_payload
  ) values (
    p_owner_user_id,
    booking_row_id,
    order_value,
    client_draft_value,
    target_profile.full_name,
    target_profile.phone,
    target_profile.email,
    service_value,
    service_label_value,
    date_label_value,
    start_date_value,
    end_date_value,
    nights_value,
    hours_value,
    pets_value,
    subtotal_value,
    total_value,
    deposit_value,
    total_value,
    0,
    'MYR',
    voucher_id_value,
    voucher_code_value,
    voucher_title_value,
    voucher_discount_value,
    0,
    0,
    special_request_value,
    'balance',
    photos_available_value,
    null,
    order_snapshot
  )
  returning * into created_order;

  perform public.record_operational_whatsapp_consent(created_order.id, p_owner_user_id, p_language);

  update public.bookings
  set web_status = 'ordered', updated_at = now()
  where id = booking_row_id
    and owner_id = p_owner_user_id;

  return jsonb_build_object(
    'already_created', false,
    'order_row_id', created_order.id,
    'order_id', created_order.order_id
  );
end;
$$;

revoke all on function public.materialize_legacy_pending_payment_submission(uuid) from public, anon, authenticated;
revoke all on function public.submit_customer_order_payment(uuid, uuid, numeric, text, text) from public, anon, authenticated;
revoke all on function public.submit_customer_order_payment(uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.verify_host_order_payment(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.verify_host_order_payment(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_host_order_payment(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.materialize_host_order_payment_submission(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_operational_whatsapp_consent(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.create_customer_online_order_with_operational_whatsapp_consent(uuid, jsonb, text) from public, anon, authenticated;

grant execute on function public.materialize_legacy_pending_payment_submission(uuid) to service_role;
grant execute on function public.submit_customer_order_payment(uuid, uuid, numeric, text, text) to service_role;
grant execute on function public.submit_customer_order_payment(uuid, uuid, numeric, text) to service_role;
grant execute on function public.verify_host_order_payment(uuid, uuid, text, uuid) to service_role;
grant execute on function public.verify_host_order_payment(uuid, uuid, text) to service_role;
grant execute on function public.reject_host_order_payment(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.materialize_host_order_payment_submission(uuid, uuid) to service_role;
grant execute on function public.record_operational_whatsapp_consent(uuid, uuid, text) to service_role;
grant execute on function public.create_customer_online_order_with_operational_whatsapp_consent(uuid, jsonb, text) to service_role;

commit;
