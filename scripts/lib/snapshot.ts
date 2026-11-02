import { Snapshot } from '../../src/content/schema';

type Row = Record<string, unknown>;

/** Row shapes as stored in the backend (snake_case), mapped to the public snapshot contract. */
export interface Rows {
  members: Row[];
  projects: Row[];
  projectMembers: Array<{ project_id: string; member_id: string }>;
  settings: Row;
  repoCache: Array<{ repo: string; data: unknown }>;
}

export function buildSnapshot(rows: Rows, now = new Date()): Snapshot {
  const slugOfMember = new Map(rows.members.map((m) => [m.id, m.slug as string]));
  const slugOfProject = new Map(rows.projects.map((p) => [p.id, p.slug as string]));
  const wanted = new Set(rows.projects.map((p) => p.repo).filter(Boolean));
  return Snapshot.parse({
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    settings: {
      studioStatement: rows.settings.studio_statement,
      introEnabled: rows.settings.intro_enabled,
      soundDefault: 'off',
    },
    members: rows.members.map((m) => ({
      slug: m.slug,
      name: m.name,
      role: m.role_title,
      bio: m.bio,
      githubUsername: m.github_username ?? undefined,
      links: m.links,
      avatar: m.avatar,
    })),
    projects: rows.projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      status: p.status,
      platforms: p.platforms,
      tech: p.tech,
      links: p.links,
      repo: p.repo,
      featured: p.featured,
      screenshots: p.screenshots,
    })),
    memberships: rows.projectMembers
      .filter((pm) => slugOfMember.has(pm.member_id) && slugOfProject.has(pm.project_id))
      .map((pm) => ({
        projectSlug: slugOfProject.get(pm.project_id),
        memberSlug: slugOfMember.get(pm.member_id),
      })),
    repos: Object.fromEntries(
      rows.repoCache.filter((r) => wanted.has(r.repo)).map((r) => [r.repo, r.data]),
    ),
  });
}
