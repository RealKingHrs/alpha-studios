import { describe, expect, it } from 'vitest';
import { describe as describeChange } from '../src/portal/screens/Audit';

describe('audit descriptions', () => {
  it('says plainly what changed, without the noise fields', () => {
    const text = describeChange({
      action: 'UPDATE',
      table_name: 'members',
      previous: { id: 'x', name: 'Ada', bio: 'old', user_id: 'u1' },
      new: { id: 'x', name: 'Ada', bio: 'new', user_id: 'u2' },
    });
    expect(text).toBe('Changed members Ada: bio');
  });

  it('names people and projects for joins and leaves', () => {
    const names = { members: new Map([['m1', 'Ada']]), projects: new Map([['p1', 'Project one']]) };
    const row = { project_id: 'p1', member_id: 'm1' };
    expect(
      describeChange(
        { action: 'INSERT', table_name: 'project_members', previous: null, new: row },
        names,
      ),
    ).toBe('Ada joined Project one');
    expect(
      describeChange(
        { action: 'DELETE', table_name: 'project_members', previous: row, new: null },
        names,
      ),
    ).toBe('Ada left Project one');
  });

  it('describes additions, removals and invites', () => {
    expect(
      describeChange({
        action: 'INSERT',
        table_name: 'projects',
        previous: null,
        new: { name: 'Zed' },
      }),
    ).toBe('Added projects: Zed');
    expect(
      describeChange({
        action: 'DELETE',
        table_name: 'members',
        previous: { slug: 'ada' },
        new: null,
      }),
    ).toBe('Removed members: ada');
    expect(
      describeChange({ action: 'ISSUE_INVITE', table_name: 'invites', previous: null, new: null }),
    ).toBe('Issued an invite code');
  });
});
