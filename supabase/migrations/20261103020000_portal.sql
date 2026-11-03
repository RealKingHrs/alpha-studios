-- Milestone 5: invite codes, consent, audit revert, and stricter guards. All logic runs in the database.

create extension if not exists pgcrypto with schema extensions;

alter table public.members add column consented_at timestamptz;
alter table public.audit_log add column reverted_at timestamptz;

-- Failed and successful redemption attempts, for rate limiting. Only the functions below touch it.
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  at timestamptz not null default now(),
  ok boolean not null
);
alter table public.invite_attempts enable row level security;
revoke all on public.invite_attempts from anon, authenticated;
grant all on public.invite_attempts to service_role;

-- ---------------------------------------------------------------- guards
-- Server-side functions below set app.trusted for their own transaction so they may change fields
-- that signed-in non-admins never can.
create or replace function app.guard_members() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not app.is_admin()
     and coalesce(current_setting('app.trusted', true), '') <> '1' and (
    new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.slug is distinct from old.slug or new.role is distinct from old.role
    or new.access_status is distinct from old.access_status
    or new.consented_at is distinct from old.consented_at
  ) then
    raise exception 'Only the admin can change identity or access fields' using errcode = '42501';
  end if;
  return new;
end $$;

-- The admin row cannot be deleted by a signed-in user. The backend owner can, in the SQL editor.
create function app.guard_members_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and old.role = 'admin' then
    raise exception 'The admin profile cannot be deleted from the app' using errcode = '42501';
  end if;
  return old;
end $$;
create trigger guard_members_delete before delete on public.members
  for each row execute function app.guard_members_delete();

-- ---------------------------------------------------------------- invites
-- Admin only. Returns the code once; only a bcrypt hash is stored. Reissuing unlinks the old login.
create function app.issue_invite(p_member uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_role public.members.role%type;
begin
  if not app.is_admin() then
    raise exception 'Only the admin can issue invites' using errcode = '42501';
  end if;
  select role into v_role from public.members where id = p_member;
  if not found then raise exception 'No such member'; end if;
  if v_role = 'admin' then raise exception 'The admin does not use invite codes'; end if;

  perform set_config('app.trusted', '1', true);
  update public.invites set expires_at = now()
    where member_id = p_member and used_at is null and expires_at > now();
  update public.members set user_id = null, access_status = 'invited', consented_at = null
    where id = p_member;

  v_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  insert into public.invites (member_id, code_hash, expires_at)
    values (p_member, extensions.crypt(v_code, extensions.gen_salt('bf')), now() + interval '7 days');
  insert into public.audit_log (actor, table_name, row_id, action, new)
    values (auth.uid(), 'invites', p_member::text, 'ISSUE_INVITE', jsonb_build_object('member', p_member));
  return substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4);
end $$;

