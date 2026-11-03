/**
 * The PIN a crew member sets on the five wheels. Thirty-two characters, no look-alikes (no I, O, 0 or 1), so five
 * wheels give about 33 million combinations. Pure helpers so the site, the portal and the tests agree.
 */
export const PIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PIN_LENGTH = 5;
export const PIN_START = 'QZMKX';
/** Where the wheels leave the PIN for the portal to pick up. Same browser tab only; never in the address. */
export const PIN_HANDOFF_KEY = 'alpha:pin-handoff';

/** Upper case, look-alikes mapped (O to 0 is not valid, so O and I are simply dropped), anything else removed. */
export function cleanPin(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((c) => PIN_ALPHABET.includes(c))
    .join('')
    .slice(0, PIN_LENGTH);
}

export const isPin = (s: string) =>
  s.length === PIN_LENGTH && [...s].every((c) => PIN_ALPHABET.includes(c));

/** One wheel step, wrapping both ways. */
export function turnWheel(letter: string, by: number): string {
  const i = PIN_ALPHABET.indexOf(letter);
  const n = PIN_ALPHABET.length;
  return PIN_ALPHABET[((((i < 0 ? 0 : i) + by) % n) + n) % n];
}
