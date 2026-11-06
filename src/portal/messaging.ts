// Pure helpers for the Messages screen, kept apart from React so they can be tested.

export const MESSAGE_MAX = 4000;
export const STATUS_MAX = 80;

export interface ConversationRow {
  id: string;
  kind: 'dm' | 'project' | 'crew';
  project_id: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
}

export interface PersonRow {
  id: string;
  name: string;
  role_title: string;
  access_status: 'invited' | 'active' | 'revoked';
  avatar?: unknown;
}

export interface PresenceRow {
  member_id: string;
  status_text: string;
  online: boolean;
}

export interface UnreadRow {
  conversation_id: string;
  unread: number | string;
}

export interface Listed {
  id: string;
  kind: ConversationRow['kind'];
  title: string;
  /** The other person, for a direct thread the reader takes part in. */
  otherId: string | null;
  /** A direct thread between two other people, visible only while the admin has oversight on. */
  overseen: boolean;
  unread: number;
}

const KIND_ORDER = { crew: 0, project: 1, dm: 2 } as const;

/** Turns the raw rows into the sidebar list: crew room, then projects, then direct threads, each by name. */
export function buildList(
  me: string,
  conversations: ConversationRow[],
  dmMembers: Array<{ conversation_id: string; member_id: string }>,
  people: PersonRow[],
  projects: Array<{ id: string; name: string }>,
  unread: UnreadRow[],
): Listed[] {
  const name = new Map(people.map((p) => [p.id, p.name]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const count = new Map(unread.map((u) => [u.conversation_id, Number(u.unread)]));
  const list = conversations.map<Listed>((c) => {
    const members = dmMembers.filter((m) => m.conversation_id === c.id).map((m) => m.member_id);
    const mine = members.includes(me);
    const others = members.filter((m) => m !== me);
    let title = 'Crew room';
    if (c.kind === 'project') title = projectName.get(c.project_id ?? '') ?? 'Project';
    if (c.kind === 'dm')
      title = (mine ? others : members).map((m) => name.get(m) ?? 'Former member').join(' and ');
    return {
      id: c.id,
      kind: c.kind,
      title,
      otherId: c.kind === 'dm' && mine ? (others[0] ?? null) : null,
      overseen: c.kind === 'dm' && !mine,
      unread: count.get(c.id) ?? 0,
    };
  });
  return list.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      Number(a.overseen) - Number(b.overseen) ||
      a.title.localeCompare(b.title),
  );
}

export const unreadTotal = (unread: UnreadRow[]) =>
  unread.reduce((sum, u) => sum + Number(u.unread), 0);

/** "99+" keeps the badge small. */
export const badge = (n: number) => (n > 99 ? '99+' : String(n));

/** The index of the first message from someone else that arrived after the reader last looked, or -1. */
export function dividerIndex(messages: MessageRow[], me: string, lastRead: string | null): number {
  if (!lastRead) return -1;
  const at = Date.parse(lastRead);
  return messages.findIndex(
    (m) => m.author_id !== me && !m.deleted_at && Date.parse(m.created_at) > at,
  );
}

/** Adds or replaces one message, keeping the list in time order and free of duplicates. */
export function upsertMessage(list: MessageRow[], next: MessageRow): MessageRow[] {
  const without = list.filter((m) => m.id !== next.id);
  return [...without, next].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id),
  );
}

/** Trims a status line and cuts it at the limit. */
export const clampStatus = (s: string) => s.trim().slice(0, STATUS_MAX);

/** A message can be sent when it has text and fits the limit. */
export const canSend = (s: string) => s.trim().length > 0 && s.length <= MESSAGE_MAX;

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (same(d, now)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const ACCENTS = ['tomato', 'sun', 'mint', 'sky', 'lilac'] as const;
/** A steady accent colour for a person or room, so the same one always wears the same colour. */
export const accentFor = (id: string) =>
  ACCENTS[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % ACCENTS.length];
