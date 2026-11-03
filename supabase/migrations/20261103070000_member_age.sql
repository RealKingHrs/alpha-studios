-- Batch 18: an optional public age on each member profile.

alter table public.members
  add column age int check (age is null or age between 13 and 99);

grant select (age) on public.members to anon;

-- The revert function now also restores it.
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
      experience = r.experience, education = r.education, age = r.age where id = r.id;
  end if;
  return result;
end $$;
