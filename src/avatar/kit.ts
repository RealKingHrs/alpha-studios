import { z } from 'zod';

/**
 * Avatar kit, version 1. A stored avatar is only a record of option numbers; this file turns those
 * numbers into a description of parts. Entries in the tables below are frozen: stored records point at
 * them by position. To change how an existing option looks, add kit version 2 instead, and keep
 * version 1 rendering as it did (tests/fixtures/avatar-v1.json guards this).
 */
export const KIT_VERSION = 1;

export const OPTION_KEYS = [
  'head',
  'skin',
  'eyes',
  'brows',
  'nose',
  'mouth',
  'hair',
  'hairColor',
  'facialHair',
  'glasses',
  'glassesColor',
  'earrings',
  'chain',
  'outfit',
  'outfitColor',
] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export const COUNTS: Record<OptionKey, number> = {
  head: 5,
  skin: 8,
  eyes: 5,
  brows: 5,
  nose: 4,
  mouth: 5,
  hair: 8,
  hairColor: 8,
  facialHair: 4,
  glasses: 4,
  glassesColor: 5,
  earrings: 3,
  chain: 3,
  outfit: 3,
  outfitColor: 8,
};

/** Names shown in the builder, one list per option. Colour options have no names. */
export const NAMES: Partial<Record<OptionKey, string[]>> = {
  head: ['Oval', 'Long', 'Round', 'Broad', 'Narrow'],
  eyes: ['Standard', 'Wide', 'Narrow', 'Large', 'Close'],
  brows: ['Straight', 'Raised', 'Soft', 'Thick', 'Arched'],
  nose: ['Small', 'Rounded', 'Tiny', 'Long'],
  mouth: ['Smile', 'Wide smile', 'Neutral', 'Open', 'Smirk'],
  hair: ['None', 'Short', 'Buzz', 'Curly', 'Long', 'Bun', 'Spiky', 'Side part'],
  facialHair: ['None', 'Stubble', 'Moustache', 'Beard'],
  glasses: ['None', 'Round', 'Square', 'Aviator'],
  earrings: ['None', 'Stud', 'Hoop'],
  chain: ['None', 'Thin', 'Thick'],
  outfit: ['Hoodie', 'Collar', 'Tee'],
};

export const LABELS: Record<OptionKey, string> = {
  head: 'Head shape',
  skin: 'Skin tone',
  eyes: 'Eyes',
  brows: 'Brows',
  nose: 'Nose',
  mouth: 'Mouth',
  hair: 'Hairstyle',
  hairColor: 'Hair colour',
  facialHair: 'Facial hair',
  glasses: 'Glasses',
  glassesColor: 'Frame colour',
  earrings: 'Earrings',
  chain: 'Chain',
  outfit: 'Outfit',
  outfitColor: 'Outfit colour',
};

export const GROUPS: Array<{ title: string; keys: OptionKey[] }> = [
  { title: 'Head and face', keys: ['head', 'skin', 'eyes', 'brows', 'nose', 'mouth'] },
  { title: 'Hair', keys: ['hair', 'hairColor', 'facialHair'] },
  { title: 'Glasses and jewellery', keys: ['glasses', 'glassesColor', 'earrings', 'chain'] },
  { title: 'Outfit', keys: ['outfit', 'outfitColor'] },
];

