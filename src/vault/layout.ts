import type { Beat } from '../routes';

/** World layout: one corridor along -z. Units are metres. */
export const CORRIDOR = { width: 12, height: 6, front: 8, back: -78 };

export type Vec3 = [number, number, number];
export interface Pose {
  pos: Vec3;
  look: Vec3;
}
export interface Stop {
  id: string;
  path: string;
  beat: Beat;
  pose: Pose;
}

export const HALL_Z = -16;
export const PEDESTAL_GAP = 5;
export const CREW_CENTER: Vec3 = [0, 0, -30];
export const CREW_RADIUS = 8;
export const CREW_SPAN_DEG = 80;
export const ALCOVE_Z = -56;
export const DOOR_Z = -77.4;

export function pedestalPosition(i: number, n: number): Vec3 {
  return [(i - (n - 1) / 2) * PEDESTAL_GAP, 0, HALL_Z];
}

/** Busts stand on an arc that curves toward the camera. A bust's front is local +z, turned to face the arc's centre. */
export function bustPlacement(i: number, n: number): { pos: Vec3; rotY: number } {
  const step = n > 1 ? CREW_SPAN_DEG / (n - 1) : 0;
  const a = ((n > 1 ? -CREW_SPAN_DEG / 2 + i * step : 0) * Math.PI) / 180;
  return {
    pos: [
      CREW_CENTER[0] + CREW_RADIUS * Math.sin(a),
      0,
      CREW_CENTER[2] - CREW_RADIUS * Math.cos(a),
    ],
    rotY: -a,
  };
}

/** Close, lit view of one bust (a profile address). */
export function bustPose(i: number, n: number): Pose {
  const { pos } = bustPlacement(i, n);
  const dx = CREW_CENTER[0] - pos[0];
  const dz = CREW_CENTER[2] - pos[2];
  const len = Math.hypot(dx, dz) || 1;
  return {
    pos: [pos[0] + (dx / len) * 2.6, 1.55, pos[2] + (dz / len) * 2.6],
    look: [pos[0], 1.4, pos[2]],
  };
}

/** The rest stops along the path, in order. Pedestal stops depend on the projects in the snapshot. */
export function buildStops(projectSlugs: string[]): Stop[] {
  const n = projectSlugs.length;
  return [
    { id: 'entrance', path: '/', beat: 'entrance', pose: { pos: [0, 1.7, 4], look: [0, 2, -3] } },
    {
      id: 'projects',
      path: '/projects/',
      beat: 'projects',
      pose: { pos: [0, 1.7, -9], look: [0, 1.2, HALL_Z] },
    },
    ...projectSlugs.map((slug, i): Stop => {
      const [x, , z] = pedestalPosition(i, n);
      return {
        id: slug,
        path: `/projects/${slug}/`,
        beat: 'projects',
        pose: { pos: [x, 1.6, z + 3.4], look: [x, 1.4, z] },
      };
    }),
    { id: 'crew', path: '/crew/', beat: 'crew', pose: { pos: [0, 1.7, -27], look: [0, 1.3, -37] } },
    {
      id: 'contact',
      path: '/contact/',
      beat: 'contact',
      pose: { pos: [0, 1.6, ALCOVE_Z + 7], look: [0, 1.4, ALCOVE_Z] },
    },
    {
      id: 'portal',
      path: '/portal/',
      beat: 'portal',
      pose: { pos: [0, 1.6, DOOR_Z + 7], look: [0, 1.9, DOOR_Z] },
    },
  ];
}
