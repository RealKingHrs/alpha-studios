-- Launchpad: indie and solo developers pitch projects; the admin can adopt them. The founder's credit is permanent in the app.

alter table public.projects
  add column origin text not null default 'studio' check (origin in ('studio', 'launchpad')),
  add column founder_name text not null default '' check (length(founder_name) <= 80),
  add column founder_member_id uuid references public.members (id) on delete set null,
  add column founder_credit_locked boolean not null default false;

-- A locked founder credit cannot be changed or removed from the app, by anyone, the admin included.
-- The backend owner (no signed-in user, as in the SQL editor) can, deliberately.
create function app.guard_founder_credit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    if old.founder_credit_locked then
      raise exception 'A project with a locked founder credit cannot be deleted from the app' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.founder_credit_locked and (
    new.founder_credit_locked is distinct from old.founder_credit_locked
    or new.founder_name is distinct from old.founder_name
    or new.founder_member_id is distinct from old.founder_member_id
    or new.origin is distinct from old.origin
  ) then
    raise exception 'The founder credit is locked and cannot be changed from the app' using errcode = '42501';
  end if;
  -- Only the approval function may set a credit or its lock.
  if tg_op = 'UPDATE' and not old.founder_credit_locked and coalesce(current_setting('app.trusted', true), '') <> '1' and (
    new.founder_credit_locked or new.origin is distinct from old.origin
    or new.founder_name is distinct from old.founder_name or new.founder_member_id is distinct from old.founder_member_id
  ) then
    raise exception 'Founder credit is set only by approving a Launchpad submission' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and coalesce(current_setting('app.trusted', true), '') <> '1' and (
    new.founder_credit_locked or new.origin <> 'studio' or new.founder_name <> '' or new.founder_member_id is not null
  ) then
    raise exception 'Founder credit is set only by approving a Launchpad submission' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_founder_credit_write before insert or update on public.projects
  for each row execute function app.guard_founder_credit();
create trigger guard_founder_credit_delete before delete on public.projects
  for each row execute function app.guard_founder_credit();

-- ---------------------------------------------------------------- submissions

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pitcher_name text not null check (length(pitcher_name) between 1 and 80),
  contact_email text not null default '' check (length(contact_email) <= 200),
  project_name text not null check (length(project_name) between 1 and 80),
  pitch text not null check (length(pitch) between 1 and 3000),
  platforms text[] not null default '{}',
  help_wanted text[] not null default '{}' check (help_wanted <@ array['funding', 'backend', 'frontend', 'design', 'launch', 'mentoring']),
  links jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'declined')),
  reviewer_notes text not null default '' check (length(reviewer_notes) <= 2000),
  project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now()
);
create index submissions_user on public.submissions (user_id);

-- At most five pitches a day per person, so the form cannot be used to flood the review queue.
create function app.limit_submissions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.submissions where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have sent several pitches today. Please wait a day before sending another.' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger limit_submissions before insert on public.submissions
  for each row execute function app.limit_submissions();
create trigger audit_submissions after insert or update or delete on public.submissions
  for each row execute function app.audit();

alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
grant all on public.submissions to service_role;
grant select, insert on public.submissions to authenticated;
grant update (status, reviewer_notes) on public.submissions to authenticated;

create policy submissions_own_read on public.submissions for select to authenticated
  using (user_id = auth.uid());
create policy submissions_own_insert on public.submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and reviewer_notes = '' and project_id is null);
create policy submissions_admin_read on public.submissions for select to authenticated using (app.is_admin());
create policy submissions_admin_update on public.submissions for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- ---------------------------------------------------------------- approval
-- Admin only. Makes the project, locks the founder's credit, and creates a profile the founder can claim with an invite.
create function app.approve_submission(p_id uuid, p_slug text, p_member_slug text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.submissions;
  v_member uuid;
  v_project uuid;
begin
  if not app.is_admin() then
    raise exception 'Only the admin can approve a submission' using errcode = '42501';
  end if;
  select * into s from public.submissions where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'No such submission.'); end if;
  if s.status in ('approved') then return jsonb_build_object('ok', false, 'error', 'Already approved.'); end if;

  perform set_config('app.trusted', '1', true);

  insert into public.members (slug, name, role_title, access_status)
    values (p_member_slug, s.pitcher_name, 'Founder of ' || s.project_name, 'invited')
    returning id into v_member;

  insert into public.projects (slug, name, summary, story, status, platforms, links, origin, founder_name, founder_member_id, founder_credit_locked)
    values (p_slug, s.project_name, left(s.pitch, 300), s.pitch, 'in-development',
            array(select x from unnest(s.platforms) x where x in ('ios', 'macos', 'android', 'web')),
            '{}'::jsonb, 'launchpad', s.pitcher_name, v_member, true)
    returning id into v_project;

  insert into public.project_members (project_id, member_id, role) values (v_project, v_member, 'Founder');
  update public.submissions set status = 'approved', project_id = v_project where id = p_id;

  return jsonb_build_object('ok', true, 'project', p_slug, 'member', v_member);
end $$;

revoke execute on function app.approve_submission(uuid, text, text), app.guard_founder_credit(), app.limit_submissions() from public, anon;
grant execute on function app.approve_submission(uuid, text, text) to authenticated;

create function public.approve_submission(p_id uuid, p_slug text, p_member_slug text) returns jsonb
language sql security invoker set search_path = '' as $$ select app.approve_submission(p_id, p_slug, p_member_slug) $$;
revoke execute on function public.approve_submission(uuid, text, text) from public, anon;
grant execute on function public.approve_submission(uuid, text, text) to authenticated;
