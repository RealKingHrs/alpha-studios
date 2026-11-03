-- Batch 26: sign-in by personal PIN then an emailed one-time code, and tighter roles.
-- The admin adds a person with their email and issues a PIN. The PIN and the email live in their own admin-only
-- table, never on the public members table. Only the portal-pin function (service role) can look a PIN up.

-- ---------------------------------------------------------------- the registered email and the PIN hash
create table public.member_access (
  member_id uuid primary key references public.members (id) on delete cascade,
  email text not null unique check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(email) <= 200),
  pin_hash text,
  pin_set_at timestamptz
);
alter table public.member_access enable row level security;
revoke all on public.member_access from anon, authenticated;
grant all on public.member_access to service_role;
-- The admin may read who has which email and whether a PIN is set; the hash itself is never readable.
grant select (member_id, email, pin_set_at) on public.member_access to authenticated;
create policy member_access_admin_read on public.member_access for select to authenticated
  using (app.is_admin());

-- Failed and successful PIN tries, for rate limiting. Only the portal-pin function touches it.
create table public.pin_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  at timestamptz not null default now(),
  ok boolean not null
);
create index pin_attempts_recent on public.pin_attempts (at desc);
alter table public.pin_attempts enable row level security;
revoke all on public.pin_attempts from anon, authenticated;
grant all on public.pin_attempts to service_role;

-- ---------------------------------------------------------------- admin: set an email, issue a PIN
-- Changing a person's email unlinks their old login, so the new address must prove itself with a code.
create function app.set_member_email(p_member uuid, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_old text;
begin
  if not app.is_admin() then
    raise exception 'Only the admin can set a member email' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members where id = p_member) then
    raise exception 'No such member';
  end if;
  select email into v_old from public.member_access where member_id = p_member;
  insert into public.member_access (member_id, email) values (p_member, v_email)
    on conflict (member_id) do update set email = excluded.email;
  -- Only a change of an existing address unlinks the login; the first address leaves things as they are.
  if v_old is not null and v_old is distinct from v_email then
    perform set_config('app.trusted', '1', true);
    update public.members set user_id = null, access_status = 'invited', consented_at = null
      where id = p_member and role <> 'admin';
    update public.members set user_id = null where id = p_member and role = 'admin';
  end if;
  insert into public.audit_log (actor, table_name, row_id, action, new)
    values (auth.uid(), 'member_access', p_member::text, 'SET_EMAIL', jsonb_build_object('member', p_member));
end $$;

