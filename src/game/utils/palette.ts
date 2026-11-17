/**
 * Cohesive 16-bit colour palette for Pixel Quest.
 * Canvas drawing uses hex strings, Phaser tinting uses integers.
 */

export const PAL = {
  // Greens
  forestDeep: '#12291f',
  forestMid: '#1e4633',
  forestLight: '#2f6b4a',
  forestBright: '#46a06a',
  moss: '#5c8a3c',

  // Teals
  teal: '#3f7f78',
  tealLight: '#63a89e',
  tealPale: '#9ad3c7',

  // Browns
  barkDark: '#2c1e13',
  bark: '#4a3320',
  brown: '#6b4a2f',
  brownLight: '#8f6b42',

  // Creams
  cream: '#f2e6c9',
  creamDim: '#cfc3a3',
  creamDark: '#9a9077',

  // Golds (rewards / interactive highlights)
  gold: '#f4c430',
  goldLight: '#ffe08a',
  goldDark: '#b8860b',

  // Charcoals (outlines / UI)
  ink: '#080b0a',
  charcoal: '#141a17',
  charcoalLight: '#26302b',
  slate: '#3a4741',

  // Accents
  red: '#c0392b',
  redLight: '#ef6a55',
  blood: '#7d2018',
  steel: '#c3cdd4',
  steelDark: '#7b8891',
  white: '#ffffff',
  black: '#000000',
  skin: '#e8b98a',
  skinShade: '#c9926a',
  hair: '#4a2f1b',
  scarf: '#f4c430',
} as const;

export type PaletteKey = keyof typeof PAL;

/** '#rrggbb' -> 0xrrggbb */
export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Convenience tints. */
export const TINT = {
  white: 0xffffff,
  red: hexToInt(PAL.redLight),
  flash: 0xffffff,
  gold: hexToInt(PAL.gold),
  dim: 0x555555,
} as const;
