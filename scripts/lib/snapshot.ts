import { Snapshot } from '../../src/content/schema';

type Row = Record<string, unknown>;

/** Row shapes as stored in the backend (snake_case), mapped to the public snapshot contract. */
export interface Rows {
  members: Row[];
  projects: Row[];
  projectMembers: Array<{ project_id: string; member_id: string; role?: string }>;
  certifications?: Row[];
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
      contactEmail: rows.settings.contact_email ?? undefined,
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
      codename: m.codename ?? '',
      tagline: m.tagline ?? '',
      skills: m.skills ?? [],
      currently: m.currently ?? '',
      funFact: m.fun_fact ?? '',
      popPick: m.pop_pick ?? '',
      age: m.age ?? undefined,
      location: m.location ?? '',
      openTo: m.open_to ?? '',
      languages: m.languages ?? [],
      interests: m.interests ?? [],
      experience: m.experience ?? [],
      education: m.education ?? [],
    })),
    projects: rows.projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      story: p.story,
      status: p.status,
      platforms: p.platforms,
      tech: p.tech,
      links: p.links,
      repo: p.repo,
      featured: p.featured,
      origin: p.origin ?? 'studio',
      founderName: p.founder_name ?? '',
      screenshots: p.screenshots,
    })),
    memberships: rows.projectMembers
      .filter((pm) => slugOfMember.has(pm.member_id) && slugOfProject.has(pm.project_id))
      .map((pm) => ({
        projectSlug: slugOfProject.get(pm.project_id),
        memberSlug: slugOfMember.get(pm.member_id),
        role: pm.role ?? '',
      })),
    certifications: (rows.certifications ?? [])
      .filter((c) => slugOfMember.has(c.member_id))
      .map((c) => ({
        id: c.id,
        memberSlug: slugOfMember.get(c.member_id),
        title: c.title,
        issuer: c.issuer ?? '',
        issuedOn: c.issued_on ?? null,
        expiresOn: c.expires_on ?? null,
        url: c.credential_url ?? undefined,
        credentialId: c.credential_id ?? undefined,
        description: c.description ?? '',
      })),
    repos: Object.fromEntries(
      rows.repoCache.filter((r) => wanted.has(r.repo)).map((r) => [r.repo, r.data]),
    ),
  });
}
