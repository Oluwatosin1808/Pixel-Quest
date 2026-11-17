/** Shared application / game state types. */

/** High level application phase driving which overlay is visible. */
export type Phase =
  | 'boot'
  | 'menu'
  | 'worlds'
  | 'howto'
  | 'settings'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'victory';

/** Snapshot of live gameplay values mirrored into the React HUD. */
export interface HudState {
  health: number;
  maxHealth: number;
  coins: number;
  score: number;
  crystals: number;
  crystalsTotal: number;
  worldName: string;
  levelName: string;
}

/** Persisted audio / display preferences. */
export interface Settings {
  music: boolean;
  sfx: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

/** Persistent save file schema (validated on load). */
export interface SaveData {
  version: number;
  bestScore: number;
  highestUnlockedWorld: number;
  /** Checkpoint index reached inside each level (0 = level start). */
  checkpoints: Record<string, number>;
  /** Level the Continue button should resume. */
  currentLevelId: string;
  /** Ids of crystal fragments already collected (permanent collectibles). */
  crystals: string[];
  /** Levels finished at least once. */
  completedLevels: string[];
  settings: Settings;
  lastPlayedAt: number;
}

/** A single floating feedback message ("+10"). */
export interface ToastMessage {
  id: number;
  text: string;
  tone: 'gold' | 'teal' | 'red' | 'cream';
}

export interface UIState {
  phase: Phase;
  hud: HudState;
  settings: Settings;
  /** True when a valid save with progress exists (Continue button). */
  hasContinue: boolean;
  bestScore: number;
  /** Total crystal fragments recovered across the save file. */
  crystalsFound: number;
  /** Which screen the settings menu returns to. */
  settingsReturn: Phase;
  /** Which screen the how-to-play menu returns to. */
  howtoReturn: Phase;
  toast: ToastMessage | null;
  /** Runtime notice used for data-reset confirmation etc. */
  notice: string | null;
  /** Highest world the save file has unlocked (1..4). */
  highestUnlockedWorld: number;
  /** Ids of levels finished at least once. */
  completedLevels: string[];
}

/** Which world entries exist in the selection screen. */
export interface WorldEntry {
  id: number;
  name: string;
  subtitle: string;
  unlocked: boolean;
}
