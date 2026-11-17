import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/gameConfig';
import { ensureTextures } from '../utils/textures';

/**
 * Preload: shows a short loading screen while every procedural texture is
 * generated, then moves on to the main menu. All generation is idempotent so
 * scene restarts never duplicate textures.
 */
export class PreloadScene extends Phaser.Scene {
  private blocks: Phaser.GameObjects.Rectangle[] = [];
  private started = false;

  constructor() {
    super(SCENE_KEYS.preload);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.text(cx, cy - 26, 'PIXEL QUEST', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#f4c430',
      stroke: '#080b0a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, cy + 6, 'FORGING THE WOODS...', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#cfc3a3',
    }).setOrigin(0.5);

    // Loading blocks.
    const blockCount = 12;
    const blockW = 8;
    const gap = 3;
    const totalW = blockCount * (blockW + gap) - gap;
    const startX = cx - totalW / 2;
    this.blocks = [];
    for (let i = 0; i < blockCount; i++) {
      this.blocks.push(
        this.add.rectangle(startX + i * (blockW + gap), cy + 24, blockW, 6, 0x26302b).setStrokeStyle(1, 0x3a4741),
      );
    }

    // Ensure the pixel font is available before gameplay text is created.
    if (document.fonts) {
      void document.fonts.load('8px "Press Start 2P"').catch(() => undefined);
    }

    this.time.delayedCall(60, () => this.generate());
  }

  private generate(): void {
    if (this.started) return;
    this.started = true;

    try {
      ensureTextures(this);
    } catch (error) {
      // Texture generation should never hard-fail the game; log and continue.
      console.error('[PixelQuest] texture generation failed', error);
    }

    // Animate the loading bar for a few frames so the transition feels intentional.
    let lit = 0;
    const tick = this.time.addEvent({
      delay: 40,
      repeat: this.blocks.length,
      callback: () => {
        if (lit < this.blocks.length) {
          this.blocks[lit]?.setFillStyle(0xf4c430);
          lit += 1;
        } else {
          tick.remove();
          this.scene.start(SCENE_KEYS.menu);
        }
      },
    });
  }
}
