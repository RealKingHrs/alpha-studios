import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Snapshot } from '../src/content/schema';

describe('snapshot contract', () => {
  const raw = JSON.parse(readFileSync('content/seed/content.json', 'utf8'));

  it('accepts the seed content', () => {
    const snap = Snapshot.parse(raw);
    expect(snap.projects).toHaveLength(2);
    expect(snap.members).toHaveLength(5);
  });

  it('rejects a membership that points at an unknown member', () => {
    const bad = { ...raw, memberships: [{ projectSlug: 'project-one', memberSlug: 'nobody' }] };
    expect(Snapshot.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown schema version', () => {
    expect(Snapshot.safeParse({ ...raw, schemaVersion: 2 }).success).toBe(false);
  });
});
