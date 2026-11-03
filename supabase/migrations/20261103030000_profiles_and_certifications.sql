-- Batch 9: richer crew profiles, a role on each project, and certifications. All public columns stay read-only for visitors.

alter table public.members
  add column codename text not null default '' check (length(codename) <= 40),
  add column tagline text not null default '' check (length(tagline) <= 120),
  add column skills jsonb not null default '[]'::jsonb check (jsonb_typeof(skills) = 'array' and jsonb_array_length(skills) <= 12),
  add column currently text not null default '' check (length(currently) <= 160),
  add column fun_fact text not null default '' check (length(fun_fact) <= 200),
  add column pop_pick text not null default '' check (length(pop_pick) <= 80);

grant select (codename, tagline, skills, currently, fun_fact, pop_pick) on public.members to anon;

alter table public.project_members add column role text not null default '' check (length(role) <= 60);
grant update (role) on public.project_members to authenticated;
create policy pm_role_self on public.project_members for update to authenticated
  using (member_id = app.current_member_id()) with check (member_id = app.current_member_id());

-- ---------------------------------------------------------------- certifications

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  issuer text not null default '' check (length(issuer) <= 120),
  issued_on date,
  expires_on date,
  credential_url text check (credential_url is null or credential_url ~ '^https?://'),
  created_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);
create index certifications_member on public.certifications (member_id);

create trigger audit_certifications after insert or update or delete on public.certifications
  for each row execute function app.audit();

alter table public.certifications enable row level security;
grant select on public.certifications to anon;
grant select, insert, update, delete on public.certifications to authenticated;

create policy certs_read on public.certifications for select to anon, authenticated using (true);
create policy certs_own_write on public.certifications for all to authenticated
  using (member_id = app.current_member_id()) with check (member_id = app.current_member_id());
create policy certs_admin_all on public.certifications for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- ---------------------------------------------------------------- revert
-- The earlier revert function keeps handling what it knew. This one adds certifications and the new profile columns.

alter function app.revert_audit(bigint) rename to revert_audit_core;

create function app.revert_audit(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.audit_log;
  r record;
  result jsonb;
begin
  if not app.is_admin() then
    raise exception 'Only the admin can revert changes' using errcode = '42501';
  end if;
  select * into a from public.audit_log where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'No such entry.'); end if;
  if a.reverted_at is not null then return jsonb_build_object('ok', false, 'error', 'Already reverted.'); end if;

  if a.table_name = 'certifications' then
    perform set_config('app.trusted', '1', true);
    if a.action = 'INSERT' then
      delete from public.certifications where id = (a.new ->> 'id')::uuid;
    elsif a.action = 'DELETE' then
      r := jsonb_populate_record(null::public.certifications, a.previous);
      insert into public.certifications (id, member_id, title, issuer, issued_on, expires_on, credential_url, created_at)
        values (r.id, r.member_id, r.title, r.issuer, r.issued_on, r.expires_on, r.credential_url, r.created_at);
    else
      r := jsonb_populate_record(null::public.certifications, a.previous);
      update public.certifications set title = r.title, issuer = r.issuer, issued_on = r.issued_on,
        expires_on = r.expires_on, credential_url = r.credential_url where id = r.id;
    end if;
    update public.audit_log set reverted_at = now() where id = p_id;
    return jsonb_build_object('ok', true);
  end if;

  result := app.revert_audit_core(p_id);

  if (result ->> 'ok')::boolean and a.table_name = 'members' and a.action = 'UPDATE' then
    r := jsonb_populate_record(null::public.members, a.previous);
    update public.members set codename = r.codename, tagline = r.tagline, skills = r.skills,
      currently = r.currently, fun_fact = r.fun_fact, pop_pick = r.pop_pick where id = r.id;
  end if;
  return result;
end $$;

grant execute on function app.revert_audit(bigint) to authenticated, service_role;
revoke execute on function app.revert_audit_core(bigint) from public, anon, authenticated;
revoke execute on function app.revert_audit(bigint) from public, anon;
