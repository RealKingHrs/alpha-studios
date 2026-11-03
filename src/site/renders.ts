import manifest from './renders.json';

/** The Blender renders that exist. A member without one keeps the live SVG character. */
export const hasRender = (slug: string) => manifest.crew.includes(slug);
export const crewRender = (link: (p: string) => string, slug: string, expr: 'a' | 'b' | 'c') =>
  link(`/3d/crew/${slug}-${expr}.webp`);
export const propRender = (
  link: (p: string) => string,
  name: 'alpha' | 'trophy' | 'briefcase' | 'phone' | 'laptop' | 'browser',
) => link(`/3d/${name}.webp`);
