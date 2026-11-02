import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../scripts/lib/snapshot';

describe('buildSnapshot', () => {
  const base = {
    members: [
      {
        id: 'm1',
        slug: 'ada',
        name: 'Ada',
        role_title: 'Engineer',
        bio: '',
        links: {},
        avatar: { version: 1, options: { hair: 2 } },
        github_username: 'ada',
      },
    ],
    projects: [
      {
        id: 'p1',
        slug: 'one',
        name: 'One',
        summary: '',
        status: 'live',
        platforms: ['web'],
        tech: [],
        links: {},
        repo: 'a/b',
        featured: true,
        screenshots: [],
      },
    ],
    projectMembers: [{ project_id: 'p1', member_id: 'm1' }],
    settings: { studio_statement: 'Hello.', intro_enabled: true },
    repoCache: [
      {
        repo: 'a/b',
        data: {
          stars: 3,
          languages: { Swift: 10 },
          recentCommits: [],
          contributors: ['ada'],
          fetchedAt: 'x',
        },
      },
      {
        repo: 'old/unused',
        data: { stars: 0, languages: {}, recentCommits: [], contributors: [], fetchedAt: 'x' },
      },
    ],
  };

  it('maps backend rows to the snapshot and keeps only referenced repos', () => {
    const snap = buildSnapshot(base, new Date('2026-01-01T00:00:00Z'));
    expect(snap.memberships).toEqual([{ projectSlug: 'one', memberSlug: 'ada' }]);
    expect(Object.keys(snap.repos)).toEqual(['a/b']);
    expect(snap.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never leaks login links or access fields', () => {
    const snap = buildSnapshot({
      ...base,
      members: [{ ...base.members[0], user_id: 'secret', access_status: 'active' }],
    });
    expect(JSON.stringify(snap)).not.toContain('secret');
  });

  it('rejects data that breaks the contract', () => {
    expect(() =>
      buildSnapshot({ ...base, projects: [{ ...base.projects[0], status: 'bogus' }] }),
    ).toThrow();
  });
});
