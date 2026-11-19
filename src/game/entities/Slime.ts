import { Enemy, type EnemyOptions } from './Enemy';

/** Minimal player reference the AI needs. */
export interface EnemyTarget {
  x: number;
  y: number;
  dead: boolean;
}

export interface SlimeOptions extends EnemyOptions {
  /** Elite variant: drawn from the oversized sheet and much tougher. */
  big?: boolean;
}

/**
 * Forest Slime — the first enemy of Whispering Woods.
 * Patrols between bounds, gives chase when the adventurer gets close and
 * takes two sword hits to defeat. Elite slimes use a bigger sheet, have a
 * deeper health pool and are worth far more score.
 */
export class Slime extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, options: SlimeOptions) {
    const big = options.big === true;
    super(scene, x, y, big ? 'slime_big' : 'slime', 'f0', {
      ...options,
      maxHealth: options.maxHealth ?? (big ? 5 : 2),
      // Elites plod but never stop: slightly slower, much tankier.
      chaseSpeed: options.chaseSpeed ?? (big ? 66 : undefined),
    });

    if (big) {
      this.setSize(21, 16);
      this.setOffset(5, 5);
      this.scoreValue = 60;
      this.setBounce(0);
      this.setDragX(40);
    } else {
      this.setSize(14, 11);
      this.setOffset(3, 4);
      this.setBounce(0);
      this.setDragX(60);
    }
    this.play('slime_move');
  }

  /** Called by the level scene once per frame. */
  updateEnemy(time: number, target: EnemyTarget): void {
    this.moveToward(time, target);
  }
}
