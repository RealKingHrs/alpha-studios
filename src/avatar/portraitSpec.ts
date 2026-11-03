import { describeAvatar, normalizeAvatar } from './kit';

export const HEAD_SHAPES = ['oval', 'long', 'round', 'broad', 'narrow'] as const;
export const EYE_STYLES = ['dots', 'discs', 'sleepy', 'wide', 'close'] as const;
export const NOSE_STYLES = ['dot', 'triangle', 'speck', 'line'] as const;

/**
 * What to draw for a saved avatar, in plain words and numbers. This is the bridge between the stored record
 * (option numbers, frozen forever) and the drawing, so a record always draws and the drawing can be tested
 * without a browser. Colours are swatch names (e.g. "skin-3"), resolved by the stylesheet.
 */
export function portraitSpec(record: unknown) {
  const { options: o } = normalizeAvatar(record);
  const d = describeAvatar(record);
  return {
    head: {
      shape: HEAD_SHAPES[o.head],
      rx: Math.round(d.head.w * 340),
      ry: Math.round(d.head.h * 310),
    },
    skin: d.skin,
    eyes: {
      style: EYE_STYLES[o.eyes],
      gap: Math.round(d.eyes.gap * 520 * (EYE_STYLES[o.eyes] === 'close' ? 0.85 : 1)),
      y: Math.round(98 - d.eyes.y * 150),
      r: Math.round(7.5 + d.eyes.r * 120),
    },
    brows: {
      w: Math.round(d.brows.w * 620),
      t: Math.round(5 + d.brows.t * 250),
      tiltDeg: Math.round(d.brows.tilt * 57),
    },
    nose: NOSE_STYLES[o.nose],
    mouth: { kind: d.mouth.kind, w: Math.round(d.mouth.w * 900), wide: o.mouth === 1 },
    hair: d.hair,
    facial: d.facialHair,
    glasses: d.glasses,
    earrings: d.earrings,
    chain: d.chain,
    outfit: d.outfit,
  };
}

export type PortraitSpec = ReturnType<typeof portraitSpec>;

/** A stable short list of what is drawn: used to tell two avatars apart and to test every option. */
export function portraitSignature(record: unknown): string[] {
  const s = portraitSpec(record);
  return [
    `head:${s.head.shape}`,
    `skin:${s.skin}`,
    `eyes:${s.eyes.style}`,
    `brows:${s.brows.w}x${s.brows.t}@${s.brows.tiltDeg}`,
    `nose:${s.nose}`,
    `mouth:${s.mouth.kind}${s.mouth.wide ? '+' : ''}`,
    `hair:${s.hair.style}:${s.hair.color}`,
    `facial:${s.facial.style}`,
    `glasses:${s.glasses.style}:${s.glasses.color}`,
    `earrings:${s.earrings}`,
    `chain:${s.chain}`,
    `outfit:${s.outfit.style}:${s.outfit.color}`,
  ];
}

/** A small number from the options, so each character blinks on its own beat. */
export function personalSeed(record: unknown): number {
  const { options } = normalizeAvatar(record);
  return Object.values(options).reduce((n, v, i) => (n + v * (i + 3)) % 97, 0);
}
