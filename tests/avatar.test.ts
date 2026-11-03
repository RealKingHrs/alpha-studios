import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { Snapshot } from '../src/content/schema';
import {
  COUNTS,
  KIT_VERSION,
  OPTION_KEYS,
  describeAvatar,
  emptyAvatar,
  normalizeAvatar,
} from '../src/avatar/kit';
import { createPhotoReference } from '../src/avatar/photo';
import { LocalAvatarStore } from '../src/avatar/store';

const fixture = JSON.parse(readFileSync('tests/fixtures/avatar-v1.json', 'utf8'));
const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));

describe('version 1 fixture', () => {
  it('still produces exactly the parts it produced when the record was frozen', () => {
    expect(describeAvatar(fixture.record)).toEqual(fixture.spec);
  });

  it('keeps rendering through an older or damaged record', () => {
    expect(() =>
      describeAvatar({ version: 1, options: { head: 99, skin: -4, hair: 2.7, ghost: 1 } }),
    ).not.toThrow();
    expect(() => describeAvatar(null)).not.toThrow();
    expect(() => describeAvatar('nonsense')).not.toThrow();
    expect(() => describeAvatar({ version: 7, options: {} })).not.toThrow();
  });
});

describe('normalizing records', () => {
  it('fills missing options, clamps out-of-range ones and drops unknown ones', () => {
    const { options, version } = normalizeAvatar({
      version: 1,
      options: { head: 99, skin: -4, hair: 2.7, ghost: 1 },
    });
    expect(version).toBe(KIT_VERSION);
    expect(options.head).toBe(COUNTS.head - 1);
    expect(options.skin).toBe(0);
    expect(options.hair).toBe(2);
    expect(options.eyes).toBe(0);
    expect(Object.keys(options).sort()).toEqual([...OPTION_KEYS].sort());
  });

  it('builds every option value the builder can offer', () => {
    for (const key of OPTION_KEYS) {
      for (let v = 0; v < COUNTS[key]; v++) {
        const rec = { version: 1, options: { ...emptyAvatar().options, [key]: v } };
        expect(() => describeAvatar(rec), `${key}=${v}`).not.toThrow();
      }
    }
  });

  it('stores only option numbers: no images, no photo data', () => {
    const json = JSON.stringify(normalizeAvatar(fixture.record));
    expect(json).not.toMatch(/data:|blob:|base64|image/i);
    for (const v of Object.values(normalizeAvatar(fixture.record).options))
      expect(Number.isInteger(v)).toBe(true);
  });
});

describe('the five seed avatars', () => {
  it('are stored as versioned records and all differ', () => {
    const specs = snap.members.map((m) => {
      expect(m.avatar.version).toBe(1);
      return JSON.stringify(describeAvatar(m.avatar));
    });
    expect(new Set(specs).size).toBe(5);
  });
});

describe('saving on this device', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  };

  it('saves, and loads the same avatar back', async () => {
    vi.stubGlobal('localStorage', memory());
    const store = new LocalAvatarStore();
    expect(await store.load()).toBeNull();
    await store.save(fixture.record);
    expect(await store.load()).toEqual(fixture.record);
    vi.unstubAllGlobals();
  });

  it('says so when the browser refuses to save', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    await expect(new LocalAvatarStore().save(fixture.record)).rejects.toThrow(/not allowing/);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    await expect(new LocalAvatarStore().save(fixture.record)).rejects.toThrow();
    expect(await new LocalAvatarStore().load()).toBeNull();
    vi.unstubAllGlobals();
  });

  it('ignores a damaged saved value', async () => {
    vi.stubGlobal('localStorage', { getItem: () => '{not json', setItem: () => {} });
    expect(await new LocalAvatarStore().load()).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('reference photo stays in the browser', () => {
  const api = () => {
    const live = new Set<string>();
    let n = 0;
    return {
      live,
      createObjectURL: vi.fn(() => {
        const u = `blob:local/${n++}`;
        live.add(u);
        return u;
      }),
      revokeObjectURL: vi.fn((u: string) => void live.delete(u)),
    };
  };
  const img = new Blob(['x'], { type: 'image/jpeg' });

  it('holds one local address and releases it when replaced, cleared or left', () => {
    const a = api();
    const ref = createPhotoReference(a);
    const first = ref.set(img);
    expect(a.live.has(first)).toBe(true);
    const second = ref.set(img);
    expect(a.live.has(first)).toBe(false);
    expect(a.live.has(second)).toBe(true);
    ref.clear();
    expect(a.live.size).toBe(0);
    expect(ref.url).toBeNull();
  });

  it('refuses files that are not images or are too large', () => {
    const ref = createPhotoReference(api());
    expect(() => ref.set(new Blob(['x'], { type: 'text/plain' }))).toThrow();
    expect(() =>
      ref.set(new Blob([new Uint8Array(16 * 1024 * 1024)], { type: 'image/png' })),
    ).toThrow();
  });

  it('has no code path that sends anything over the network', () => {
    const files = ['src/avatar/photo.ts', 'src/portal/avatar/PhotoReference.tsx'];
    const forbidden =
      /\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|WebSocket|new Image\(|FileReader|toDataURL|\.upload/;
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(forbidden);
  });

  it('is the only thing in the builder that touches the file input', () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) =>
        statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
      );
    const users = walk('src').filter((f) => /type="file"/.test(readFileSync(f, 'utf8')));
    expect(users).toEqual(['src/portal/avatar/PhotoReference.tsx']);
  });
});
