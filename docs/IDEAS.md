# Ideas

Things that came up but are not in the spec. Nothing here is built until it moves into `docs/SPEC.md`.

- Store the studio contact email in the backend (`site_settings.contact_email`) and carry it through the publish job. The snapshot already has an optional `contactEmail`; the database column and publish mapping are missing, so the contact page shows placeholder text until then.
- Update the snapshot schema version policy when the first breaking change lands.
- Screenshot upload in the project editor: resize and size-limit images and keep them in backend storage. Today the editor takes file names under `public/screens/`.
- A "Publish now" button in the admin screens that calls the publish function directly.
