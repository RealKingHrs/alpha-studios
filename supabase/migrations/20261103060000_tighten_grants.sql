-- Audit fix: `certifications` was created after the earlier "revoke all" and so inherited the platform's default
-- grants for anon and authenticated, including TRUNCATE, TRIGGER and REFERENCES, which row-level security does not
-- cover. Row policies already blocked every write from the API; this closes the gap at the privilege level too.

revoke all on public.certifications from anon, authenticated;
grant select on public.certifications to anon;
grant select, insert, update, delete on public.certifications to authenticated;

-- Tables created from now on start with nothing for signed-out and signed-in users; each migration grants what it needs.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;

-- A check that fails the migration if any public table still gives a visitor more than read access,
-- or gives a signed-in user a privilege that skips row-level security.
do $$
declare bad text;
begin
  select string_agg(grantee || ' ' || table_name || ' ' || privilege_type, ', ') into bad
  from information_schema.role_table_grants
  where table_schema = 'public'
    and ((grantee = 'anon' and privilege_type <> 'SELECT')
      or (grantee = 'authenticated' and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')));
  if bad is not null then raise exception 'Unexpected grants: %', bad; end if;
end $$;
