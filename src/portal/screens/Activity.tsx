import { useEffect, useState } from 'react';
import { Face } from '../Face';
import { timeLabel } from '../messaging';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { Empty, ErrorState, Loading } from '../ui';
import { must, useAsync } from '../useAsync';
import { useWorkspaceBase } from '../useWorkspaceBase';
import { activityLine, groupByDay, type ActivityRow } from '../workspace';

/** What has been happening: tasks, notes and events, newest first. It never shows message text. */
export function Activity({ me }: { me: MemberRow }) {
  const base = useWorkspaceBase(me);
  const [project, setProject] = useState('');
  const feed = useAsync(
    () =>
      must<ActivityRow[]>(
        (project
          ? supabase!.from('activity').select('*').eq('project_id', project)
          : supabase!.from('activity').select('*')
        )
          .order('at', { ascending: false })
          .limit(120),
      ),
    `activity:${project}`,
  );
  const { reload } = feed;

  useEffect(() => {
    const db = supabase!;
    const channel = db
      .channel('activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity' }, () =>
        reload(),
      )
      .subscribe();
    const poll = setInterval(reload, 30_000);
    return () => {
      clearInterval(poll);
      void db.removeChannel(channel);
    };
  }, [reload]);

  if (base.loading || feed.loading) return <Loading title="Activity" what="Loading the feed." />;
  if (base.error || !base.data)
    return (
      <ErrorState
        title="Activity"
        message={base.error ?? 'Could not load.'}
        onRetry={base.reload}
      />
    );
  if (feed.error) return <ErrorState title="Activity" message={feed.error} onRetry={feed.reload} />;

  const { person, projects } = base.data;
  const name = new Map(projects.map((p) => [p.id, p.name]));
  const groups = groupByDay(feed.data ?? []);

  return (
    <>
      <h1>Activity</h1>
      <p className="hint">
        Tasks, notes and calendar changes on the projects you can see. Messages are never shown
        here.
      </p>
      <div className="field feed-filter">
        <label htmlFor="feed-project">Show</label>
        <select id="feed-project" value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">Everything I can see</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {groups.length === 0 && (
        <Empty>Nothing yet. Add a task or a note and it will appear here.</Empty>
      )}
      {groups.map(([day, rows]) => (
        <section key={day} className="feed-day" aria-label={day}>
          <h2 className="msg-group">{day}</h2>
          <ul className="feed">
            {rows.map((r) => {
              const who = r.actor_id ? person.get(r.actor_id) : undefined;
              return (
                <li key={r.id} className="feed-item">
                  {who ? <Face person={who} size={34} /> : <span className="room-mark">a</span>}
                  <span className="grow">
                    {activityLine(who?.name.split(' ')[0], r.summary)}
                    {r.project_id && (
                      <span className="hint"> · {name.get(r.project_id) ?? 'Project'}</span>
                    )}
                  </span>
                  <time className="hint" dateTime={r.at}>
                    {timeLabel(r.at)}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
