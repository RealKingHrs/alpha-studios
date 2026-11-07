-- Milestone 8: the crew workspace around projects. A task board, plain-text project notes, a shared calendar,
-- an activity feed and one search across it all. Row-level security decides who reads and writes.
-- None of these tables is ever read by the publish job or put in the content snapshot.

-- ---------------------------------------------------------------- the one rule: who may work on a project
-- The admin, or someone assigned to the project. Paused and unknown people never pass, because
-- current_member_id() is null for them.
create function app.can_work_on(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.current_member_id() is not null and (app.is_admin() or app.is_project_member(p))
$$;

-- ---------------------------------------------------------------- tables
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  details text not null default '' check (length(details) <= 2000),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_id uuid references public.members (id) on delete set null,
  due_on date,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz,
  search_tsv tsvector generated always as (to_tsvector('simple'::regconfig, title || ' ' || details)) stored
);
create index tasks_by_project on public.tasks (project_id, status, created_at);
create index tasks_by_assignee on public.tasks (assignee_id) where status <> 'done';
create index tasks_search on public.tasks using gin (search_tsv);

create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null default '' check (length(body) <= 20000),
  created_by uuid references public.members (id) on delete set null,
  updated_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (to_tsvector('simple'::regconfig, title || ' ' || body)) stored
);
create index notes_by_project on public.project_notes (project_id, updated_at desc);
create index notes_search on public.project_notes using gin (search_tsv);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  details text not null default '' check (length(details) <= 1000),
  kind text not null default 'other' check (kind in ('deadline', 'launch', 'meeting', 'other')),
  starts_on date not null,
  ends_on date,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index events_by_date on public.events (starts_on);

-- What happened, for the feed. Written only by the triggers below; never holds message text.
create table public.activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  project_id uuid references public.projects (id) on delete cascade,
  actor_id uuid references public.members (id) on delete set null,
  kind text not null,
  summary text not null check (length(summary) <= 200),
  ref_id uuid
);
create index activity_recent on public.activity (at desc);

-- ---------------------------------------------------------------- guards: who wrote it, tidy fields, limits
create function app.task_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := app.current_member_id();
    if (select count(*) from public.tasks where project_id = new.project_id and status <> 'done') >= 300 then
      raise exception 'This project has 300 open tasks. Finish or remove some first.' using errcode = '54000';
    end if;
  else
    new.project_id := old.project_id;
    new.created_by := old.created_by;
  end if;
  if new.assignee_id is not null and not exists (
    select 1 from public.project_members where project_id = new.project_id and member_id = new.assignee_id
  ) then
    raise exception 'That person is not on this project' using errcode = '23514';
  end if;
  new.updated_at := now();
  if new.status <> 'done' then
    new.done_at := null;
  elsif tg_op = 'UPDATE' and old.done_at is not null then
    new.done_at := old.done_at;
  else
    new.done_at := now();
  end if;
  return new;
end $$;
create trigger task_guard before insert or update on public.tasks
  for each row execute function app.task_guard();

create function app.note_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := app.current_member_id();
  else
    new.project_id := old.project_id;
    new.created_by := old.created_by;
  end if;
  new.updated_by := app.current_member_id();
  new.updated_at := now();
  return new;
end $$;
create trigger note_guard before insert or update on public.project_notes
  for each row execute function app.note_guard();

create function app.event_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := app.current_member_id();
  else
    new.project_id := old.project_id;
    new.created_by := old.created_by;
  end if;
  return new;
end $$;
create trigger event_guard before insert or update on public.events
  for each row execute function app.event_guard();

