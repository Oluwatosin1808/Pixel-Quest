import Phaser from 'phaser';
import { ENEMY, SCORE } from '../config/gameConfig';
import { HealthSystem } from '../systems/HealthSystem';

export interface EnemyOptions {
  minX: number;
  maxX: number;
  maxHealth?: number;
  aggroRange?: number;
  /** Constant colour shift so a world's enemies match its scenery. */
  baseTint?: number;
}

/**
 * Base class for hostile creatures: patrol AI with player detection,
 * knockback reactions, hit flashing and death handling.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly health: HealthSystem;
  readonly scoreValue: number = SCORE.enemy;
  dead = false;
  facing: 1 | -1 = -1;

  protected readonly patrolMinX: number;
  protected readonly patrolMaxX: number;
  protected readonly aggroRange: number;
  protected baseTint: number | null;
  protected aiState: 'patrol' | 'chase' | 'hurt' | 'dead' = 'patrol';
  protected hurtUntil = -Infinity;

  /** Fired once when the enemy dies (score + effects). */
  onKilled: ((enemy: Enemy) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame: string, options: EnemyOptions) {
    super(scene, x, y, texture, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.health = new HealthSystem(options.maxHealth ?? 2);
    this.patrolMinX = options.minX;
    this.patrolMaxX = options.maxX;
    this.aggroRange = options.aggroRange ?? ENEMY.aggroRange;
    this.baseTint = options.baseTint ?? null;
    if (this.baseTint !== null) this.setTint(this.baseTint);
    this.setDepth(y);
  }

  /** Apply (or re-apply) this enemy's permanent colour shift. */
  setBaseTint(tint: number): void {
    this.baseTint = tint;
    this.setTint(tint);
  }

  /** Restore the base tint after a hit-flash clears it. */
  protected restoreTint(): void {
    this.clearTint();
    if (this.baseTint !== null) this.setTint(this.baseTint);
  }

  get isDead(): boolean {
    return this.dead;
  }

  get isDangerous(): boolean {
    return !this.dead;
  }

  /** Apply sword damage. Returns true when the hit connected. */
  hurt(amount: number, fromX: number, now: number): boolean {
    if (this.dead) return false;
    const result = this.health.damage(amount, now, 0);
    if (!result.applied) return false;

    const dir = fromX <= this.x ? 1 : -1;
    this.setVelocity(dir * ENEMY.hurtKnockbackX, ENEMY.hurtKnockbackY);
    this.aiState = 'hurt';
    this.hurtUntil = now + ENEMY.hurtStunMs;

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(ENEMY.flashMs, () => {
      if (!this.dead) this.restoreTint();
    });

    if (result.died) this.die();
    return true;
  }

  protected die(): void {
    this.dead = true;
    this.aiState = 'dead';
    this.setTintFill(0xffffff);
    this.setVelocity(0, -110);
    this.setBounce(0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.checkCollision.none = true;
    body.setAllowGravity(true);

    // Sink + fade out, then remove.
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.4,
      duration: 260,
      delay: 60,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });

    this.onKilled?.(this);
  }

  /** Contact damage amount when the player touches this enemy. */
  contactDamage(): number {
    return this.dead ? 0 : ENEMY.contactDamage;
  }

  /** Shared movement logic: patrol bounds + chase when the player is close. */
  protected moveToward(time: number, target: { x: number; y: number; dead?: boolean } | null): void {
    if (this.dead) return;

    if (time < this.hurtUntil) {
      this.setDepth(this.y);
      return;
    }
    if (this.aiState === 'hurt') this.aiState = 'patrol';

    let chasing = false;
    if (target && !target.dead) {
      const dx = Math.abs(target.x - this.x);
      const dy = Math.abs(target.y - this.y);
      chasing = dx <= this.aggroRange && dy <= ENEMY.aggroYRange;
    }

    if (chasing && target) {
      this.aiState = 'chase';
      this.facing = target.x > this.x ? 1 : -1;
      this.setVelocityX(this.facing * ENEMY.chaseSpeed);
    } else {
      this.aiState = 'patrol';
      if (this.x <= this.patrolMinX) this.facing = 1;
      else if (this.x >= this.patrolMaxX) this.facing = -1;
      this.setVelocityX(this.facing * ENEMY.patrolSpeed);
    }

    this.setFlipX(this.facing === -1);
    this.setDepth(this.y);
  }
}
