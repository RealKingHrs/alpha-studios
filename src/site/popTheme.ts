/**
 * A pop-culture nod, picked from what a member said they love. Everything here is original wording and simple
 * shapes: no logos, artwork, characters, costumes or quotes. Unrecognised answers get a friendly default.
 */
export type SceneId = 'lab' | 'heist' | 'blocks' | 'city' | 'diner' | 'stars';

export interface PopTheme {
  scene: SceneId;
  /** A short, playful line that appears on the card sticker. */
  caption: string;
}

const RULES: Array<[RegExp, PopTheme]> = [
  [
    /breaking bad|chemi|chemist|\blab\b|science|periodic|walter/i,
    { scene: 'lab', caption: 'Pure chemistry' },
  ],
  [
    /money heist|heist|la casa|robbery|\bplan\b|professor/i,
    { scene: 'heist', caption: 'Everything goes to plan' },
  ],
  [/minecraft|lego|\bblock|\bcube|craft/i, { scene: 'blocks', caption: 'Built block by block' }],
  [
    /gta|grand theft|vice city|open world|los santos/i,
    { scene: 'city', caption: 'Open-world energy' },
  ],
  [/pulp|tarantino|diner|noir|crime|film|movie/i, { scene: 'diner', caption: 'Diner-booth cool' }],
];

export function popTheme(pick: string | undefined | null): PopTheme {
  const text = (pick ?? '').trim();
  if (text) for (const [re, theme] of RULES) if (re.test(text)) return theme;
  return { scene: 'stars', caption: text ? 'Fan favourite' : 'Always up for fun' };
}