-- ---------------------------------------------------------------- the activity feed, written by triggers only
create function app.log_activity(p_project uuid, p_kind text, p_summary text, p_ref uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity (project_id, actor_id, kind, summary, ref_id)
  values (p_project, app.current_member_id(), p_kind, left(p_summary, 200), p_ref)
$$;

create function app.task_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if tg_op = 'INSERT' then
    perform app.log_activity(new.project_id, 'task_added', 'added the task "' || left(new.title, 100) || '"', new.id);
  elsif tg_op = 'DELETE' then
    -- Deleting a whole project removes its tasks too; there is nothing left to log against then.
    if not exists (select 1 from public.projects where id = old.project_id) then return null; end if;
    perform app.log_activity(old.project_id, 'task_removed', 'removed the task "' || left(old.title, 100) || '"', null);
  elsif new.status is distinct from old.status then
    perform app.log_activity(new.project_id, 'task_moved',
      'moved "' || left(new.title, 100) || '" to ' ||
        case new.status when 'todo' then 'To do' when 'doing' then 'Doing' else 'Done' end, new.id);
  elsif new.assignee_id is distinct from old.assignee_id then
    select name into v_name from public.members where id = new.assignee_id;
    perform app.log_activity(new.project_id, 'task_assigned',
      case when v_name is null then 'unassigned "' || left(new.title, 100) || '"'
           else 'gave "' || left(new.title, 100) || '" to ' || v_name end, new.id);
  end if;
  return null;
end $$;
create trigger task_activity after insert or update or delete on public.tasks
  for each row execute function app.task_activity();

create function app.note_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := app.current_member_id();
begin
  if tg_op = 'INSERT' then
    perform app.log_activity(new.project_id, 'note_added', 'started the note "' || left(new.title, 100) || '"', new.id);
  elsif new.body is distinct from old.body or new.title is distinct from old.title then
    -- Several saves of one note by one person in ten minutes show as one line.
    update public.activity set at = now(), summary = 'edited the note "' || left(new.title, 100) || '"'
      where kind = 'note_edited' and ref_id = new.id and actor_id is not distinct from v_me
        and at > now() - interval '10 minutes';
    if not found then
      perform app.log_activity(new.project_id, 'note_edited', 'edited the note "' || left(new.title, 100) || '"', new.id);
    end if;
  end if;
  return null;
end $$;
create trigger note_activity after insert or update on public.project_notes
  for each row execute function app.note_activity();

create function app.event_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.log_activity(new.project_id, 'event_added', 'added "' || left(new.title, 100) || '" to the calendar', new.id);
  return null;
end $$;
create trigger event_activity after insert on public.events
  for each row execute function app.event_activity();

-- ---------------------------------------------------------------- privileges and row-level security
alter table public.tasks enable row level security;
alter table public.project_notes enable row level security;
alter table public.events enable row level security;
alter table public.activity enable row level security;

revoke all on public.tasks, public.project_notes, public.events, public.activity from anon, authenticated;
grant all on public.tasks, public.project_notes, public.events, public.activity to service_role;

grant select (id, project_id, title, details, status, assignee_id, due_on, created_by, created_at, updated_at, done_at)
  on public.tasks to authenticated;
grant insert (project_id, title, details, status, assignee_id, due_on) on public.tasks to authenticated;
grant update (title, details, status, assignee_id, due_on) on public.tasks to authenticated;
grant delete on public.tasks to authenticated;

grant select (id, project_id, title, body, created_by, updated_by, created_at, updated_at)
  on public.project_notes to authenticated;
grant insert (project_id, title, body) on public.project_notes to authenticated;
grant update (title, body) on public.project_notes to authenticated;
grant delete on public.project_notes to authenticated;

grant select on public.events to authenticated;
grant insert (project_id, title, details, kind, starts_on, ends_on) on public.events to authenticated;
grant update (title, details, kind, starts_on, ends_on) on public.events to authenticated;
grant delete on public.events to authenticated;

grant select on public.activity to authenticated;

create policy tasks_read on public.tasks for select to authenticated using (app.can_work_on(project_id));
create policy tasks_add on public.tasks for insert to authenticated with check (app.can_work_on(project_id));
create policy tasks_edit on public.tasks for update to authenticated
  using (app.can_work_on(project_id)) with check (app.can_work_on(project_id));
create policy tasks_remove on public.tasks for delete to authenticated using (app.can_work_on(project_id));

create policy notes_read on public.project_notes for select to authenticated using (app.can_work_on(project_id));
create policy notes_add on public.project_notes for insert to authenticated with check (app.can_work_on(project_id));
create policy notes_edit on public.project_notes for update to authenticated
  using (app.can_work_on(project_id)) with check (app.can_work_on(project_id));
create policy notes_remove on public.project_notes for delete to authenticated using (app.can_work_on(project_id));

-- Crew-wide events (no project) are read by every active member and written by the admin alone.
create policy events_read on public.events for select to authenticated
  using (app.current_member_id() is not null and (project_id is null or app.can_work_on(project_id)));
create policy events_add on public.events for insert to authenticated
  with check ((project_id is null and app.is_admin()) or (project_id is not null and app.can_work_on(project_id)));
create policy events_edit on public.events for update to authenticated
  using ((project_id is null and app.is_admin()) or (project_id is not null and app.can_work_on(project_id)))
  with check ((project_id is null and app.is_admin()) or (project_id is not null and app.can_work_on(project_id)));
create policy events_remove on public.events for delete to authenticated
  using ((project_id is null and app.is_admin()) or (project_id is not null and app.can_work_on(project_id)));

create policy activity_read on public.activity for select to authenticated
  using (app.current_member_id() is not null and (project_id is null or app.can_work_on(project_id)));

-- ---------------------------------------------------------------- one search across messages, tasks and notes
-- Runs with the owner's rights only so it can use the search columns, which signed-in users cannot select;
-- the same read rule as the screens is applied to every row.
create function public.search_workspace(p_query text) returns table (
  kind text, id uuid, project_id uuid, conversation_id uuid, title text, snippet text, at timestamptz)
language sql stable security definer set search_path = '' as $$
  with q as (select websearch_to_tsquery('simple'::regconfig, p_query) as tsq),
  hits as (
    select 'message'::text as kind, m.id, null::uuid as project_id, m.conversation_id,
           ''::text as title, left(m.body, 160) as snippet, m.created_at as at
    from public.messages m, q
    where m.deleted_at is null and app.conversation_access(m.conversation_id, false) and m.body_tsv @@ q.tsq
    union all
    select 'task', t.id, t.project_id, null::uuid, t.title, left(t.details, 160), t.updated_at
    from public.tasks t, q
    where app.can_work_on(t.project_id) and t.search_tsv @@ q.tsq
    union all
    select 'note', n.id, n.project_id, null::uuid, n.title, left(n.body, 160), n.updated_at
    from public.project_notes n, q
    where app.can_work_on(n.project_id) and n.search_tsv @@ q.tsq
  )
  select h.kind, h.id, h.project_id, h.conversation_id, h.title, h.snippet, h.at
  from hits h
  where length(btrim(coalesce(p_query, ''))) > 0
  order by h.at desc
  limit 60
$$;

-- New functions are callable by everyone by default; take that away, then grant what each needs.
revoke execute on function
  app.can_work_on(uuid), app.task_guard(), app.note_guard(), app.event_guard(), app.log_activity(uuid, text, text, uuid),
  app.task_activity(), app.note_activity(), app.event_activity(), public.search_workspace(text)
  from public, anon, authenticated;
grant execute on function app.can_work_on(uuid), public.search_workspace(text) to authenticated;

-- ---------------------------------------------------------------- live delivery
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tasks, public.activity;
  end if;
end $$;

-- Fail the migration if a visitor can touch these tables, or a signed-in user has a privilege that skips the rules.
do $$
declare bad text;
begin
  select string_agg(grantee || ' ' || table_name || ' ' || privilege_type, ', ') into bad
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('tasks', 'project_notes', 'events', 'activity')
    and (grantee = 'anon'
      or (grantee = 'authenticated' and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES'))
      or (grantee = 'authenticated' and table_name = 'activity' and privilege_type <> 'SELECT'));
  if bad is not null then raise exception 'Unexpected grants: %', bad; end if;
end $$;
