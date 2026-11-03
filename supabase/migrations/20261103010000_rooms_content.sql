-- Milestone 3: a longer story for each project, and a contact email for the studio.
alter table public.projects
  add column story text not null default '' check (length(story) <= 3000);

alter table public.site_settings
  add column contact_email text check (contact_email ~ '^[^@\s]+@[^@\s]+$');