// ---- frozen v1 tables ------------------------------------------------------------------------
const HEADS = [
  { w: 0.16, h: 0.19, d: 0.17 },
  { w: 0.15, h: 0.21, d: 0.16 },
  { w: 0.18, h: 0.18, d: 0.17 },
  { w: 0.17, h: 0.2, d: 0.18 },
  { w: 0.145, h: 0.18, d: 0.15 },
] as const;
const EYES = [
  { r: 0.022, gap: 0.065, y: 0.01 },
  { r: 0.028, gap: 0.07, y: 0.01 },
  { r: 0.018, gap: 0.06, y: 0.015 },
  { r: 0.03, gap: 0.075, y: 0 },
  { r: 0.024, gap: 0.055, y: 0.02 },
] as const;
const BROWS = [
  { w: 0.05, t: 0.008, tilt: 0 },
  { w: 0.055, t: 0.012, tilt: 0.15 },
  { w: 0.05, t: 0.006, tilt: -0.12 },
  { w: 0.06, t: 0.014, tilt: 0.05 },
  { w: 0.045, t: 0.01, tilt: 0.3 },
] as const;
const NOSES = [
  { r: 0.02, z: 0.02 },
  { r: 0.028, z: 0.03 },
  { r: 0.015, z: 0.015 },
  { r: 0.024, z: 0.04 },
] as const;
const MOUTHS = [
  { kind: 'smile', w: 0.05 },
  { kind: 'smile', w: 0.07 },
  { kind: 'flat', w: 0.05 },
  { kind: 'open', w: 0.04 },
  { kind: 'smirk', w: 0.05 },
] as const;
const HAIR = ['none', 'short', 'buzz', 'curly', 'long', 'bun', 'spiky', 'sidePart'] as const;
const FACIAL = ['none', 'stubble', 'moustache', 'beard'] as const;
const GLASSES = ['none', 'round', 'square', 'aviator'] as const;
const EARRINGS = ['none', 'stud', 'hoop'] as const;
const CHAIN = ['none', 'thin', 'thick'] as const;
const OUTFIT = ['hoodie', 'collar', 'tee'] as const;

// ---- the stored record -----------------------------------------------------------------------
/** What is stored: a version and the chosen option numbers. Never an image, never a photo. */
export const AvatarRecord = z.object({
  version: z.number().int().positive(),
  options: z.record(z.string(), z.number().int()),
});
export type AvatarRecord = z.infer<typeof AvatarRecord>;

export type Options = Record<OptionKey, number>;

const clamp = (n: number, count: number) => Math.max(0, Math.min(count - 1, Math.trunc(n)));

/**
 * Turn any stored value into a complete, in-range set of options. Missing options become 0,
 * out-of-range ones are clamped, unknown ones are dropped, so an old or damaged record still renders.
 */
export function normalizeAvatar(record: unknown): { version: number; options: Options } {
  // Tolerant on purpose: a bad value in one option must not spoil the others.
  const maybe = (record as { options?: unknown } | null)?.options;
  const raw: Record<string, unknown> =
    maybe && typeof maybe === 'object' ? (maybe as Record<string, unknown>) : {};
  const options = {} as Options;
  for (const key of OPTION_KEYS) {
    const v = raw[key];
    options[key] = typeof v === 'number' && Number.isFinite(v) ? clamp(v, COUNTS[key]) : 0;
  }
  return { version: KIT_VERSION, options };
}

export function emptyAvatar(): AvatarRecord {
  return { version: KIT_VERSION, options: normalizeAvatar(null).options };
}

// ---- the description of parts ----------------------------------------------------------------
export interface AvatarSpec {
  kit: number;
  head: { w: number; h: number; d: number };
  skin: string;
  eyes: { r: number; gap: number; y: number };
  brows: { w: number; t: number; tilt: number };
  nose: { r: number; z: number };
  mouth: { kind: string; w: number };
  hair: { style: string; color: string };
  facialHair: { style: string; color: string };
  glasses: { style: string; color: string };
  earrings: string;
  chain: string;
  outfit: { style: string; color: string };
}

/** Swatch names refer to the CSS variables in design/avatar-swatches.css. */
export function describeAvatar(record: unknown): AvatarSpec {
  const { options: o } = normalizeAvatar(record);
  return {
    kit: KIT_VERSION,
    head: { ...HEADS[o.head] },
    skin: `skin-${o.skin}`,
    eyes: { ...EYES[o.eyes] },
    brows: { ...BROWS[o.brows] },
    nose: { ...NOSES[o.nose] },
    mouth: { ...MOUTHS[o.mouth] },
    hair: { style: HAIR[o.hair], color: `hair-${o.hairColor}` },
    facialHair: { style: FACIAL[o.facialHair], color: `hair-${o.hairColor}` },
    glasses: { style: GLASSES[o.glasses], color: `glasses-${o.glassesColor}` },
    earrings: EARRINGS[o.earrings],
    chain: CHAIN[o.chain],
    outfit: { style: OUTFIT[o.outfit], color: `outfit-${o.outfitColor}` },
  };
}

/** Reads the swatch colours from the stylesheet. Names look like "skin-3". */
export function readSwatches(): (name: string) => string {
  const style = getComputedStyle(document.documentElement);
  return (name) => style.getPropertyValue(`--${name}`).trim() || '#888888';
}
