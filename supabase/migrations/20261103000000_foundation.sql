-- Alpha Studios foundation schema, row-level security and audit log. See docs/SPEC.md sections 7 and 8.

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

create type app.member_role as enum ('crew', 'admin');
create type app.access_status as enum ('invited', 'active', 'revoked');

-- ---------------------------------------------------------------- tables

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 80),
  role_title text not null default '' check (length(role_title) <= 80),
  bio text not null default '' check (length(bio) <= 1000),
  github_username text,
  links jsonb not null default '{}'::jsonb,
  avatar jsonb not null default '{"version": 1, "options": {}}'::jsonb,
  role app.member_role not null default 'crew',
  access_status app.access_status not null default 'invited',
  created_at timestamptz not null default now()
);
-- Exactly one admin.
create unique index members_single_admin on public.members ((role)) where role = 'admin';

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 80),
  summary text not null default '' check (length(summary) <= 2000),
  status text not null default 'in-development' check (status in ('live', 'beta', 'in-development')),
  platforms text[] not null default '{}',
  tech text[] not null default '{}',
  links jsonb not null default '{}'::jsonb,
  repo text check (repo ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  featured boolean not null default false,
  screenshots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (project_id, member_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  failed_attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  studio_statement text not null default '',
  intro_enabled boolean not null default true,
  sound_default text not null default 'off' check (sound_default = 'off')
);

create table public.repo_cache (
  repo text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text,
  action text not null,
  previous jsonb,
  new jsonb
);

-- ---------------------------------------------------------------- role helpers
-- Security definer so policies can look up the caller without recursing into members' own policies.

create function app.current_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.members where user_id = auth.uid() and access_status = 'active'
$$;

create function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and role = 'admin' and access_status = 'active'
  )
$$;

create function app.is_project_member(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members
    where project_id = p and member_id = app.current_member_id()
  )
$$;

grant execute on function app.current_member_id(), app.is_admin(), app.is_project_member(uuid)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------- column guards
-- Crew may edit their own profile and their projects' details, but not identity or access fields.

create function app.guard_members() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not app.is_admin() and (
    new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.slug is distinct from old.slug or new.role is distinct from old.role
    or new.access_status is distinct from old.access_status
  ) then
    raise exception 'Only the admin can change identity or access fields' using errcode = '42501';
  end if;
  return new;
end $$;

create function app.guard_projects() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not app.is_admin() and (
    new.id is distinct from old.id or new.slug is distinct from old.slug
    or new.featured is distinct from old.featured
  ) then
    raise exception 'Only the admin can change a project''s address or featured flag' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_members before update on public.members
  for each row execute function app.guard_members();
create trigger guard_projects before update on public.projects
  for each row execute function app.guard_projects();

-- ---------------------------------------------------------------- audit
-- Written only by these triggers; clients have no write access to audit_log.

create function app.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (actor, table_name, row_id, action, previous, new)
  values (
    auth.uid(), tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'project_id' || ':' || (rec ->> 'member_id')),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

create trigger audit_members after insert or update or delete on public.members
  for each row execute function app.audit();
create trigger audit_projects after insert or update or delete on public.projects
  for each row execute function app.audit();
create trigger audit_project_members after insert or update or delete on public.project_members
  for each row execute function app.audit();
create trigger audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function app.audit();

-- ---------------------------------------------------------------- privileges and RLS

alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invites enable row level security;
alter table public.site_settings enable row level security;
alter table public.repo_cache enable row level security;
alter table public.audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

-- Visitors: read-only, and never the login link or access status on members.
grant select (id, slug, name, role_title, bio, github_username, links, avatar, created_at)
  on public.members to anon;
grant select on public.projects, public.project_members, public.site_settings, public.repo_cache to anon;

grant select, insert, update, delete on public.members, public.projects, public.project_members,
  public.invites, public.site_settings to authenticated;
grant select on public.repo_cache, public.audit_log to authenticated;

-- members
create policy members_read on public.members for select to anon, authenticated using (true);
create policy members_update_own on public.members for update to authenticated
  using (id = app.current_member_id()) with check (id = app.current_member_id());
create policy members_admin_all on public.members for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- projects
create policy projects_read on public.projects for select to anon, authenticated using (true);
create policy projects_update_own on public.projects for update to authenticated
  using (app.is_project_member(id)) with check (app.is_project_member(id));
create policy projects_admin_all on public.projects for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- project membership: crew join or leave for themselves only
create policy pm_read on public.project_members for select to anon, authenticated using (true);
create policy pm_join_self on public.project_members for insert to authenticated
  with check (member_id = app.current_member_id());
create policy pm_leave_self on public.project_members for delete to authenticated
  using (member_id = app.current_member_id());
create policy pm_admin_all on public.project_members for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- invites: admin only
create policy invites_admin_all on public.invites for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- site settings: public read, admin write
create policy settings_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin_write on public.site_settings for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- repo cache: public read, written only by the publish job (service role bypasses RLS)
create policy repo_cache_read on public.repo_cache for select to anon, authenticated using (true);

-- audit log: admin read; no write policy exists for any client role
create policy audit_admin_read on public.audit_log for select to authenticated using (app.is_admin());
