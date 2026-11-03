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
  codename: z.string().default(''),
  tagline: z.string().default(''),
  skills: z.array(z.object({ name: z.string().min(1), level: z.number().int().min(1).max(5) })).default([]),
  currently: z.string().default(''),
  funFact: z.string().default(''),
  popPick: z.string().default(''),
  location: z.string().default(''),
  openTo: z.string().default(''),
  languages: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  experience: z
    .array(
      z.object({
        title: z.string().min(1),
        org: z.string().default(''),
        from: z.string().default(''),
        to: z.string().default(''),
        note: z.string().default(''),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string().min(1),
        field: z.string().default(''),
        from: z.string().default(''),
        to: z.string().default(''),
      }),
    )
    .default([]),
});

export const Certification = z.object({
  id: z.string(),
  memberSlug: slug,
  title: z.string().min(1),
  issuer: z.string().default(''),
  issuedOn: z.string().nullable().default(null),
  expiresOn: z.string().nullable().default(null),
  url: url.optional(),
  credentialId: z.string().optional(),
  description: z.string().default(''),
});

export const Platform = z.enum(['ios', 'macos', 'android', 'web']);

export const Project = z.object({
  slug,
  name: z.string().min(1),
  summary: z.string(),
  story: z.string(),
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
  origin: z.enum(['studio', 'launchpad']).default('studio'),
  founderName: z.string().default(''),
  screenshots: z.array(
    z.object({ src: z.string(), alt: z.string(), device: z.enum(['iphone', 'android', 'mac', 'browser']) }),
  ),
});

export const Membership = z.object({ projectSlug: slug, memberSlug: slug, role: z.string().default('') });

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
    certifications: z.array(Certification).default([]),
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
export type Certification = z.infer<typeof Certification>;
export type Project = z.infer<typeof Project>;
export type RepoDetails = z.infer<typeof RepoDetails>;
