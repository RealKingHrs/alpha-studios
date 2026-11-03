import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Snapshot } from '../src/content/schema';
import { stepLinks } from '../src/nav';
import { RoomPage } from '../src/pages/pages';
import { matchRoute } from '../src/routes';
import { contributorsWithCrew, projectLinks } from '../src/rooms';
import { HALL_Z, ROOM, buildStops, roomPoses, roomSide, roomToWorld } from '../src/vault/layout';
import { roomPoseAt } from '../src/vault/path';

const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
const base = '/alpha-studios/';
const stops = buildStops(snap.projects.map((p) => p.slug));
const link = (p: string) => base + p.replace(/^\//, '');

describe('store buttons', () => {
  it('shows a button only when its link exists', () => {
    const one = projectLinks(snap.projects[0]).map((b) => b.key);
    const two = projectLinks(snap.projects[1]).map((b) => b.key);
    expect(one).toEqual(['appStore', 'github']);
    expect(two).toEqual(['github', 'demo']);
    expect(projectLinks({ links: {} })).toEqual([]);
  });

  it('renders no App Store button for a project without that link', () => {
    const html = renderToStaticMarkup(createElement(RoomPage, { snap, slug: 'project-two', link }));
    expect(html).not.toContain('App Store');
    expect(html).not.toContain('Play Store');
    expect(html).toContain('GitHub');
    const one = renderToStaticMarkup(createElement(RoomPage, { snap, slug: 'project-one', link }));
    expect(one).toContain('App Store');
  });
});

describe('repo details and contributors', () => {
  it('maps contributors to crew by GitHub username, ignoring case', () => {
    const repo = snap.repos[snap.projects[0].repo!];
    const c = contributorsWithCrew(repo, snap.members);
    expect(c.find((x) => x.login === 'placeholder-member-one')?.member?.slug).toBe('member-one');
    expect(c.find((x) => x.login === 'outside-contributor')?.member).toBeUndefined();
    const upper = contributorsWithCrew({ contributors: ['PLACEHOLDER-MEMBER-TWO'] }, snap.members);
    expect(upper[0].member?.slug).toBe('member-two');
  });

  it('shows stars, languages, commits and contributors in the room HTML', () => {
    const html = renderToStaticMarkup(createElement(RoomPage, { snap, slug: 'project-one', link }));
    expect(html).toContain('0 stars');
    expect(html).toContain('Swift');
    expect(html).toContain('Placeholder commit 1');
    expect(html).toContain('/alpha-studios/crew/member-one/');
    expect(html).toContain('outside-contributor');
  });
});

describe('room addresses and path', () => {
  it('matches room addresses and not malformed ones', () => {
    const m = (p: string) => matchRoute(base + p, base, snap).name;
    expect(m('projects/project-one/room/')).toBe('room');
    expect(m('projects/project-one/room')).toBe('room');
    expect(m('projects/project-one/rooms/')).toBe('not-found');
    expect(m('projects/nope/room/')).toBe('not-found');
  });

  it('puts rooms on alternating sides, clear of the corridor', () => {
    expect([0, 1, 2, 3].map(roomSide)).toEqual([-1, 1, -1, 1]);
    for (const i of [0, 1]) {
      const [x, , z] = roomToWorld(i, [0, 0, 0]);
      expect(Math.abs(x)).toBe(ROOM.offset);
      expect(z).toBe(HALL_Z);
    }
  });

  it('maps a room-local entrance to the corridor wall, and the back wall away from it', () => {
    for (const i of [0, 1]) {
      const side = roomSide(i);
      const [wx] = roomToWorld(i, [0, 0, ROOM.passageEnd]);
      expect(wx).toBeCloseTo(side * 6, 5); // the corridor wall is at x = side * 6
      const [bx] = roomToWorld(i, [0, 0, -ROOM.halfD]);
      expect(Math.abs(bx)).toBeGreaterThan(ROOM.offset);
    }
  });

  it('flies pedestal, doorway, inside, and ends facing the back wall', () => {
    const i = 0;
    const poses = roomPoses(i, stops[2].pose);
    expect(roomPoseAt(poses, 0).pos).toEqual(poses[0].pos);
    expect(roomPoseAt(poses, 1).pos).toEqual(poses[1].pos);
    expect(roomPoseAt(poses, 2).pos).toEqual(poses[2].pos);
    const [door, inside] = [poses[1], poses[2]];
    expect(Math.abs(inside.pos[0])).toBeGreaterThan(Math.abs(door.pos[0]));
    const toBack = Math.hypot(inside.look[0] - inside.pos[0], inside.look[2] - inside.pos[2]);
    expect(toBack).toBeGreaterThan(5);
  });
});

describe('back and forward', () => {
  const at = (p: string) => stepLinks(matchRoute(base + p, base, snap), stops);

  it('steps stop by stop along the path', () => {
    expect(at('').back).toBeNull();
    expect(at('').forward?.path).toBe('/projects/');
    expect(at('projects/').forward?.path).toBe('/projects/project-one/');
    expect(at('projects/project-two/').forward?.path).toBe('/crew/');
    expect(at('portal/').forward).toBeNull();
  });

  it('returns from a room to its own pedestal', () => {
    const s = at('projects/project-two/room/');
    expect(s.back?.path).toBe('/projects/project-two/');
    expect(s.forward).toBeNull();
  });
});
