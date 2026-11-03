import type { Member, Project, RepoDetails } from './content/schema';

export interface ProjectLink {
  key: 'appStore' | 'playStore' | 'github' | 'demo';
  label: string;
  href: string;
}

/** The buttons a visitor can use to try a project. A button exists only when its link does. */
export function projectLinks(project: Pick<Project, 'links'>): ProjectLink[] {
  const l = project.links;
  const all: Array<[ProjectLink['key'], string, string | undefined]> = [
    ['appStore', 'App Store', l.appStore],
    ['playStore', 'Play Store', l.playStore],
    ['github', 'GitHub', l.github],
    ['demo', 'Open the live site', l.demo],
  ];
  return all
    .filter((x): x is [ProjectLink['key'], string, string] => !!x[2])
    .map(([key, label, href]) => ({ key, label, href }));
}

export interface Contributor {
  login: string;
  /** Set when the GitHub username matches a crew profile. */
  member?: Member;
}

/** Match repo contributors to crew profiles by GitHub username, ignoring case. */
export function contributorsWithCrew(
  repo: Pick<RepoDetails, 'contributors'>,
  members: Member[],
): Contributor[] {
  const byLogin = new Map(
    members.filter((m) => m.githubUsername).map((m) => [m.githubUsername!.toLowerCase(), m]),
  );
  return repo.contributors.map((login) => ({ login, member: byLogin.get(login.toLowerCase()) }));
}

export const platformLabel: Record<Project['platforms'][number], string> = {
  ios: 'iOS',
  macos: 'macOS',
  android: 'Android',
  web: 'Web',
};

export const statusLabel: Record<Project['status'], string> = {
  live: 'Live',
  beta: 'Beta',
  'in-development': 'In development',
};
