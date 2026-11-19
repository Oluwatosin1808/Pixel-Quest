import { SAVE_KEY, SAVE_VERSION } from '../config/gameConfig';
import {
  CRYSTAL_IDS,
  LEVEL_IDS,
  LEVELS,
  LEVELS_PER_WORLD,
  WORLD_COUNT,
  nextLevel,
  type LevelDef,
} from '../config/levels';
import type { SaveData, Settings } from '../../types';

/** Defaults used when there is no (valid) save file. */
export const DEFAULT_SETTINGS: Settings = {
  music: true,
  sfx: true,
  musicVolume: 0.6,
  sfxVolume: 0.8,
};

const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  bestScore: 0,
  highestUnlockedWorld: 1,
  checkpoints: {},
  currentLevelId: LEVELS[0].id,
  crystals: [],
  completedLevels: [],
  settings: DEFAULT_SETTINGS,
  lastPlayedAt: 0,
};

function num01(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/**
 * Validate untrusted JSON from LocalStorage. Anything malformed is replaced
 * with defaults instead of throwing, so a corrupt save can never crash the game.
 */
function validate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SAVE, settings: { ...DEFAULT_SETTINGS } };
  const obj = raw as Partial<SaveData>;

  const settingsRaw = (typeof obj.settings === 'object' && obj.settings !== null ? obj.settings : {}) as Partial<Settings>;
  const settings: Settings = {
    music: typeof settingsRaw.music === 'boolean' ? settingsRaw.music : DEFAULT_SETTINGS.music,
    sfx: typeof settingsRaw.sfx === 'boolean' ? settingsRaw.sfx : DEFAULT_SETTINGS.sfx,
    musicVolume: num01(settingsRaw.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: num01(settingsRaw.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
  };

  const crystals = Array.isArray(obj.crystals) ? obj.crystals.filter((c): c is string => typeof c === 'string' && CRYSTAL_IDS.has(c)) : [];
  const completedLevels = Array.isArray(obj.completedLevels)
    ? obj.completedLevels.filter((c): c is string => typeof c === 'string' && LEVEL_IDS.has(c))
    : [];

  // Per-level checkpoints, migrating the single-checkpoint v1 field.
  const checkpoints: Record<string, number> = {};
  if (typeof obj.checkpoints === 'object' && obj.checkpoints !== null) {
    for (const [id, value] of Object.entries(obj.checkpoints as Record<string, unknown>)) {
      if (!LEVEL_IDS.has(id)) continue;
      const index = clampInt(value, 0, 8, 0);
      if (index > 0) checkpoints[id] = index;
    }
  } else if (typeof (obj as { checkpoint?: unknown }).checkpoint === 'number') {
    const legacy = clampInt((obj as { checkpoint?: unknown }).checkpoint, 0, 8, 0);
    if (legacy > 0) checkpoints[LEVELS[0].id] = legacy;
  }

  const currentLevelId =
    typeof obj.currentLevelId === 'string' && LEVEL_IDS.has(obj.currentLevelId) ? obj.currentLevelId : LEVELS[0].id;

  return {
    version: SAVE_VERSION,
    bestScore: clampInt(obj.bestScore, 0, 99_999_999, 0),
    highestUnlockedWorld: clampInt(obj.highestUnlockedWorld, 1, WORLD_COUNT, 1),
    checkpoints,
    currentLevelId,
    crystals: [...new Set(crystals)],
    completedLevels: [...new Set(completedLevels)],
    settings,
    lastPlayedAt: typeof obj.lastPlayedAt === 'number' && Number.isFinite(obj.lastPlayedAt) ? obj.lastPlayedAt : 0,
  };
}

/** LocalStorage-backed persistence layer. */
export class SaveSystem {
  private static cache: SaveData | null = null;

  /** Load + validate the save file (cached). */
  static load(): SaveData {
    if (SaveSystem.cache) return SaveSystem.cache;
    let data: SaveData;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      data = raw ? validate(JSON.parse(raw)) : validate(null);
    } catch {
      data = validate(null);
    }
    SaveSystem.cache = data;
    return data;
  }

  /** Persist a patch of the save file. */
  static update(patch: Partial<SaveData>): SaveData {
    const next: SaveData = { ...SaveSystem.load(), ...patch, lastPlayedAt: Date.now() };
    SaveSystem.cache = next;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be full or unavailable (private mode) — the game still runs.
    }
    return next;
  }

  /** Record a finished score against the best score. */
  static submitScore(score: number): SaveData {
    const current = SaveSystem.load();
    if (score <= current.bestScore) return current;
    return SaveSystem.update({ bestScore: score });
  }

  /**
   * Starting a fresh run clears per-run progress (checkpoints + crystals) but
   * keeps high scores, unlocks and settings.
   */
  static startNewRun(): SaveData {
    return SaveSystem.update({ checkpoints: {}, crystals: [], currentLevelId: LEVELS[0].id });
  }

  /** Persist audio preferences only. */
  static saveSettings(settings: Settings): SaveData {
    return SaveSystem.update({ settings });
  }

  /** Wipe everything. */
  static clear(): void {
    SaveSystem.cache = null;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  }

  /** True when the save holds meaningful progress (Continue button). */
  static hasProgress(): boolean {
    const save = SaveSystem.load();
    return Object.keys(save.checkpoints).length > 0 || save.crystals.length > 0 || save.completedLevels.length > 0;
  }

  /** Persist the checkpoint reached inside a level. */
  static setCheckpoint(levelId: string, index: number): SaveData {
    const save = SaveSystem.load();
    const checkpoints = { ...save.checkpoints };
    if (index > 0) checkpoints[levelId] = index;
    else delete checkpoints[levelId];
    return SaveSystem.update({ checkpoints });
  }

  /**
   * Record a finished stage. Clearing a stage opens the next one in the same
   * world; only the world's final stage unlocks the following world.
   */
  static completeLevel(
    levelId: string,
    worldIndex: number,
    levelIndex: number,
  ): { save: SaveData; unlockedWorld: number; next: LevelDef | null } {
    const save = SaveSystem.load();
    const completed = new Set(save.completedLevels);
    completed.add(levelId);
    const finishedWorld = levelIndex >= LEVELS_PER_WORLD;
    const unlockedWorld = finishedWorld
      ? Math.max(save.highestUnlockedWorld, Math.min(WORLD_COUNT, worldIndex + 1))
      : save.highestUnlockedWorld;
    const checkpoints = { ...save.checkpoints };
    delete checkpoints[levelId];
    const next = SaveSystem.update({
      completedLevels: [...completed],
      highestUnlockedWorld: unlockedWorld,
      checkpoints,
    });
    return { save: next, unlockedWorld, next: nextLevel(levelId) };
  }
}
