import Phaser from 'phaser';
import { ENEMY } from '../config/gameConfig';
import { Enemy, type EnemyOptions } from './Enemy';
import type { EnemyTarget } from './Slime';

/**
 * Cave / ruin bat — a flying enemy that hovers in place, bobs on the wind
 * and dives at the adventurer when they wander too close. Bats ignore
 * gravity and terrain: they can cross pits and ledges a slime never could.
 */
export class Bat extends Enemy {
  private readonly baseY: number;
  private readonly phase: number;
  private readonly verticalAggro: number;

  constructor(scene: Phaser.Scene, x: number, y: number, options: EnemyOptions) {
    super(scene, x, y, 'bat', 'f0', {
      ...options,
      maxHealth: options.maxHealth ?? 1,
      aggroRange: options.aggroRange ?? ENEMY.aggroRange + 24,
    });

    this.baseY = y;
    this.phase = (x * 0.013) % (Math.PI * 2);
    // Bats attack from above and below, so they scan much further vertically.
    this.verticalAggro = ENEMY.aggroYRange * 1.9;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(12, 9);
    body.setOffset(2, 2);

    this.play('bat_fly');
    this.setDepth(y);
  }

  /** Called by the level scene once per frame. */
  updateEnemy(time: number, target: EnemyTarget): void {
    if (this.dead) {
      this.setDepth(this.y);
      return;
    }
    // Knockback stun: keep drifting, but hand no input to the AI.
    if (time < this.hurtUntil) {
      this.setDepth(this.y);
      return;
    }
    if (this.aiState === 'hurt') this.aiState = 'patrol';

    const bob = Math.sin(time / 240 + this.phase) * 5;

    let chasing = false;
    if (target && !target.dead) {
      const dx = Math.abs(target.x - this.x);
      const dy = Math.abs(target.y - this.y);
      chasing = dx <= this.aggroRange && dy <= this.verticalAggro;
    }

    if (chasing && target) {
      this.aiState = 'chase';
      this.facing = target.x > this.x ? 1 : -1;
      this.setVelocityX(this.facing * this.chaseSpeed * 1.35);
      // Dive toward the player but never below the hunting band.
      const targetY = Phaser.Math.Clamp(target.y, this.baseY - 36, this.baseY + 64);
      this.setVelocityY(Phaser.Math.Clamp((targetY - this.y) * 2.4, -100, 100));
    } else {
      this.aiState = 'patrol';
      if (this.x <= this.patrolMinX) this.facing = 1;
      else if (this.x >= this.patrolMaxX) this.facing = -1;
      this.setVelocityX(this.facing * this.patrolSpeed * 1.6);
      this.setVelocityY(Phaser.Math.Clamp((this.baseY + bob - this.y) * 3, -55, 55));
    }

    this.setFlipX(this.facing === -1);
    this.setDepth(this.y);
  }
}
