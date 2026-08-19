begin;

set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- Auth owns the customer identity. This trigger only synchronizes normal
-- customer profile fields and never changes an existing authorization role.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    email,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone, ''),
    coalesce(new.email, new.raw_user_meta_data->>'email', ''),
    'customer'
  )
  on conflict (id) do update
  set
    full_name = coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), public.profiles.full_name),
    phone = coalesce(nullif(new.raw_user_meta_data->>'phone', ''), nullif(new.phone, ''), public.profiles.phone),
    email = coalesce(nullif(new.email, ''), public.profiles.email),
    updated_at = now();

  return new;
end;
$$;

commit;
