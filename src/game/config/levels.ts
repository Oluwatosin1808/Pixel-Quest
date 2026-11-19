import {
  buildEmberCaverns,
  buildForgottenKingdom,
  buildFrostfallPeaks,
  buildWhisperingWoods,
  sliceLayout,
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

/** One playable stage inside a world. */
export interface LevelDef {
  /** Stable id persisted in the save file (e.g. `ww_2`). */
  id: string;
  worldIndex: number;
  /** Name of the world this stage belongs to (e.g. `WHISPERING WOODS`). */
  worldTitle: string;
  /** 1-based position of this stage inside its world. */
  levelIndex: number;
  levelsInWorld: number;
  worldName: string;
  /** Name of this individual stage (e.g. `THE OLD BRIDGE`). */
  levelName: string;
  subtitle: string;
  theme: ThemeId;
  /** Short control hint shown on the signpost near the spawn. */
  hint: string;
  build: () => LevelLayout;
}

/** A full world map and the columns where it is split into standalone levels. */
interface WorldDef {
  id: string;
  worldIndex: number;
  levelName: string;
  subtitle: string;
  theme: ThemeId;
  hint: string;
  levelNames: string[];
  /** First column of stages 2..5. */
  splits: number[];
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

/** Every stage of a world is carved out of one hand-authored map. */
const WORLDS: WorldDef[] = [
  {
    id: 'ww',
    worldIndex: 1,
    levelName: 'WHISPERING WOODS',
    subtitle: 'Mist, moss and creeping slimes',
    theme: 'forest',
    hint: 'A/D MOVE\nSPACE JUMP\nJ SWORD',
    levelNames: ['MEADOW PATH', 'THE OLD BRIDGE', 'MOSSY HOLLOW', 'HILLTOP PASS', 'DEEPWOOD SHADE'],
    splits: [78, 105, 180, 203],
    build: buildWhisperingWoods,
  },
  {
    id: 'ec',
    worldIndex: 2,
    levelName: 'EMBER CAVERNS',
    subtitle: 'Molten rock and sleeping stone',
    theme: 'cavern',
    hint: 'MIND THE\nGLOWING GAP',
    levelNames: ['EMBERS WAKE', 'THE LAVA LAKE', 'MOLTEN STAIRS', 'SUNKEN FORGE', 'MAGMA HEART'],
    splits: [63, 111, 143, 168],
    build: buildEmberCaverns,
  },
  {
    id: 'ff',
    worldIndex: 3,
    levelName: 'FROSTFALL PEAKS',
    subtitle: 'Thin air and sharper teeth',
    theme: 'peaks',
    hint: 'ICE HOLDS\nMOSTLY',
    levelNames: ['FIRST LIGHT', 'WINDWARD RIDGE', 'ICE BOUND', 'FROZEN CHASM', 'SUMMIT STORM'],
    splits: [53, 97, 131, 155],
    build: buildFrostfallPeaks,
  },
  {
    id: 'fk',
    worldIndex: 4,
    levelName: 'THE FORGOTTEN KINGDOM',
    subtitle: 'Ruins that remember your name',
    theme: 'kingdom',
    hint: 'THE RUINS\nREMEMBER',
    levelNames: ['BROKEN GATE', 'BATTLEMENT WALK', 'HALL OF KINGS', 'THE CAUSEWAY', 'THE LAST COURT'],
    splits: [59, 103, 141, 174],
    build: buildForgottenKingdom,
  },
];

export const WORLD_COUNT = WORLDS.length;
export const LEVELS_PER_WORLD = 5;

/** Every playable level, grouped by world and then by stage number. */
export const LEVELS: LevelDef[] = WORLDS.flatMap((world) =>
  world.levelNames.map((levelName, i) => ({
    id: `${world.id}_${i + 1}`,
    worldIndex: world.worldIndex,
    worldTitle: world.levelName,
    levelIndex: i + 1,
    levelsInWorld: LEVELS_PER_WORLD,
    worldName: `WORLD ${world.worldIndex}`,
    levelName,
    subtitle: world.subtitle,
    theme: world.theme,
    hint: world.hint,
    build: () => {
      const full = world.build();
      const bounds = [0, ...world.splits, full.cols];
      return sliceLayout(full, bounds[i], bounds[i + 1]);
    },
  })),
);

/** Ids accepted anywhere a level id is persisted. */
export const LEVEL_IDS: ReadonlySet<string> = new Set(LEVELS.map((l) => l.id));

/** Ids accepted anywhere a crystal fragment id is persisted (one per world). */
export const CRYSTAL_IDS: ReadonlySet<string> = new Set(WORLDS.map((w) => `${w.id}_crystal_1`));

export function getLevel(id: string): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

/** First stage of a world — used when a world is selected from the menu. */
export function levelForWorld(worldIndex: number): LevelDef {
  return LEVELS.find((l) => l.worldIndex === worldIndex && l.levelIndex === 1) ?? LEVELS[0];
}

export function levelAt(worldIndex: number, levelIndex: number): LevelDef | undefined {
  return LEVELS.find((l) => l.worldIndex === worldIndex && l.levelIndex === levelIndex);
}

export function worldLevels(worldIndex: number): LevelDef[] {
  return LEVELS.filter((l) => l.worldIndex === worldIndex);
}

/**
 * The next stage in global play order. This crosses world boundaries, so the
 * victory screen flows straight from a world's finale into the next world.
 */
export function nextLevel(id: string): LevelDef | null {
  const index = LEVELS.findIndex((l) => l.id === id);
  return index >= 0 && index + 1 < LEVELS.length ? LEVELS[index + 1] : null;
}

/** A stage is open once the previous stage is cleared (or the world unlocks). */
export function isLevelUnlocked(id: string, completedLevels: string[], highestUnlockedWorld: number): boolean {
  const level = getLevel(id);
  if (level.worldIndex > highestUnlockedWorld) return false;
  if (level.levelIndex === 1) return true;
  const previous = levelAt(level.worldIndex, level.levelIndex - 1);
  return previous !== undefined && completedLevels.includes(previous.id);
}

export function themeFor(level: LevelDef): ThemeDef {
  return THEMES[level.theme];
}
