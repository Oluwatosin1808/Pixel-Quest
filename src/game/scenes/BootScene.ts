import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/gameConfig';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioManager } from '../systems/AudioManager';
import { hydrateFromSave } from '../../store/uiStore';

/**
 * Boot: validate the save file, initialise audio, then hand over to Preload.
 * Kept intentionally tiny so scene startup order is explicit.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    // Dev aid: `#textures` renders every generated sprite sheet for inspection.
    if (typeof window !== 'undefined' && window.location.hash === '#textures') {
      this.scene.start(SCENE_KEYS.preview);
      return;
    }

    const save = SaveSystem.load();
    hydrateFromSave(save);
    AudioManager.get().init(save.settings);
    this.scene.start(SCENE_KEYS.preload);
  }
}