-- A signed-in person with no member record enters a code. Returns {ok, error?}. A wrong, expired or
-- reused code links nothing. Five failures in 15 minutes lock the login out of trying for a while.
create function app.redeem_invite(p_code text, p_consent boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_invite public.invites;
  v_slug text;
begin
  if v_user is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if (select count(*) from public.invite_attempts
        where user_id = v_user and not ok and at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again in 15 minutes.');
  end if;
  if p_consent is not true then
    return jsonb_build_object('ok', false, 'error', 'Agree that your name, role, bio and links are shown publicly to continue.');
  end if;
  if exists (select 1 from public.members where user_id = v_user) then
    return jsonb_build_object('ok', false, 'error', 'This login is already linked to a profile.');
  end if;

  select * into v_invite from public.invites i
    where i.used_at is null and i.expires_at > now()
      and extensions.crypt(v_code, i.code_hash) = i.code_hash
    limit 1;
  if not found then
    insert into public.invite_attempts (user_id, ok) values (v_user, false);
    return jsonb_build_object('ok', false, 'error', 'That code is not valid, or it has expired or been used.');
  end if;

  perform set_config('app.trusted', '1', true);
  update public.members
    set user_id = v_user, access_status = 'active', consented_at = now()
    where id = v_invite.member_id
    returning slug into v_slug;
  update public.invites set used_at = now() where id = v_invite.id;
  insert into public.invite_attempts (user_id, ok) values (v_user, true);
  return jsonb_build_object('ok', true, 'member', v_slug);
end $$;

-- ---------------------------------------------------------------- revert
-- Admin only. Undoes one audited change using the stored previous value, and is itself audited.
create function app.revert_audit(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.audit_log;
  r record;
begin
  if not app.is_admin() then
    raise exception 'Only the admin can revert changes' using errcode = '42501';
  end if;
  select * into a from public.audit_log where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'No such entry.'); end if;
  if a.reverted_at is not null then return jsonb_build_object('ok', false, 'error', 'Already reverted.'); end if;
  if a.table_name not in ('members', 'projects', 'project_members', 'site_settings')
     or a.action not in ('INSERT', 'UPDATE', 'DELETE') then
    return jsonb_build_object('ok', false, 'error', 'This kind of entry cannot be reverted.');
  end if;

  perform set_config('app.trusted', '1', true);

  if a.action = 'INSERT' then
    if a.table_name = 'project_members' then
      delete from public.project_members
        where project_id = (a.new ->> 'project_id')::uuid and member_id = (a.new ->> 'member_id')::uuid;
    elsif a.table_name = 'members' then
      delete from public.members where id = (a.new ->> 'id')::uuid and role <> 'admin';
    elsif a.table_name = 'projects' then
      delete from public.projects where id = (a.new ->> 'id')::uuid;
    else
      return jsonb_build_object('ok', false, 'error', 'This kind of entry cannot be reverted.');
    end if;

  elsif a.action = 'DELETE' then
    if a.table_name = 'members' then
      r := jsonb_populate_record(null::public.members, a.previous);
      if r.role = 'admin' then
        return jsonb_build_object('ok', false, 'error', 'The admin profile cannot be restored here.');
      end if;
      insert into public.members (id, user_id, slug, name, role_title, bio, github_username, links, avatar, role, access_status, consented_at, created_at)
        values (r.id, case when exists (select 1 from auth.users u where u.id = r.user_id) then r.user_id end,
                r.slug, r.name, r.role_title, r.bio, r.github_username, r.links, r.avatar, r.role,
                r.access_status, r.consented_at, r.created_at);
    elsif a.table_name = 'projects' then
      r := jsonb_populate_record(null::public.projects, a.previous);
      insert into public.projects (id, slug, name, summary, story, status, platforms, tech, links, repo, featured, screenshots, created_at)
        values (r.id, r.slug, r.name, r.summary, r.story, r.status, r.platforms, r.tech, r.links, r.repo, r.featured, r.screenshots, r.created_at);
    elsif a.table_name = 'project_members' then
      insert into public.project_members (project_id, member_id)
        values ((a.previous ->> 'project_id')::uuid, (a.previous ->> 'member_id')::uuid)
        on conflict do nothing;
    else
      return jsonb_build_object('ok', false, 'error', 'This kind of entry cannot be reverted.');
    end if;

  else -- UPDATE
    if a.table_name = 'members' then
      -- Linking or unlinking a login is not an edit to undo: reissue an invite instead.
      if (a.previous ->> 'user_id') is distinct from (a.new ->> 'user_id')
         or (a.previous ->> 'consented_at') is distinct from (a.new ->> 'consented_at') then
        return jsonb_build_object('ok', false, 'error', 'A login being linked cannot be reverted. Reissue an invite instead.');
      end if;
      r := jsonb_populate_record(null::public.members, a.previous);
      update public.members set slug = r.slug, name = r.name, role_title = r.role_title, bio = r.bio,
        github_username = r.github_username, links = r.links, avatar = r.avatar, access_status = r.access_status
        where id = r.id;
    elsif a.table_name = 'projects' then
      r := jsonb_populate_record(null::public.projects, a.previous);
      update public.projects set slug = r.slug, name = r.name, summary = r.summary, story = r.story,
        status = r.status, platforms = r.platforms, tech = r.tech, links = r.links, repo = r.repo,
        featured = r.featured, screenshots = r.screenshots where id = r.id;
    elsif a.table_name = 'site_settings' then
      r := jsonb_populate_record(null::public.site_settings, a.previous);
      update public.site_settings set studio_statement = r.studio_statement,
        intro_enabled = r.intro_enabled, contact_email = r.contact_email where id = r.id;
    else
      return jsonb_build_object('ok', false, 'error', 'This kind of entry cannot be reverted.');
    end if;
  end if;

  update public.audit_log set reverted_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- login sweep
-- A login with no linked profile has no access. Remove such logins after a day so they do not pile up.
create function app.sweep_orphan_logins() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from auth.users u
    where u.created_at < now() - interval '1 day'
      and not exists (select 1 from public.members m where m.user_id = u.id);
  get diagnostics n = row_count;
  return n;
end $$;

-- Hosted projects run it daily with pg_cron; it is skipped where the extension is not installed.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('sweep-orphan-logins', '17 4 * * *', 'select app.sweep_orphan_logins()');
  end if;
end $$;

revoke execute on all functions in schema app from public;
grant execute on function app.issue_invite(uuid), app.revert_audit(bigint), app.redeem_invite(text, boolean)
  to authenticated;
grant execute on function app.current_member_id(), app.is_admin(), app.is_project_member(uuid)
  to anon, authenticated, service_role;
grant execute on function app.sweep_orphan_logins() to service_role;

-- PostgREST exposes the public schema, so give the app functions public entry points.
create function public.issue_invite(p_member uuid) returns text
language sql security invoker set search_path = '' as $$ select app.issue_invite(p_member) $$;
create function public.redeem_invite(p_code text, p_consent boolean) returns jsonb
language sql security invoker set search_path = '' as $$ select app.redeem_invite(p_code, p_consent) $$;
create function public.revert_audit(p_id bigint) returns jsonb
language sql security invoker set search_path = '' as $$ select app.revert_audit(p_id) $$;
revoke execute on function public.issue_invite(uuid), public.redeem_invite(text, boolean), public.revert_audit(bigint) from public, anon;
grant execute on function public.issue_invite(uuid), public.redeem_invite(text, boolean), public.revert_audit(bigint) to authenticated;
