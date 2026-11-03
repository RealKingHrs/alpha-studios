-- Batch 16: friendlier, LinkedIn-style member details and richer certificates. Everything here is public by design:
-- members choose what to fill in, and leave a field empty to keep it off the site.

alter table public.members
  add column location text not null default '' check (length(location) <= 80),
  add column open_to text not null default '' check (length(open_to) <= 120),
  add column languages text[] not null default '{}' check (cardinality(languages) <= 8),
  add column interests text[] not null default '{}' check (cardinality(interests) <= 10),
  add column experience jsonb not null default '[]'::jsonb
    check (jsonb_typeof(experience) = 'array' and jsonb_array_length(experience) <= 8),
  add column education jsonb not null default '[]'::jsonb
    check (jsonb_typeof(education) = 'array' and jsonb_array_length(education) <= 6);

grant select (location, open_to, languages, interests, experience, education) on public.members to anon;

alter table public.certifications
  add column credential_id text check (credential_id is null or length(credential_id) <= 80),
  add column description text not null default '' check (length(description) <= 300);

-- The revert function now also restores these fields.
create or replace function app.revert_audit(p_id bigint) returns jsonb
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
      insert into public.certifications (id, member_id, title, issuer, issued_on, expires_on, credential_url, credential_id, description, created_at)
        values (r.id, r.member_id, r.title, r.issuer, r.issued_on, r.expires_on, r.credential_url, r.credential_id, r.description, r.created_at);
    else
      r := jsonb_populate_record(null::public.certifications, a.previous);
      update public.certifications set title = r.title, issuer = r.issuer, issued_on = r.issued_on,
        expires_on = r.expires_on, credential_url = r.credential_url, credential_id = r.credential_id,
        description = r.description where id = r.id;
    end if;
    update public.audit_log set reverted_at = now() where id = p_id;
    return jsonb_build_object('ok', true);
  end if;

  result := app.revert_audit_core(p_id);

  if (result ->> 'ok')::boolean and a.table_name = 'members' and a.action = 'UPDATE' then
    r := jsonb_populate_record(null::public.members, a.previous);
    update public.members set codename = r.codename, tagline = r.tagline, skills = r.skills,
      currently = r.currently, fun_fact = r.fun_fact, pop_pick = r.pop_pick,
      location = r.location, open_to = r.open_to, languages = r.languages, interests = r.interests,
      experience = r.experience, education = r.education where id = r.id;
  end if;
  return result;
end $$;
