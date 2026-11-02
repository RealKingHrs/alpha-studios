import { z } from 'zod';

/** The typed contract for content.json, the only data public pages read (spec section 8). */

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const url = z.string().url();

export const AvatarRecord = z.object({
  version: z.number().int().positive(),
  options: z.record(z.string(), z.number().int()),
});

export const SocialLinks = z.object({
  github: url.optional(),
  linkedin: url.optional(),
  youtube: url.optional(),
  snapchat: url.optional(),
  instagram: url.optional(),
});

export const Member = z.object({
  slug,
  name: z.string().min(1),
  role: z.string().min(1),
  bio: z.string(),
  githubUsername: z.string().optional(),
  links: SocialLinks,
  avatar: AvatarRecord,
});

export const Platform = z.enum(['ios', 'macos', 'android', 'web']);

export const Project = z.object({
  slug,
  name: z.string().min(1),
  summary: z.string(),
  status: z.enum(['live', 'beta', 'in-development']),
  platforms: z.array(Platform),
  tech: z.array(z.string()),
  links: z.object({
    appStore: url.optional(),
    playStore: url.optional(),
    github: url.optional(),
    demo: url.optional(),
  }),
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/)
    .nullable(),
  featured: z.boolean(),
  screenshots: z.array(z.object({ src: z.string(), alt: z.string() })),
});

export const Membership = z.object({ projectSlug: slug, memberSlug: slug });

export const RepoDetails = z.object({
  stars: z.number().int().nonnegative(),
  languages: z.record(z.string(), z.number().nonnegative()),
  recentCommits: z.array(
    z.object({ sha: z.string(), message: z.string(), date: z.string(), author: z.string() }),
  ),
  contributors: z.array(z.string()),
  fetchedAt: z.string(),
});

export const SiteSettings = z.object({
  studioStatement: z.string(),
  introEnabled: z.boolean(),
  soundDefault: z.literal('off'),
  contactEmail: z.string().email().optional(),
});

export const Snapshot = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string(),
    settings: SiteSettings,
    members: z.array(Member),
    projects: z.array(Project),
    memberships: z.array(Membership),
    /** Keyed by "owner/name". */
    repos: z.record(z.string(), RepoDetails),
  })
  .superRefine((s, ctx) => {
    const members = new Set(s.members.map((m) => m.slug));
    const projects = new Set(s.projects.map((p) => p.slug));
    s.memberships.forEach((m, i) => {
      if (!members.has(m.memberSlug) || !projects.has(m.projectSlug)) {
        ctx.addIssue({
          code: 'custom',
          path: ['memberships', i],
          message: 'Unknown member or project',
        });
      }
    });
  });

export type Snapshot = z.infer<typeof Snapshot>;
export type Member = z.infer<typeof Member>;
export type Project = z.infer<typeof Project>;
export type RepoDetails = z.infer<typeof RepoDetails>;
