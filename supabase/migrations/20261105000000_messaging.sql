-- Milestone 7: crew messaging. Direct messages, one channel per project, and a crew room.
-- Everything is private. Row-level security decides who reads and writes; the portal only asks.
-- None of these tables is ever read by the publish job or put in the content snapshot.

-- ---------------------------------------------------------------- tables
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm', 'project', 'crew')),
  project_id uuid unique references public.projects (id) on delete cascade,
  -- The two member ids, sorted, so a pair of people always has the same single thread.
  dm_key text unique,
  created_at timestamptz not null default now(),
  check ((kind = 'project') = (project_id is not null)),
  check ((kind = 'dm') = (dm_key is not null))
);
create unique index conversations_one_crew_room on public.conversations (kind) where kind = 'crew';

-- Who is in a direct thread. Project and crew rooms take their members from existing tables.
create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (conversation_id, member_id)
);
create index conversation_members_by_member on public.conversation_members (member_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  author_id uuid references public.members (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  body_tsv tsvector generated always as (to_tsvector('simple'::regconfig, body)) stored,
  -- A deleted message keeps no text.
  check ((deleted_at is not null and body = '') or (deleted_at is null and length(btrim(body)) between 1 and 4000))
);
create index messages_by_conversation on public.messages (conversation_id, created_at desc);
create index messages_search on public.messages using gin (body_tsv);

create table public.read_state (
  member_id uuid not null references public.members (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (member_id, conversation_id)
);

create table public.member_status (
  member_id uuid primary key references public.members (id) on delete cascade,
  status_text text not null default '' check (length(status_text) <= 80),
  last_seen timestamptz,
  updated_at timestamptz not null default now()
);

-- The admin's oversight switch. Only the admin can read or change it, so the crew cannot see it.
create table public.oversight (
  admin_member_id uuid primary key references public.members (id) on delete cascade,
  enabled boolean not null default false,
  changed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- the single place the read and write rule lives
create function app.oversight_on() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select o.enabled from public.oversight o where o.admin_member_id = app.current_member_id() and app.is_admin()),
    false)
$$;

-- p_write false: may this person read the conversation? true: may they post in it?
-- Direct: the two members; the admin may also read (never write) while oversight is on.
-- Project: the project's members and the admin. Crew room: every active member.
-- Paused and unknown people never pass, because current_member_id() is null for them.
create function app.conversation_access(p_conversation uuid, p_write boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation
      and app.current_member_id() is not null
      and (
        c.kind = 'crew'
        or (c.kind = 'project' and (app.is_admin() or app.is_project_member(c.project_id)))
        or (c.kind = 'dm' and (
          exists (select 1 from public.conversation_members cm
                  where cm.conversation_id = c.id and cm.member_id = app.current_member_id())
          or (not p_write and app.is_admin() and app.oversight_on())
        ))
      )
  )
$$;

-- ---------------------------------------------------------------- rooms are created for you
insert into public.conversations (kind) values ('crew');

create function app.project_channel() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.conversations (kind, project_id) values ('project', new.id)
    on conflict (project_id) do nothing;
  return null;
end $$;
create trigger project_channel after insert on public.projects
  for each row execute function app.project_channel();
insert into public.conversations (kind, project_id)
  select 'project', p.id from public.projects p on conflict (project_id) do nothing;

-- ---------------------------------------------------------------- guards
-- At most 30 messages a minute from one person.
create function app.limit_messages() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages
        where author_id = new.author_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'You are sending messages very quickly. Please wait a moment.' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger limit_messages before insert on public.messages
  for each row execute function app.limit_messages();

create function app.touch_status() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger touch_status before update on public.member_status
  for each row execute function app.touch_status();

-- ---------------------------------------------------------------- privileges and row-level security
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.read_state enable row level security;
alter table public.member_status enable row level security;
alter table public.oversight enable row level security;

revoke all on public.conversations, public.conversation_members, public.messages, public.read_state,
  public.member_status, public.oversight from anon, authenticated;
grant all on public.conversations, public.conversation_members, public.messages, public.read_state,
  public.member_status, public.oversight to service_role;

grant select on public.conversations, public.conversation_members, public.read_state,
  public.member_status, public.oversight to authenticated;
grant select (id, conversation_id, author_id, body, created_at, deleted_at) on public.messages to authenticated;
grant insert (conversation_id, body, author_id) on public.messages to authenticated;

create policy conversations_read on public.conversations for select to authenticated
  using (app.conversation_access(id, false));
create policy conversation_members_read on public.conversation_members for select to authenticated
  using (app.conversation_access(conversation_id, false));
create policy messages_read on public.messages for select to authenticated
  using (app.conversation_access(conversation_id, false));
create policy messages_post on public.messages for insert to authenticated
  with check (author_id = app.current_member_id() and app.conversation_access(conversation_id, true));
create policy read_state_own on public.read_state for select to authenticated
  using (member_id = app.current_member_id());
create policy member_status_read on public.member_status for select to authenticated
  using (app.current_member_id() is not null);
create policy oversight_admin_read on public.oversight for select to authenticated
  using (admin_member_id = app.current_member_id() and app.is_admin());

-- ---------------------------------------------------------------- actions (security definer, then a public wrapper)
create function app.start_dm(p_other uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := app.current_member_id();
  v_key text;
  v_id uuid;
begin
  if me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_other = me then raise exception 'You cannot message yourself'; end if;
  if not exists (select 1 from public.members where id = p_other and access_status = 'active') then
    raise exception 'That person is not available to message';
  end if;
  v_key := least(me::text, p_other::text) || ':' || greatest(me::text, p_other::text);
  insert into public.conversations (kind, dm_key) values ('dm', v_key) on conflict (dm_key) do nothing;
  select id into v_id from public.conversations where dm_key = v_key;
  insert into public.conversation_members (conversation_id, member_id)
    values (v_id, me), (v_id, p_other) on conflict do nothing;
  return v_id;
end $$;

create function app.delete_message(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.messages set deleted_at = now(), body = ''
    where id = p_id and author_id = app.current_member_id() and deleted_at is null;
  if not found then raise exception 'You can only delete your own messages' using errcode = '42501'; end if;
end $$;

create function app.mark_read(p_conversation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.current_member_id();
begin
  if me is null or not app.conversation_access(p_conversation, false) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.read_state (member_id, conversation_id, last_read_at) values (me, p_conversation, now())
    on conflict (member_id, conversation_id) do update set last_read_at = now();
end $$;

create function app.set_status(p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := app.current_member_id();
  v_text text := btrim(coalesce(p_text, ''));
begin
  if me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if length(v_text) > 80 then raise exception 'Keep your status under 80 characters'; end if;
  insert into public.member_status (member_id, status_text, last_seen) values (me, v_text, now())
    on conflict (member_id) do update set status_text = excluded.status_text, last_seen = now();
end $$;

create function app.heartbeat() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.current_member_id();
begin
  if me is null then return; end if;
  insert into public.member_status (member_id, last_seen) values (me, now())
    on conflict (member_id) do update set last_seen = now();
end $$;

-- Every switch is audited. The audit log is readable by the admin only.
create function app.set_oversight(p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.current_member_id();
begin
  if not app.is_admin() then raise exception 'Only the admin can change oversight' using errcode = '42501'; end if;
  insert into public.oversight (admin_member_id, enabled, changed_at) values (me, p_on, now())
    on conflict (admin_member_id) do update set enabled = excluded.enabled, changed_at = now();
  insert into public.audit_log (actor, table_name, row_id, action, new)
    values (auth.uid(), 'oversight', me::text, case when p_on then 'OVERSIGHT_ON' else 'OVERSIGHT_OFF' end,
            jsonb_build_object('enabled', p_on));
end $$;

-- ---------------------------------------------------------------- read helpers (security invoker: row-level security applies)
-- Unread counts for the conversations the person takes part in. The admin's oversight reading never adds to them.
create function public.unread_counts() returns table (conversation_id uuid, unread bigint)
language sql stable security invoker set search_path = '' as $$
  select m.conversation_id, count(*) as unread
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  left join public.read_state rs
    on rs.conversation_id = m.conversation_id and rs.member_id = app.current_member_id()
  where m.deleted_at is null
    and m.author_id is distinct from app.current_member_id()
    and m.created_at > coalesce(rs.last_read_at, 'epoch'::timestamptz)
    and (c.kind <> 'dm' or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.member_id = app.current_member_id()))
  group by m.conversation_id
$$;

create function public.crew_presence() returns table (member_id uuid, status_text text, online boolean)
language sql stable security invoker set search_path = '' as $$
  select s.member_id, s.status_text, coalesce(s.last_seen > now() - interval '90 seconds', false)
  from public.member_status s
$$;

-- Search the messages the person is allowed to read, newest first. It runs with the owner's rights only so it can use
-- the search column, which signed-in users cannot select; the same read rule is applied to every row.
create function public.search_messages(p_query text) returns table (
  id uuid, conversation_id uuid, author_id uuid, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.conversation_id, m.author_id, m.body, m.created_at
  from public.messages m
  where m.deleted_at is null
    and app.conversation_access(m.conversation_id, false)
    and length(btrim(coalesce(p_query, ''))) > 0
    and m.body_tsv @@ websearch_to_tsquery('simple'::regconfig, p_query)
  order by m.created_at desc
  limit 50
$$;

-- ---------------------------------------------------------------- entry points
create function public.start_dm(p_other uuid) returns uuid
language sql security invoker set search_path = '' as $$ select app.start_dm(p_other) $$;
create function public.delete_message(p_id uuid) returns void
language sql security invoker set search_path = '' as $$ select app.delete_message(p_id) $$;
create function public.mark_read(p_conversation uuid) returns void
language sql security invoker set search_path = '' as $$ select app.mark_read(p_conversation) $$;
create function public.set_status(p_text text) returns void
language sql security invoker set search_path = '' as $$ select app.set_status(p_text) $$;
create function public.heartbeat() returns void
language sql security invoker set search_path = '' as $$ select app.heartbeat() $$;
create function public.set_oversight(p_on boolean) returns void
language sql security invoker set search_path = '' as $$ select app.set_oversight(p_on) $$;

-- New functions are callable by everyone by default; take that away, then grant what each needs.
revoke execute on function
  app.oversight_on(), app.conversation_access(uuid, boolean), app.project_channel(), app.limit_messages(),
  app.touch_status(), app.start_dm(uuid), app.delete_message(uuid), app.mark_read(uuid), app.set_status(text),
  app.heartbeat(), app.set_oversight(boolean),
  public.unread_counts(), public.crew_presence(), public.search_messages(text), public.start_dm(uuid),
  public.delete_message(uuid), public.mark_read(uuid), public.set_status(text), public.heartbeat(),
  public.set_oversight(boolean)
  from public, anon, authenticated;
grant execute on function
  app.oversight_on(), app.conversation_access(uuid, boolean), app.start_dm(uuid), app.delete_message(uuid),
  app.mark_read(uuid), app.set_status(text), app.heartbeat(), app.set_oversight(boolean),
  public.unread_counts(), public.crew_presence(), public.search_messages(text), public.start_dm(uuid),
  public.delete_message(uuid), public.mark_read(uuid), public.set_status(text), public.heartbeat(),
  public.set_oversight(boolean)
  to authenticated;

-- ---------------------------------------------------------------- live delivery
-- Realtime applies the same read policy, so people only receive messages they could read.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Fail the migration if a visitor can touch these tables, or a signed-in user has a privilege that skips the rules.
do $$
declare bad text;
begin
  select string_agg(grantee || ' ' || table_name || ' ' || privilege_type, ', ') into bad
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('conversations', 'conversation_members', 'messages', 'read_state', 'member_status', 'oversight')
    and (grantee = 'anon'
      or (grantee = 'authenticated' and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES', 'DELETE', 'UPDATE')));
  if bad is not null then raise exception 'Unexpected grants: %', bad; end if;
end $$;
