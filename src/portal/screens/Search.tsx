import { useState } from 'react';
import { dayLabel } from '../messaging';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { Empty, ErrorState, Loading } from '../ui';
import { must, useAsync } from '../useAsync';
import { useWorkspaceBase } from '../useWorkspaceBase';
import { groupHits, type SearchHit } from '../workspace';

/** One search across the messages, tasks and notes this person is allowed to read. The database applies that rule. */
export function Search({ me, query }: { me: MemberRow; query: string }) {
  const base = useWorkspaceBase(me);
  const q = (() => {
    try {
      return decodeURIComponent(query).trim();
    } catch {
      return query.trim();
    }
  })();
  const [text, setText] = useState(q);
  const hits = useAsync(
    () =>
      q
        ? must<SearchHit[]>(supabase!.rpc('search_workspace', { p_query: q }))
        : Promise.resolve<SearchHit[]>([]),
    `search:${q}`,
  );

  const form = (
    <form
      className="search-page"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        location.hash = `#/search/${encodeURIComponent(text.trim())}`;
      }}
    >
      <label htmlFor="search-q" className="sr-only">
        Search tasks, notes and messages
      </label>
      <input
        id="search-q"
        type="search"
        maxLength={100}
        placeholder="Search tasks, notes and messages"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="primary">
        Search
      </button>
    </form>
  );

  if (hits.loading || base.loading)
    return (
      <>
        <h1>Search</h1>
        {form}
        <Loading what="Searching." />
      </>
    );
  if (hits.error)
    return (
      <>
        <h1>Search</h1>
        {form}
        <ErrorState message={hits.error} onRetry={hits.reload} />
      </>
    );

  const projects = new Map((base.data?.projects ?? []).map((p) => [p.id, p.name]));
  const groups = groupHits(hits.data ?? []);
  const href = (h: SearchHit) =>
    h.kind === 'task'
      ? `#/board/${h.project_id}`
      : h.kind === 'note'
        ? `#/notes/${h.project_id}/${h.id}`
        : `#/messages/${h.conversation_id}`;

  return (
    <>
      <h1>Search</h1>
      {form}
      {!q && <Empty>Type a word to search. You only see what you are allowed to read.</Empty>}
      {q && groups.length === 0 && <Empty>Nothing matches "{q}".</Empty>}
      {groups.map(([label, rows]) => (
        <section key={label} aria-label={label}>
          <h2 className="msg-group">
            {label} <span className="col-count">{rows.length}</span>
          </h2>
          <ul className="hits">
            {rows.map((h) => (
              <li key={`${h.kind}:${h.id}`}>
                <a href={href(h)}>
                  <span className="msg-title">
                    {h.title || h.snippet.slice(0, 80) || 'Message'}
                  </span>
                  <span className="hint">
                    {h.project_id ? `${projects.get(h.project_id) ?? 'Project'} · ` : ''}
                    {dayLabel(h.at)}
                  </span>
                  {h.title && h.snippet && <span className="msg-snippet">{h.snippet}</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
