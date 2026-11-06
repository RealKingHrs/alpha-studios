import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Face } from '../Face';
import {
  accentFor,
  MESSAGE_MAX,
  STATUS_MAX,
  badge,
  buildList,
  canSend,
  clampStatus,
  dayLabel,
  dividerIndex,
  timeLabel,
  upsertMessage,
  type ConversationRow,
  type Listed,
  type MessageRow,
  type PersonRow,
  type PresenceRow,
  type UnreadRow,
} from '../messaging';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { ConfirmButton, Empty, ErrorState, Loading } from '../ui';
import { must, useAsync } from '../useAsync';

interface Props {
  me: MemberRow;
  /** The conversation id from the address, or empty. */
  open: string;
  unread: UnreadRow[];
  onRead: () => void;
}

/**
 * Messages: direct threads, one channel per project, and the crew room. Row-level security decides what appears here;
 * this screen only asks. Direct threads are private to their two people, and the admin can switch on oversight.
 */
export function Messages({ me, open, unread, onRead }: Props) {
  const admin = me.role === 'admin';
  const paused = me.access_status === 'revoked';
  const base = useAsync(async () => {
    const db = supabase!;
    const [conversations, dmMembers, people, projects] = await Promise.all([
      must<ConversationRow[]>(db.from('conversations').select('id, kind, project_id')),
      must<Array<{ conversation_id: string; member_id: string }>>(
        db.from('conversation_members').select('conversation_id, member_id'),
      ),
      must<PersonRow[]>(db.from('members').select('id, name, role_title, access_status, avatar')),
      must<Array<{ id: string; name: string }>>(db.from('projects').select('id, name')),
    ]);
    return { conversations, dmMembers, people, projects };
  }, 'base');
  const presence = usePresence();
  const oversight = useOversight(admin);

  const list = useMemo(
    () =>
      base.data
        ? buildList(
            me.id,
            base.data.conversations,
            base.data.dmMembers,
            base.data.people,
            base.data.projects,
            unread,
          )
        : [],
    [base.data, me.id, unread],
  );
  const current = list.find((c) => c.id === open) ?? null;

  // Switching oversight changes which threads exist for the admin, so reload the list.
  const { reload } = base;
  const oversightOn = oversight.on;
  useEffect(() => {
    if (admin) reload();
  }, [admin, oversightOn, reload]);

  if (!supabase) return <ErrorState title="Messages" message="The portal is not connected." />;
  if (base.loading) return <Loading title="Messages" what="Loading your conversations." />;
  if (base.error) return <ErrorState title="Messages" message={base.error} onRetry={base.reload} />;

  const people = base.data!.people;
  const presenceById = new Map(presence.map((p) => [p.member_id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));

  async function startDm(other: string) {
    const { data, error } = await supabase!.rpc('start_dm', { p_other: other });
    if (error) return;
    base.reload();
    location.hash = `#/messages/${data as string}`;
  }

  const groups: Array<[string, Listed[]]> = [
    ['Rooms', list.filter((c) => c.kind === 'crew' || c.kind === 'project')],
    ['Direct messages', list.filter((c) => c.kind === 'dm' && !c.overseen)],
    ['Other direct messages (oversight)', list.filter((c) => c.overseen)],
  ];

  return (
    <>
      <h1>Messages</h1>
      <p className="hint msg-privacy">
        Direct messages are private to the two people in them. The admin can enable oversight to
        read them. Messages are plain text and are not end-to-end encrypted.
      </p>
      {paused && (
        <p role="alert" className="state error-state">
          Your access is paused, so you cannot read or send messages.
        </p>
      )}
      {admin && <OversightSwitch state={oversight} />}
      <div className="msg">
        <aside className="msg-side" aria-label="Conversations">
          <PeopleStrip
            me={me.id}
            people={people}
            presence={presenceById}
            existing={list.filter((c) => c.otherId).map((c) => c.otherId!)}
            onPick={(id) => void startDm(id)}
            disabled={paused}
          />
          <SearchBox list={list} people={people} />
          <div className="msg-rows">
            {groups.map(
              ([label, items]) =>
                items.length > 0 && (
                  <section key={label}>
                    <h2 className="msg-group">{label}</h2>
                    <ul className="msg-list">
                      {items.map((c) => {
                        const p = c.otherId ? presenceById.get(c.otherId) : undefined;
                        const other = c.otherId ? personById.get(c.otherId) : undefined;
                        const sub = p
                          ? p.status_text || (p.online ? 'Online' : 'Away')
                          : c.kind === 'dm' && !c.overseen
                            ? 'Away'
                            : c.kind === 'project'
                              ? 'Project channel'
                              : c.kind === 'crew'
                                ? 'Everyone on the crew'
                                : 'Read-only';
                        return (
                          <li key={c.id}>
                            <a
                              href={`#/messages/${c.id}`}
                              aria-current={c.id === open ? 'page' : undefined}
                            >
                              {other ? (
                                <Face person={other} size={40} online={p?.online ?? false} />
                              ) : (
                                <span
                                  className="room-mark"
                                  style={
                                    { '--face-bg': `var(--${accentFor(c.id)})` } as CSSProperties
                                  }
                                  aria-hidden="true"
                                >
                                  {c.kind === 'crew' ? '#' : c.title.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                              <span className="msg-rowtext">
                                <span className="msg-title">{c.title}</span>
                                <span className="hint msg-note">{sub}</span>
                              </span>
                              {c.unread > 0 && (
                                <span className="badge msg-unread">
                                  {badge(c.unread)}
                                  <span className="sr-only"> unread</span>
                                </span>
                              )}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ),
            )}
          </div>
          <StatusEditor me={me} mine={presenceById.get(me.id)?.status_text ?? ''} />
        </aside>
        <section className="msg-main" aria-label="Conversation">
          {current ? (
            <Thread
              key={current.id}
              me={me}
              conversation={current}
              people={people}
              presence={current.otherId ? presenceById.get(current.otherId) : undefined}
              paused={paused}
              onRead={onRead}
            />
          ) : (
            <div className="msg-none">
              <span className="msg-none-mark" aria-hidden="true">
                a<span>.</span>
              </span>
              <p>Pick a room, or tap someone's face to start a direct message.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/** Who is online and what their status line says. Polled, because it is only a hint. */
function usePresence() {
  const [rows, setRows] = useState<PresenceRow[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase!.rpc('crew_presence');
      if (Array.isArray(data)) setRows(data as PresenceRow[]);
    };
    void load();
    const every = setInterval(() => void load(), 30_000);
    return () => clearInterval(every);
  }, []);
  return rows;
}

interface OversightState {
  on: boolean;
  ready: boolean;
  set: (v: boolean) => Promise<string | null>;
}

function useOversight(admin: boolean): OversightState {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(!admin);
  useEffect(() => {
    if (!admin) return;
    void supabase!
      .from('oversight')
      .select('enabled')
      .maybeSingle()
      .then(({ data }) => {
        setOn(Boolean(data?.enabled));
        setReady(true);
      });
  }, [admin]);
  const set = useCallback(async (v: boolean) => {
    const { error } = await supabase!.rpc('set_oversight', { p_on: v });
    if (error) return error.message;
    setOn(v);
    return null;
  }, []);
  return { on, ready, set };
}

function OversightSwitch({ state }: { state: OversightState }) {
  const [error, setError] = useState<string | null>(null);
  if (!state.ready) return null;
  return (
    <section className="panel admin-only msg-oversight" aria-label="Oversight">
      <p>
        <strong>Oversight is {state.on ? 'on' : 'off'}.</strong>{' '}
        {state.on
          ? 'You can read direct messages between other people, read-only. Switching it is recorded in the audit log.'
          : 'You cannot read direct messages between other people. Turning it on is recorded in the audit log.'}
      </p>
      <button
        type="button"
        className="secondary admin-only"
        aria-pressed={state.on}
        onClick={() => void state.set(!state.on).then(setError)}
      >
        {state.on ? 'Turn oversight off' : 'Turn oversight on'}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}

function StatusEditor({ me, mine }: { me: MemberRow; mine: string }) {
  const [text, setText] = useState(mine);
  const [note, setNote] = useState('');
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setText(mine);
  }, [mine]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase!.rpc('set_status', { p_text: clampStatus(text) });
    setNote(error ? error.message : 'Status saved.');
  }
  return (
    <form className="msg-status" onSubmit={save}>
      <label htmlFor="msg-status">Your status, {me.name.split(' ')[0]}</label>
      <div className="msg-status-row">
        <input
          id="msg-status"
          maxLength={STATUS_MAX}
          placeholder="Heads down until 5"
          value={text}
          onChange={(e) => {
            touched.current = true;
            setText(e.target.value);
          }}
        />
        <button type="submit" className="secondary">
          Save
        </button>
      </div>
      {note && (
        <p role="status" className="hint">
          {note}
        </p>
      )}
    </form>
  );
}

function PeopleStrip({
  me,
  people,
  presence,
  existing,
  onPick,
  disabled,
}: {
  me: string;
  people: PersonRow[];
  presence: Map<string, PresenceRow>;
  existing: string[];
  onPick: (id: string) => void;
  disabled: boolean;
}) {
  // Everyone on the crew is shown. Only people who have signed in can receive messages; the rest are shown
  // greyed with the reason, so nobody looks missing.
  const others = people
    .filter((p) => p.id !== me)
    .sort(
      (a, b) =>
        Number(b.access_status === 'active') - Number(a.access_status === 'active') ||
        a.name.localeCompare(b.name),
    );
  if (!others.length) return null;
  const waiting = others.filter((p) => p.access_status !== 'active').length;
  return (
    <section aria-labelledby="msg-people">
      <h2 id="msg-people" className="msg-group">
        Message someone
      </h2>
      <ul className="people-strip">
        {others.map((p) => {
          const ready = p.access_status === 'active';
          const why = p.access_status === 'revoked' ? 'access paused' : 'not signed in yet';
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`person${ready ? '' : ' is-waiting'}`}
                disabled={disabled || !ready}
                title={ready ? p.name : `${p.name}: ${why}`}
                aria-label={
                  ready
                    ? `Message ${p.name}${existing.includes(p.id) ? ', open conversation' : ''}`
                    : `${p.name}, ${why}`
                }
                onClick={() => onPick(p.id)}
              >
                <Face
                  person={p}
                  size={52}
                  online={ready ? (presence.get(p.id)?.online ?? false) : undefined}
                />
                <span className="person-name">{p.name.split(' ')[0]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {waiting > 0 && (
        <p className="hint msg-waiting">
          Greyed faces have not signed in to the portal yet, so they cannot receive messages. The
          admin sets their email and issues a PIN under Crew.
        </p>
      )}
    </section>
  );
}

function Thread({
  me,
  conversation,
  people,
  presence,
  paused,
  onRead,
}: {
  me: MemberRow;
  conversation: Listed;
  people: PersonRow[];
  presence: PresenceRow | undefined;
  paused: boolean;
  onRead: () => void;
}) {
  const name = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const other = conversation.otherId ? byId.get(conversation.otherId) : undefined;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [lastRead, setLastRead] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const readOnly = conversation.overseen || paused;

  const markRead = useCallback(() => {
    if (conversation.overseen) return;
    void supabase!.rpc('mark_read', { p_conversation: conversation.id }).then(() => onRead());
  }, [conversation.id, conversation.overseen, onRead]);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase!
      .from('messages')
      .select('id, conversation_id, author_id, body, created_at, deleted_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (e) {
      setError(e.message);
      setState('error');
      return;
    }
    setMessages((data as MessageRow[]).reverse());
    setState('ready');
  }, [conversation.id]);

  // Open: remember when they last looked (for the "New" divider), load, then mark read.
  useEffect(() => {
    let live = true;
    void (async () => {
      if (!conversation.overseen) {
        const { data } = await supabase!
          .from('read_state')
          .select('last_read_at')
          .eq('conversation_id', conversation.id)
          .maybeSingle();
        if (live) setLastRead(data?.last_read_at ?? null);
      }
      await load();
      if (live) markRead();
    })();
    return () => {
      live = false;
    };
  }, [conversation.id, conversation.overseen, load, markRead]);

  // Live delivery. If the connection is not up, reload every 10 seconds instead.
  useEffect(() => {
    const channel = supabase!
      .channel(`thread:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          if (!row?.id) return;
          setMessages((m) => upsertMessage(m, row));
          if (payload.eventType === 'INSERT' && row.author_id !== me.id) markRead();
        },
      )
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [conversation.id, me.id, markRead]);

  useEffect(() => {
    if (live) return;
    const every = setInterval(() => {
      void load().then(markRead);
    }, 10_000);
    return () => clearInterval(every);
  }, [live, load, markRead]);

  // Stay at the bottom while new messages arrive, unless the reader has scrolled up.
  useEffect(() => {
    const el = logRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const divider = dividerIndex(messages, me.id, lastRead);
  const who = (id: string | null) => (id ? (name.get(id) ?? 'Former member') : 'Former member');

  async function remove(id: string) {
    const { error: e } = await supabase!.rpc('delete_message', { p_id: id });
    if (e) setError(e.message);
    else
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, body: '', deleted_at: 'now' } : x)));
  }

  return (
    <>
      <header className="msg-head">
        {other ? (
          <Face person={other} size={52} online={presence?.online ?? false} />
        ) : (
          <span
            className="room-mark room-mark--lg"
            style={{ '--face-bg': `var(--${accentFor(conversation.id)})` } as CSSProperties}
            aria-hidden="true"
          >
            {conversation.kind === 'crew' ? '#' : conversation.title.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h2>{conversation.title}</h2>
          {presence && (
            <p className="hint">
              {presence.online ? 'Online' : 'Away'}
              {presence.status_text ? `. ${presence.status_text}` : ''}
            </p>
          )}
          {conversation.overseen && (
            <p className="hint admin-only">Read-only. You are reading this under oversight.</p>
          )}
        </div>
      </header>
      {state === 'loading' && (
        <p role="status" className="state">
          Loading messages.
        </p>
      )}
      {state === 'error' && <ErrorState message={error} onRetry={() => void load()} />}
      {state === 'ready' && (
        <div
          className="msg-log"
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label={`Messages in ${conversation.title}`}
          tabIndex={0}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {messages.length === 0 && <Empty>No messages yet. Say hello.</Empty>}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const mine = m.author_id === me.id;
            const author = m.author_id ? byId.get(m.author_id) : undefined;
            const startsRun = !prev || prev.author_id !== m.author_id || newDay;
            return (
              <div key={m.id} className={startsRun ? 'msg-run' : 'msg-cont'}>
                {newDay && <p className="msg-day">{dayLabel(m.created_at)}</p>}
                {i === divider && <p className="msg-new">New messages</p>}
                <div className={`msg-line ${mine ? 'is-mine' : ''}`}>
                  {!mine && (
                    <span className="msg-face">
                      {startsRun && author && <Face person={author} size={34} />}
                    </span>
                  )}
                  <article className={`msg-item ${mine ? 'is-mine' : ''}`}>
                    {startsRun && (
                      <p className="msg-meta">
                        <strong>{mine ? 'You' : who(m.author_id)}</strong>{' '}
                        <time dateTime={m.created_at}>{timeLabel(m.created_at)}</time>
                      </p>
                    )}
                    {m.deleted_at ? (
                      <p className="msg-body hint">This message was deleted.</p>
                    ) : (
                      <p className="msg-body" title={timeLabel(m.created_at)}>
                        {m.body}
                      </p>
                    )}
                    {mine && !m.deleted_at && (
                      <ConfirmButton
                        className="link"
                        label="Delete"
                        confirmLabel="Delete this message"
                        onConfirm={() => void remove(m.id)}
                      />
                    )}
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {readOnly ? (
        <p className="hint msg-readonly">
          {paused ? 'You cannot send messages while your access is paused.' : 'Read-only.'}
        </p>
      ) : (
        <Composer
          disabled={state !== 'ready'}
          onSend={async (body) => {
            const { data, error: e } = await supabase!
              .from('messages')
              .insert({ conversation_id: conversation.id, body, author_id: me.id })
              .select('id, conversation_id, author_id, body, created_at, deleted_at')
              .single();
            if (e) return e.message;
            stick.current = true;
            setMessages((m) => upsertMessage(m, data as MessageRow));
            return null;
          }}
        />
      )}
    </>
  );
}

function Composer({
  onSend,
  disabled,
}: {
  onSend: (body: string) => Promise<string | null>;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!canSend(text) || busy) return;
    setBusy(true);
    const problem = await onSend(text.trim());
    setBusy(false);
    setError(problem);
    if (!problem) setText('');
  }

  return (
    <form
      className="msg-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <label htmlFor="msg-text" className="sr-only">
        Write a message
      </label>
      <textarea
        id="msg-text"
        rows={2}
        maxLength={MESSAGE_MAX}
        placeholder="Write a message"
        aria-describedby="msg-keys"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void send();
          }
        }}
      />
      <p id="msg-keys" className="hint msg-keys">
        Enter sends. Shift and Enter adds a line.
      </p>
      <button type="submit" className="primary" disabled={disabled || busy || !canSend(text)}>
        Send
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}

/** Searches only the messages this person is allowed to read; the database applies that rule. */
function SearchBox({ list, people }: { list: Listed[]; people: PersonRow[] }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Array<MessageRow> | null>(null);
  const [error, setError] = useState('');
  const title = new Map(list.map((c) => [c.id, c.title]));
  const name = new Map(people.map((p) => [p.id, p.name]));

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return setHits(null);
    const { data, error: err } = await supabase!.rpc('search_messages', { p_query: q.trim() });
    if (err) return setError(err.message);
    setError('');
    setHits(data as MessageRow[]);
  }

  return (
    <form className="msg-search" onSubmit={search} role="search">
      <label htmlFor="msg-search">Search messages</label>
      <div className="msg-status-row">
        <input
          id="msg-search"
          type="search"
          maxLength={100}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!e.target.value) setHits(null);
          }}
        />
        <button type="submit" className="secondary">
          Search
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {hits && (
        <ul className="msg-hits" aria-label="Search results">
          {hits.length === 0 && <li className="hint">No messages match.</li>}
          {hits.map((m) => (
            <li key={m.id}>
              <a href={`#/messages/${m.conversation_id}`}>
                <span className="msg-title">{title.get(m.conversation_id) ?? 'Conversation'}</span>
                <span className="hint">
                  {m.author_id ? (name.get(m.author_id) ?? 'Former member') : 'Former member'},{' '}
                  {dayLabel(m.created_at)}
                </span>
                <span className="msg-snippet">{m.body.slice(0, 120)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
