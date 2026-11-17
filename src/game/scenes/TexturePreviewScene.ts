import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/gameConfig';
import { ensureTextures } from '../utils/textures';

/**
 * Development aid (hash '#textures'): renders every generated sprite sheet at
 * 4x scale so the procedural pixel art can be inspected and tuned quickly.
 * Not reachable during normal gameplay.
 */
export class TexturePreviewScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preview);
  }

  create(): void {
    ensureTextures(this);

    const entries: Array<{ key: string; frames: number }> = [
      { key: 'player_idle', frames: 4 },
      { key: 'player_run', frames: 6 },
      { key: 'player_jump', frames: 1 },
      { key: 'player_fall', frames: 1 },
      { key: 'player_attack', frames: 4 },
      { key: 'player_hurt', frames: 1 },
      { key: 'player_death', frames: 6 },
      { key: 'slime', frames: 3 },
      { key: 'coin', frames: 4 },
      { key: 'crystal', frames: 3 },
      { key: 'checkpoint', frames: 2 },
      { key: 'exit', frames: 3 },
      { key: 'slash', frames: 1 },
      { key: 'spark', frames: 1 },
      { key: 'ring', frames: 1 },
      { key: 'glow', frames: 1 },
    ];

    const scale = 4;
    let y = 24;
    let x = 16;
    let columnHeight = 0;

    for (const entry of entries) {
      const frames = this.textures.get(entry.key).getFrameNames();
      let rowWidth = 0;
      frames.forEach((frame) => {
        const tex = this.textures.get(entry.key).get(frame);
        this.add.image(x + rowWidth, y, entry.key, frame).setOrigin(0, 0).setScale(scale);
        rowWidth += tex.width * scale + 6;
        columnHeight = Math.max(columnHeight, tex.height * scale);
      });
      x += rowWidth + 24;
      if (x > 900) {
        x = 16;
        y += columnHeight + 30;
        columnHeight = 0;
      }
    }

    this.add.text(16, 4, 'TEXTURE PREVIEW — close this tab to return', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#f4c430',
    });
  }
}