-- Returns the new PIN once: five characters from a 32-character alphabet with no look-alikes. Only a bcrypt hash is
-- kept. Reissuing replaces the old PIN. No two people can share a PIN.
create function app.issue_pin(p_member uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_pin text;
  v_try int := 0;
begin
  if not app.is_admin() then
    raise exception 'Only the admin can issue a PIN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.member_access where member_id = p_member) then
    raise exception 'Set this person''s email first';
  end if;
  loop
    v_bytes := extensions.gen_random_bytes(5);
    v_pin := '';
    for i in 0 .. 4 loop
      -- 256 divides evenly by 32, so every character is equally likely.
      v_pin := v_pin || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (
      select 1 from public.member_access
      where pin_hash is not null and extensions.crypt(v_pin, pin_hash) = pin_hash
    );
    v_try := v_try + 1;
    if v_try > 20 then raise exception 'Could not make a unique PIN, try again'; end if;
  end loop;
  update public.member_access
    set pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')), pin_set_at = now()
    where member_id = p_member;
  insert into public.audit_log (actor, table_name, row_id, action, new)
    values (auth.uid(), 'member_access', p_member::text, 'ISSUE_PIN', jsonb_build_object('member', p_member));
  return v_pin;
end $$;

-- ---------------------------------------------------------------- the portal-pin function (service role only)
-- Looks a PIN up with rate limiting. Returns {locked: true}, {found: false}, or {found: true, member, email}.
-- Five wrong tries from one caller in 15 minutes, or thirty from anyone, lock PIN entry for a while.
create function app.pin_find(p_pin text, p_ip_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pin text := upper(regexp_replace(coalesce(p_pin, ''), '[^A-Za-z0-9]', '', 'g'));
  r record;
begin
  if (select count(*) from public.pin_attempts
        where ip_hash = p_ip_hash and not ok and at > now() - interval '15 minutes') >= 5
     or (select count(*) from public.pin_attempts
        where not ok and at > now() - interval '15 minutes') >= 30 then
    return jsonb_build_object('locked', true);
  end if;
  if length(v_pin) <> 5 then
    insert into public.pin_attempts (ip_hash, ok) values (p_ip_hash, false);
    return jsonb_build_object('found', false);
  end if;
  select a.member_id, a.email, m.access_status into r
    from public.member_access a join public.members m on m.id = a.member_id
    where a.pin_hash is not null and extensions.crypt(v_pin, a.pin_hash) = a.pin_hash
    limit 1;
  if not found or r.access_status = 'revoked' then
    insert into public.pin_attempts (ip_hash, ok) values (p_ip_hash, false);
    return jsonb_build_object('found', false);
  end if;
  insert into public.pin_attempts (ip_hash, ok) values (p_ip_hash, true);
  return jsonb_build_object('found', true, 'member', r.member_id, 'email', r.email);
end $$;

-- After a correct one-time code the function links the login to the member. A member can be linked once; a
-- different login can only replace it after the admin changes the email.
create function app.pin_link(p_member uuid, p_user uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_slug text;
begin
  perform set_config('app.trusted', '1', true);
  update public.members
    set user_id = p_user, access_status = 'active', consented_at = coalesce(consented_at, now())
    where id = p_member and (user_id is null or user_id = p_user) and access_status <> 'revoked'
    returning slug into v_slug;
  return v_slug;
end $$;

-- ---------------------------------------------------------------- roles
-- Crew can no longer join or leave projects themselves: the admin assigns people to projects.
drop policy pm_join_self on public.project_members;
drop policy pm_leave_self on public.project_members;

-- Active crew can read Launchpad ideas, but not change them. Only the admin logs and reviews ideas.
create policy submissions_crew_read on public.submissions for select to authenticated
  using (app.current_member_id() is not null);
drop policy submissions_own_insert on public.submissions;
create policy submissions_admin_insert on public.submissions for insert to authenticated
  with check (app.is_admin() and user_id = auth.uid() and status = 'new' and reviewer_notes = '' and project_id is null);

-- The admin logs ideas that arrive by email, so the five a day limit applies to everyone else only.
create or replace function app.limit_submissions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_admin()
     and (select count(*) from public.submissions where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have sent several pitches today. Please wait a day before sending another.' using errcode = '54000';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- entry points (PostgREST exposes the public schema)
create function public.set_member_email(p_member uuid, p_email text) returns void
language sql security invoker set search_path = '' as $$ select app.set_member_email(p_member, p_email) $$;
create function public.issue_pin(p_member uuid) returns text
language sql security invoker set search_path = '' as $$ select app.issue_pin(p_member) $$;
create function public.pin_find(p_pin text, p_ip_hash text) returns jsonb
language sql security invoker set search_path = '' as $$ select app.pin_find(p_pin, p_ip_hash) $$;
create function public.pin_link(p_member uuid, p_user uuid) returns text
language sql security invoker set search_path = '' as $$ select app.pin_link(p_member, p_user) $$;

revoke execute on all functions in schema app from public, anon;
revoke execute on function public.set_member_email(uuid, text), public.issue_pin(uuid),
  public.pin_find(text, text), public.pin_link(uuid, uuid) from public, anon, authenticated;
grant execute on function app.set_member_email(uuid, text), app.issue_pin(uuid) to authenticated;
grant execute on function public.set_member_email(uuid, text), public.issue_pin(uuid) to authenticated;
grant execute on function app.pin_find(text, text), app.pin_link(uuid, uuid) to service_role;
grant execute on function public.pin_find(text, text), public.pin_link(uuid, uuid) to service_role;
-- The helpers every policy calls stay callable by signed-in and signed-out users, as before.
grant execute on function app.current_member_id(), app.is_admin(), app.is_project_member(uuid)
  to anon, authenticated, service_role;
