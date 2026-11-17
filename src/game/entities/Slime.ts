import { Enemy, type EnemyOptions } from './Enemy';

/** Minimal player reference the AI needs. */
export interface EnemyTarget {
  x: number;
  y: number;
  dead: boolean;
}

/**
 * Forest Slime — the first enemy of Whispering Woods.
 * Patrols between bounds, gives chase when the adventurer gets close and
 * takes two sword hits to defeat.
 */
export class Slime extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, options: EnemyOptions) {
    super(scene, x, y, 'slime', 'f0', { ...options, maxHealth: options.maxHealth ?? 2 });
    this.setSize(14, 11);
    this.setOffset(3, 4);
    this.setBounce(0);
    this.setDragX(60);
    this.play('slime_move');
  }

  /** Called by the level scene once per frame. */
  updateEnemy(time: number, target: EnemyTarget): void {
    this.moveToward(time, target);
  }
}
