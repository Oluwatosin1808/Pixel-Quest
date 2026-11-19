import {
  buildEmberCaverns,
  buildForgottenKingdom,
  buildFrostfallPeaks,
  buildWhisperingWoods,
  type LevelLayout,
} from './levelData';

/** Which visual theme a level is dressed in. */
export type ThemeId = 'forest' | 'cavern' | 'peaks' | 'kingdom';

/** Ambient particle preset used by the gameplay scene. */
export type AmbientId = 'forest' | 'embers' | 'snow' | 'dust' | 'wisp';

/** One screen-fixed parallax background layer. */
export interface ParallaxLayerDef {
  key: string;
  depth: number;
  factor: number;
  /** Subtle alpha flicker (used by the kingdom's watching eyes). */
  blink?: boolean;
}

/** Everything the scene needs to paint a world. */
export interface ThemeDef {
  sky: string;
  layers: ParallaxLayerDef[];
  /** Optional additive overlay painted above the sky (glow / beams). */
  overlay?: { key: string; depth: number; alpha: number; pulse?: boolean; drift?: number };
  /** Screen-fixed darkening frame painted above the world. */
  vignette?: { key: string; alpha: number; pulse?: boolean };
  ambient: AmbientId;
  /** Tint used by the checkpoint burst + crystal flash. */
  accent: number;
}

export interface LevelDef {
  /** Stable id persisted in the save file. */
  id: string;
  worldIndex: number;
  worldName: string;
  levelName: string;
  subtitle: string;
  theme: ThemeId;
  /** Short control hint shown on the signpost near the spawn. */
  hint: string;
  /** Display names of the level's sub-levels (parts), in order. */
  parts: string[];
  /**
   * First column of each sub-level after the first, in ascending order.
   * `parts.length - 1` entries; used by the scene to announce part changes.
   */
  partBoundaries: number[];
  build: () => LevelLayout;
}

const THEMES: Record<ThemeId, ThemeDef> = {
  forest: {
    sky: 'bg_sky',
    layers: [
      { key: 'bg_hills', depth: -94, factor: 0.12 },
      { key: 'bg_treeline', depth: -90, factor: 0.2 },
      { key: 'bg_treeline2', depth: -86, factor: 0.3 },
      { key: 'bg_near', depth: -70, factor: 0.45 },
    ],
    overlay: { key: 'bg_beams', depth: -60, alpha: 0.85, drift: 8 },
    ambient: 'forest',
    accent: 0xf4c430,
  },
  cavern: {
    sky: 'bg_cav_sky',
    layers: [
      { key: 'bg_cav_far', depth: -94, factor: 0.1 },
      { key: 'bg_cav_teeth', depth: -88, factor: 0.22 },
      { key: 'bg_cav_mid', depth: -84, factor: 0.32 },
      { key: 'bg_cav_near', depth: -70, factor: 0.46 },
    ],
    overlay: { key: 'bg_cav_glow', depth: -62, alpha: 0.75, pulse: true },
    ambient: 'embers',
    accent: 0xff8a3c,
  },
  peaks: {
    sky: 'bg_pk_sky',
    layers: [
      { key: 'bg_pk_far', depth: -94, factor: 0.1 },
      { key: 'bg_pk_mid', depth: -88, factor: 0.22 },
      { key: 'bg_pk_near', depth: -76, factor: 0.36 },
      { key: 'bg_pk_trees', depth: -70, factor: 0.46 },
    ],
    overlay: { key: 'bg_pk_aurora', depth: -64, alpha: 0.5, drift: 5 },
    ambient: 'snow',
    accent: 0x9fd6e8,
  },
  kingdom: {
    sky: 'bg_kg_sky',
    layers: [
      { key: 'bg_kg_far', depth: -94, factor: 0.1 },
      { key: 'bg_kg_mid', depth: -88, factor: 0.22 },
      { key: 'bg_kg_eyes', depth: -82, factor: 0.28, blink: true },
      { key: 'bg_kg_near', depth: -76, factor: 0.36 },
      { key: 'bg_kg_cols', depth: -70, factor: 0.46 },
    ],
    overlay: { key: 'bg_kg_mist', depth: -64, alpha: 0.62, drift: 4 },
    vignette: { key: 'vignette', alpha: 0.6, pulse: true },
    ambient: 'wisp',
    accent: 0x8fd6b4,
  },
};

/** Every playable level, in world order. */
export const LEVELS: LevelDef[] = [
  {
    id: 'ww_1',
    worldIndex: 1,
    worldName: 'WORLD 1',
    levelName: 'WHISPERING WOODS',
    subtitle: 'Mist, moss and creeping slimes',
    theme: 'forest',
    hint: 'A/D MOVE\nSPACE JUMP\nJ SWORD',
    parts: ['MEADOW PATH', 'THE OLD BRIDGE', 'MOSSY HOLLOW', 'HILLTOP PASS', 'DEEPWOOD SHADE'],
    partBoundaries: [78, 105, 176, 203],
    build: buildWhisperingWoods,
  },
  {
    id: 'ec_1',
    worldIndex: 2,
    worldName: 'WORLD 2',
    levelName: 'EMBER CAVERNS',
    subtitle: 'Molten rock and sleeping stone',
    theme: 'cavern',
    hint: 'MIND THE\nGLOWING GAP',
    parts: ['EMBERS WAKE', 'THE LAVA LAKE', 'MOLTEN STAIRS', 'SUNKEN FORGE', 'MAGMA HEART'],
    partBoundaries: [63, 111, 143, 168],
    build: buildEmberCaverns,
  },
  {
    id: 'ff_1',
    worldIndex: 3,
    worldName: 'WORLD 3',
    levelName: 'FROSTFALL PEAKS',
    subtitle: 'Thin air and sharper teeth',
    theme: 'peaks',
    hint: 'ICE HOLDS\nMOSTLY',
    parts: ['FIRST LIGHT', 'WINDWARD RIDGE', 'ICE BOUND', 'FROZEN CHASM', 'SUMMIT STORM'],
    partBoundaries: [53, 97, 129, 155],
    build: buildFrostfallPeaks,
  },
  {
    id: 'fk_1',
    worldIndex: 4,
    worldName: 'WORLD 4',
    levelName: 'THE FORGOTTEN KINGDOM',
    subtitle: 'Ruins that remember your name',
    theme: 'kingdom',
    hint: 'THE RUINS\nREMEMBER',
    parts: ['BROKEN GATE', 'BATTLEMENT WALK', 'HALL OF KINGS', 'THE CAUSEWAY', 'THE LAST COURT'],
    partBoundaries: [59, 103, 141, 174],
    build: buildForgottenKingdom,
  },
];

/** Ids accepted anywhere a level id is persisted. */
export const LEVEL_IDS: ReadonlySet<string> = new Set(LEVELS.map((l) => l.id));

/** Ids accepted anywhere a crystal fragment id is persisted. */
export const CRYSTAL_IDS: ReadonlySet<string> = new Set(LEVELS.map((l) => `${l.id.slice(0, 2)}_crystal_1`));

export function getLevel(id: string): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export function levelForWorld(worldIndex: number): LevelDef {
  return LEVELS.find((l) => l.worldIndex === worldIndex) ?? LEVELS[0];
}

export function themeFor(level: LevelDef): ThemeDef {
  return THEMES[level.theme];
}
