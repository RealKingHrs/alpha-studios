import { safeGet, safeSet } from '../util/storage';
import { AvatarRecord, normalizeAvatar } from './kit';

/** Where an avatar is saved. Milestone 4 uses this device; the portal swaps in the backend. */
export interface AvatarStore {
  /** Says where the avatar lives, for the confirmation message. */
  readonly where: string;
  load(): Promise<AvatarRecord | null>;
  save(record: AvatarRecord): Promise<void>;
}

const KEY = 'alpha:avatar-draft';

export class LocalAvatarStore implements AvatarStore {
  readonly where = 'on this device';

  async load(): Promise<AvatarRecord | null> {
    const raw = safeGet(KEY);
    if (!raw) return null;
    try {
      const parsed = AvatarRecord.safeParse(JSON.parse(raw));
      return parsed.success
        ? { version: parsed.data.version, options: normalizeAvatar(parsed.data).options }
        : null;
    } catch {
      return null;
    }
  }

  async save(record: AvatarRecord): Promise<void> {
    const json = JSON.stringify({
      version: record.version,
      options: normalizeAvatar(record).options,
    });
    safeSet(KEY, json);
    // Storage can refuse silently, so read it back before saying it worked.
    if (safeGet(KEY) !== json)
      throw new Error('This browser is not allowing the avatar to be saved.');
  }
}
