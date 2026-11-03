import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeAvatar, type AvatarRecord } from './kit';
import type { AvatarStore } from './store';

/** Saves a member's avatar record on their own profile row. The database decides who may write it. */
export class SupabaseAvatarStore implements AvatarStore {
  readonly where = 'to your profile';
  constructor(
    private db: SupabaseClient,
    private memberId: string,
  ) {}

  async load(): Promise<AvatarRecord | null> {
    const { data, error } = await this.db
      .from('members')
      .select('avatar')
      .eq('id', this.memberId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data
      ? { version: data.avatar.version, options: normalizeAvatar(data.avatar).options }
      : null;
  }

  async save(record: AvatarRecord): Promise<void> {
    const avatar = { version: record.version, options: normalizeAvatar(record).options };
    const { data, error } = await this.db
      .from('members')
      .update({ avatar })
      .eq('id', this.memberId)
      .select('id');
    if (error) throw new Error(error.message);
    // A rule that blocks the write returns no rows rather than an error, so check.
    if (!data?.length) throw new Error('Your avatar could not be saved. Sign in again and retry.');
  }
}
