import type Phaser from 'phaser';
import { SaveSystem } from '../game/systems/SaveSystem';
import { AudioManager } from '../game/systems/AudioManager';
import { SCENE_KEYS } from '../game/config/gameConfig';
import { LEVELS, getLevel, levelForWorld } from '../game/config/levels';
import { getUI, hydrateFromSave, setPhase, setUI, showToast } from './uiStore';

/**
 * The React <-> Phaser bridge.
 *
 * React owns menus / HUD overlays; Phaser owns gameplay. Commands issued from
 * the UI are routed here to the currently active scene. All references are
 * cleared on scene shutdown / game destruction so StrictMode double-mounting
 * and restarts never leak listeners.
 */

/** Live touch-control flags polled by the gameplay scene. */
export const touchInput = {
  left: false,
  right: false,
  jump: false,
  attack: false,
};

/** Commands the active gameplay scene must implement. */
export interface GameplaySceneLike {
  pauseGame(): void;
  resumeGame(): void;
  restartLevel(): void;
  returnToMenu(): void;
}

let game: Phaser.Game | null = null;
let gameplayScene: GameplaySceneLike | null = null;

/**
 * Escape-key hand-off: React overlays and the Phaser scene both listen for
 * Escape. Whichever layer acts first marks the key as consumed so the other
 * layer does not immediately undo the transition.
 */
let escSwallow = false;

export function swallowEsc(): void {
  escSwallow = true;
}

/** Consume a pending Escape swallow (used by the gameplay scene). */
export function takeEscSwallow(): boolean {
  const value = escSwallow;
  escSwallow = false;
  return value;
}

export function attachGame(instance: Phaser.Game): void {
  game = instance;
}

export function detachGame(): void {
  game = null;
  gameplayScene = null;
  resetTouch();
}

export function attachGameplayScene(scene: GameplaySceneLike): void {
  gameplayScene = scene;
}

export function detachGameplayScene(scene: GameplaySceneLike): void {
  if (gameplayScene === scene) gameplayScene = null;
}

export function resetTouch(): void {
  touchInput.left = false;
  touchInput.right = false;
  touchInput.jump = false;
  touchInput.attack = false;
}

/** Switch to a scene by key, stopping every other active scene. */
function switchScene(key: string, data?: object): void {
  if (!game) return;
  const scenes = game.scene.getScenes(true);
  for (const scene of scenes) {
    if (scene.scene.key !== key) scene.scene.stop();
  }
  const target = game.scene.getScene(key);
  if (target) {
    target.scene.start(key, data);
  } else {
    game.scene.start(key, data);
  }
}

function hudForLevel(levelId: string) {
  const level = getLevel(levelId);
  return {
    health: 3,
    maxHealth: 3,
    coins: 0,
    score: 0,
    crystals: 0,
    crystalsTotal: 1,
    worldName: level.worldName,
    levelName: level.levelName,
    levelIndex: level.levelIndex,
    levelsInWorld: level.levelsInWorld,
  };
}

/**
 * Hand a level to the gameplay scene. `checkpoint` is the saved checkpoint
 * index to resume from (0 = level start). Run progress is never wiped here —
 * that only happens through `startNewGame`.
 */
function launchLevel(levelId: string, checkpoint: number): void {
  const save = SaveSystem.load();
  resetTouch();
  AudioManager.get().playMusic('level');
  setUI({ hud: hudForLevel(levelId), notice: null });
  SaveSystem.update({ currentLevelId: levelId });
  setPhase('playing');
  switchScene(SCENE_KEYS.level, {
    levelId,
    mode: checkpoint > 0 ? 'continue' : 'new',
    checkpoint,
    collectedCrystals: save.crystals,
  });
}

export const commands = {
  /** Play button: wipe run progress, start from World 1. */
  startNewGame(): void {
    AudioManager.get().unlock();
    SaveSystem.startNewRun();
    hydrateFromSave(SaveSystem.load());
    launchLevel(LEVELS[0].id, 0);
  },

  /** Continue button: resume the level + checkpoint the run left off on. */
  continueGame(): void {
    AudioManager.get().unlock();
    const save = SaveSystem.load();
    launchLevel(save.currentLevelId, save.checkpoints[save.currentLevelId] ?? 0);
  },

  /** Launch an individual stage at its saved checkpoint. */
  startLevel(levelId: string): void {
    AudioManager.get().unlock();
    const save = SaveSystem.load();
    launchLevel(levelId, save.checkpoints[levelId] ?? 0);
  },

  /** World select: enter a world at its first stage. */
  startWorld(worldIndex: number): void {
    commands.startLevel(levelForWorld(worldIndex).id);
  },

  /** Victory screen: advance to the next stage, or back to world select. */
  nextLevel(): void {
    const next = getUI().nextLevelId;
    if (next) commands.startLevel(next);
    else commands.openWorlds();
  },

  openMenu(): void {
    resetTouch();
    AudioManager.get().playMusic('menu');
    setPhase('menu');
    switchScene(SCENE_KEYS.menu);
  },

  openWorlds(): void {
    setPhase('worlds');
  },

  openSettings(returnTo: 'menu' | 'paused'): void {
    setUI({ settingsReturn: returnTo, notice: null });
    setPhase('settings');
  },

  openHowto(returnTo: 'menu' | 'paused'): void {
    setUI({ howtoReturn: returnTo });
    setPhase('howto');
  },

  resumeGame(): void {
    if (!gameplayScene) return;
    gameplayScene.resumeGame();
  },

  pauseGame(): void {
    if (!gameplayScene) return;
    gameplayScene.pauseGame();
  },

  restartLevel(): void {
    if (!gameplayScene) return;
    resetTouch();
    setPhase('playing');
    gameplayScene.restartLevel();
  },

  returnToMenu(): void {
    commands.openMenu();
  },

  /** Settings screen: wipe all persisted data after confirmation. */
  resetAllData(): void {
    SaveSystem.clear();
    hydrateFromSave(SaveSystem.load());
    setUI({
      notice: 'SAVED DATA CLEARED',
      hasContinue: false,
      bestScore: 0,
      highestUnlockedWorld: 1,
      completedLevels: [],
      nextLevelId: null,
    });
    showToast('FRESH START', 'cream');
  },
};

/** Called by React when the Phaser game instance is created. */
export function notifyGameReady(): void {
  const save = SaveSystem.load();
  hydrateFromSave(save);
}
