import { Stamp } from '../../site/fx/Stamp';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { Empty, ErrorState, Loading } from '../ui';
import { must, useAsync } from '../useAsync';

const STATUS: Record<string, string> = {
  live: 'Live',
  beta: 'Beta',
  'in-development': 'In development',
};

interface ProjectLite {
  id: string;
  name: string;
  summary: string;
  status: string;
}

/** The greeting depends on the hour. Kept as a pure function so it is easy to test. */
export const greeting = (hour: number) =>
  hour < 5 ? 'Hello' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

/** Home: what is waiting, what you are working on, and where to go next. */
export function Home({ me, unread }: { me: MemberRow; unread: number }) {
  const admin = me.role === 'admin';
  const data = useAsync(async () => {
    const db = supabase!;
    const [mine, projects, ideas, crew] = await Promise.all([
      must<Array<{ project_id: string }>>(
        db.from('project_members').select('project_id').eq('member_id', me.id),
      ),
      must<ProjectLite[]>(db.from('projects').select('id, name, summary, status').order('name')),
      db.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      db.from('members').select('id', { count: 'exact', head: true }).eq('access_status', 'active'),
    ]);
    const ids = new Set(mine.map((m) => m.project_id));
    return {
      projects: admin ? projects : projects.filter((p) => ids.has(p.id)),
      ideas: ideas.count ?? 0,
      crew: crew.count ?? 0,
    };
  }, me.id);

  if (data.loading) return <Loading title="Home" what="Loading your overview." />;
  if (data.error) return <ErrorState title="Home" message={data.error} onRetry={data.reload} />;
  const { projects, ideas, crew } = data.data!;
  const first = me.name.split(' ')[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const tiles = [
    {
      href: '#/messages',
      n: unread,
      label: unread === 1 ? 'unread message' : 'unread messages',
      c: 'tomato',
    },
    {
      href: '#/projects',
      n: projects.length,
      label: admin ? (projects.length === 1 ? 'project' : 'projects') : 'assigned to you',
      c: 'mint',
    },
    { href: '#/submissions', n: ideas, label: ideas === 1 ? 'new idea' : 'new ideas', c: 'lilac' },
    { href: admin ? '#/crew' : '#/profile', n: crew, label: 'active crew', c: 'sky' },
  ];

  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div>
          <p className="mono hint">{today}</p>
          <h1 id="home-title">
            {greeting(new Date().getHours())}, {first}.
          </h1>
          <p className="home-lead">
            {unread > 0
              ? `You have ${unread} unread ${unread === 1 ? 'message' : 'messages'} waiting.`
              : 'You are all caught up.'}{' '}
            {admin && ideas > 0
              ? `${ideas} Launchpad ${ideas === 1 ? 'idea is' : 'ideas are'} waiting for you.`
              : ''}
          </p>
        </div>
        <Stamp className="home-stamp" />
      </section>

      <ul className="tiles" aria-label="At a glance">
        {tiles.map((t) => (
          <li key={t.label}>
            <a
              className="tile"
              href={t.href}
              style={{ '--tile': `var(--${t.c})` } as React.CSSProperties}
            >
              <span className="tile-n">{t.n}</span>
              <span className="tile-l">{t.label}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="home-cols">
        <section className="panel" aria-labelledby="home-projects">
          <h2 id="home-projects">{admin ? 'All projects' : 'Your projects'}</h2>
          {projects.length ? (
            <ul className="rows">
              {projects.map((p) => (
                <li key={p.id} className="row">
                  <div className="row-head">
                    <strong className="grow">{p.name}</strong>
                    <span className="badge">{STATUS[p.status] ?? p.status}</span>
                  </div>
                  {p.summary && <p className="hint">{p.summary.slice(0, 140)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {admin
                ? 'No projects yet. Add one under Projects.'
                : 'No projects assigned to you yet. The admin assigns people to projects.'}
            </Empty>
          )}
          <a className="secondary" href="#/projects">
            Open projects
          </a>
        </section>

        <section className="panel" aria-labelledby="home-next">
          <h2 id="home-next">Jump to</h2>
          <ul className="jump">
            <li>
              <a href="#/messages">Message the crew</a>
            </li>
            <li>
              <a href="#/profile">Update your profile</a>
            </li>
            <li>
              <a href="#/avatar">Build your avatar</a>
            </li>
            <li>
              <a href="#/submissions">Read Launchpad ideas</a>
            </li>
            {admin && (
              <>
                <li>
                  <a className="admin-link" href="#/crew">
                    Add a member or issue a PIN
                  </a>
                </li>
                <li>
                  <a className="admin-link" href="#/audit">
                    Review the audit log
                  </a>
                </li>
              </>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
