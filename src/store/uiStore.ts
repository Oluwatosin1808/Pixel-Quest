import { useSyncExternalStore } from 'react';
import type { HudState, Phase, SaveData, Settings, ToastMessage, UIState } from '../types';
import { DEFAULT_SETTINGS } from '../game/systems/SaveSystem';

/** Initial (boot) state; refreshed from the save file when the app starts. */
const initialHud: HudState = {
  health: 3,
  maxHealth: 3,
  coins: 0,
  score: 0,
  crystals: 0,
  crystalsTotal: 1,
  worldName: 'WORLD 1',
  levelName: 'MEADOW PATH',
  levelIndex: 1,
  levelsInWorld: 5,
};

let state: UIState = {
  phase: 'boot',
  hud: initialHud,
  settings: DEFAULT_SETTINGS,
  hasContinue: false,
  bestScore: 0,
  crystalsFound: 0,
  settingsReturn: 'menu',
  howtoReturn: 'menu',
  toast: null,
  notice: null,
  highestUnlockedWorld: 1,
  completedLevels: [],
  nextLevelId: null,
};

const listeners = new Set<() => void>();
let toastCounter = 0;

/** Immutable patch + notify. */
export function setUI(patch: Partial<UIState>): void {
  let changed = false;
  for (const key of Object.keys(patch) as (keyof UIState)[]) {
    if (!Object.is(state[key], patch[key])) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function setPhase(phase: Phase): void {
  setUI({ phase });
}

export function setHud(patch: Partial<HudState>): void {
  const next = { ...state.hud, ...patch };
  setUI({ hud: next });
}

export function setSettings(settings: Settings): void {
  setUI({ settings });
}

/** Push a short-lived feedback message onto the HUD. */
export function showToast(text: string, tone: ToastMessage['tone'] = 'gold'): void {
  toastCounter += 1;
  setUI({ toast: { id: toastCounter, text, tone } });
}

export function clearToast(): void {
  setUI({ toast: null });
}

/** Refresh menu-level values from a (validated) save file. */
export function hydrateFromSave(save: SaveData): void {
  setUI({
    settings: save.settings,
    bestScore: save.bestScore,
    crystalsFound: save.crystals.length,
    hasContinue:
      Object.keys(save.checkpoints).length > 0 || save.crystals.length > 0 || save.completedLevels.length > 0,
    highestUnlockedWorld: save.highestUnlockedWorld,
    completedLevels: [...save.completedLevels],
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUI(): UIState {
  return state;
}

/**
 * React hook exposing the UI state.
 * With a selector, the selector must return a stored reference or primitive
 * (e.g. `useUI((s) => s.phase)`), never a freshly created object.
 */
export function useUI(): UIState;
export function useUI<T>(selector: (state: UIState) => T): T;
export function useUI<T>(selector?: (state: UIState) => T): UIState | T {
  const read = (): UIState | T => (selector ? selector(state) : state);
  return useSyncExternalStore(subscribe, read, read);
}
