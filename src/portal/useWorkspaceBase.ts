import { supabase } from './supabase';
import type { MemberRow } from './types';
import { must, useAsync } from './useAsync';

export interface Person {
  id: string;
  name: string;
  avatar?: unknown;
  access_status: 'invited' | 'active' | 'revoked';
}

export interface ProjectLite {
  id: string;
  name: string;
  status: string;
}

/**
 * What every workspace screen needs: the projects this person can work on (all of them for the admin, the assigned
 * ones for crew), the people with their faces, and who is on each project.
 */
export function useWorkspaceBase(me: MemberRow) {
  return useAsync(async () => {
    const db = supabase!;
    const [projects, people, links, channels] = await Promise.all([
      must<ProjectLite[]>(db.from('projects').select('id, name, status').order('name')),
      must<Person[]>(db.from('members').select('id, name, avatar, access_status').order('name')),
      must<Array<{ project_id: string; member_id: string }>>(
        db.from('project_members').select('project_id, member_id'),
      ),
      must<Array<{ id: string; project_id: string | null }>>(
        db.from('conversations').select('id, project_id').eq('kind', 'project'),
      ),
    ]);
    const team = new Map<string, string[]>();
    for (const l of links) team.set(l.project_id, [...(team.get(l.project_id) ?? []), l.member_id]);
    const mine = new Set(links.filter((l) => l.member_id === me.id).map((l) => l.project_id));
    const accessible = me.role === 'admin' ? projects : projects.filter((p) => mine.has(p.id));
    return {
      projects: accessible,
      people,
      person: new Map(people.map((p) => [p.id, p])),
      team,
      channel: new Map(channels.map((c) => [c.project_id ?? '', c.id])),
    };
  }, `wsbase:${me.id}`);
}

export type WorkspaceBase = NonNullable<ReturnType<typeof useWorkspaceBase>['data']>;
