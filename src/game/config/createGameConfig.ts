import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from './gameConfig';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PlayScene } from '../scenes/PlayScene';
import { TexturePreviewScene } from '../scenes/TexturePreviewScene';

/**
 * Phaser game configuration. Pixel-perfect rendering with an integer-friendly
 * 16:9 base resolution that scales to fit any desktop or mobile viewport.
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0b0f0d',
    pixelArt: true,
    roundPixels: true,
    banner: false,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
      powerPreference: 'high-performance',
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: PHYSICS.gravity },
        debug: false,
      },
    },
    input: {
      activePointers: 3,
    },
    fps: {
      target: 60,
      smoothStep: true,
    },
    scene: [BootScene, PreloadScene, MainMenuScene, PlayScene, TexturePreviewScene],
  };
}
