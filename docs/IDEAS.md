# Ideas

Things that came up but are not in the spec. Nothing here is built until it moves into `docs/SPEC.md`.

- Store the studio contact email in the backend (`site_settings.contact_email`) and carry it through the publish job. The snapshot already has an optional `contactEmail`; the database column and publish mapping are missing, so the contact page shows placeholder text until then.
- Preload the lite or full 3D chunk on the first user gesture on the entrance beat to shorten the wait on slow links.
- Update the snapshot schema version policy when the first breaking change lands.
