import Phaser from 'phaser';
import { PLAYER } from '../config/gameConfig';
import { HealthSystem } from '../systems/HealthSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { AudioManager } from '../systems/AudioManager';

/** Control state assembled by the scene each frame (keyboard + touch). */
export interface PlayerControls {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
}

const ATTACK_DURATION_MS = 260;
const DEATH_DURATION_MS = 700;

/**
 * The adventurer: responsive platforming movement (coyote time, jump
 * buffering, variable jump height) plus sword combat.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly health: HealthSystem;
  facing: 1 | -1 = 1;
  dead = false;
  /** Set when the death animation has fully played out. */
  onDied: (() => void) | null = null;
  /** Fired when the player lands after a fall (for dust effects). */
  onLanded: ((fallSpeed: number) => void) | null = null;

  private readonly combat: CombatSystem;
  private coyoteUntil = -Infinity;
  private jumpBufferedUntil = -Infinity;
  private jumpCutDone = true;
  private attacking = false;
  private attackEndsAt = -Infinity;
  private stunUntil = -Infinity;
  private wasOnFloor = false;
  private deathStartedAt = -Infinity;
  private deathHandled = false;
  private invulnBlink = false;
  private speedBoostUntil = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_idle', 'f0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 22);
    body.setOffset(11, 2);
    body.setMaxVelocityY(620);
    this.setCollideWorldBounds(true);
    this.setDepth(y);

    this.health = new HealthSystem(PLAYER.maxHealth);
    this.combat = new CombatSystem();
    this.play('player_idle');
  }

  get isAttacking(): boolean {
    return this.attacking;
  }

  get isStunned(): boolean {
    return this.stunUntil > this.scene.time.now;
  }

  /** True while the speed-boost power-up is running. */
  get isSpeedBoosted(): boolean {
    return this.scene.time.now < this.speedBoostUntil;
  }

  /** Grant a burst of movement speed for `durationMs`. */
  applySpeedBoost(durationMs: number): void {
    this.speedBoostUntil = Math.max(this.speedBoostUntil, this.scene.time.now + durationMs);
  }

  /* ---------------- Combat interface (used by the scene) ---------------- */

  isAttackActive(now: number): boolean {
    return this.attacking && this.combat.isActive(now);
  }

  getAttackHitbox(): Phaser.Geom.Rectangle {
    return this.combat.getHitbox(this.x, this.y, this.facing);
  }

  registerAttackHit(target: unknown, now: number): boolean {
    return this.combat.registerHit(target, now);
  }

  /* ---------------- Damage ---------------- */

  /**
   * @param fromX world x of the damage source, or null for pit falls
   *              (no horizontal knockback)
   */
  takeDamage(fromX: number | null, now: number): boolean {
    if (this.dead) return false;
    const result = this.health.damage(1, now, PLAYER.invulnMs);
    if (!result.applied) return false;

    this.attacking = false;
    this.combat.reset();

    if (fromX === null) {
      this.setVelocity(0, -140);
    } else {
      const dir = fromX < this.x ? 1 : -this.facing;
      this.setVelocity(dir * PLAYER.knockbackX, PLAYER.knockbackY);
    }
    this.stunUntil = now + 260;

    this.play('player_hurt', true);
    this.setTintFill(0xef6a55);
    this.scene.time.delayedCall(120, () => {
      if (!this.dead) this.clearTint();
    });

    AudioManager.get().playSfx('hurt');

    if (result.died) {
      this.die(now);
    }
    return true;
  }

  private die(now: number): void {
    this.dead = true;
    this.attacking = false;
    this.deathStartedAt = now;
    this.deathHandled = false;
    this.clearTint();
    this.setVisible(true);
    this.setVelocityX(0);
    this.play('player_death', true);
    AudioManager.get().playSfx('gameover');
  }

  /** Move the player to a safe position without touching health/state. */
  reposition(x: number, y: number): void {
    this.setPosition(x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    this.setVelocity(0, 0);
  }

  heal(amount: number): number {
    const healed = this.health.heal(amount);
    if (healed > 0) this.clearTint();
    return healed;
  }

  /* ---------------- Per-frame update ---------------- */

  update(time: number, controls: PlayerControls): void {
    if (this.dead) {
      if (!this.deathHandled && time >= this.deathStartedAt + DEATH_DURATION_MS) {
        this.deathHandled = true;
        this.onDied?.();
      }
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const onFloor = body.blocked.down || body.touching.down;
    const stunned = time < this.stunUntil;

    // --- Landing feedback ---
    if (onFloor && !this.wasOnFloor) {
      const fallSpeed = body.velocity.y;
      if (fallSpeed > 180) this.onLanded?.(fallSpeed);
    }
    this.wasOnFloor = onFloor;

    // --- Timers ---
    if (onFloor) this.coyoteUntil = time + PLAYER.coyoteMs;
    if (controls.jumpPressed) this.jumpBufferedUntil = time + PLAYER.jumpBufferMs;

    // --- Horizontal movement ---
    const stunnedNow = stunned;
    let moveX = 0;
    if (!stunnedNow) {
      if (controls.left) moveX -= 1;
      if (controls.right) moveX += 1;
      if (moveX !== 0 && !this.attacking) this.facing = moveX > 0 ? 1 : -1;
    }

    let speed = PLAYER.runSpeed;
    if (time < this.speedBoostUntil) speed *= 1.55;
    if (!onFloor) speed *= PLAYER.airRunFactor;
    if (this.attacking) speed *= PLAYER.attackMoveFactor;
    if (!stunnedNow || onFloor) {
      this.setVelocityX(moveX * speed);
    }

    // --- Jumping (coyote time + input buffer + variable height) ---
    if (!stunnedNow && time <= this.jumpBufferedUntil && time <= this.coyoteUntil) {
      this.setVelocityY(PLAYER.jumpVelocity);
      this.jumpBufferedUntil = -Infinity;
      this.coyoteUntil = -Infinity;
      this.jumpCutDone = false;
      AudioManager.get().playSfx('jump');
      this.scene.tweens.add({
        targets: this,
        scaleY: 1.12,
        scaleX: 0.92,
        duration: 90,
        yoyo: true,
        onComplete: () => {
          this.setScale(1, 1);
        },
      });
    }
    if (!this.jumpCutDone && !controls.jumpHeld && body.velocity.y < 0) {
      this.setVelocityY(body.velocity.y * PLAYER.jumpCutFactor);
      this.jumpCutDone = true;
    }
    if (onFloor) this.jumpCutDone = true;

    // --- Sword attack ---
    if (!stunnedNow && controls.attackPressed && !this.attacking) {
      if (this.combat.tryAttack(time)) {
        this.attacking = true;
        this.attackEndsAt = time + ATTACK_DURATION_MS;
        this.play('player_attack', true);
        AudioManager.get().playSfx('sword');
      }
    }
    if (this.attacking && time >= this.attackEndsAt) {
      this.attacking = false;
      this.combat.reset();
    }

    // --- Animation selection ---
    if (!this.attacking) {
      if (!onFloor) {
        this.play(body.velocity.y < 0 ? 'player_jump' : 'player_fall', true);
      } else if (moveX !== 0) {
        this.play('player_run', true);
      } else {
        this.play('player_idle', true);
      }
      if (stunnedNow) this.play('player_hurt', true);
    }

    // --- Invulnerability blink ---
    const invulnerable = this.health.isInvulnerable(time);
    if (invulnerable) {
      this.invulnBlink = Math.floor(time / 90) % 2 === 0;
      this.setVisible(this.invulnBlink);
      if (this.invulnBlink) this.setTintFill(0xffffff);
      else this.clearTint();
    } else {
      if (!this.visible) this.setVisible(true);
      if (this.isTinted && !stunnedNow) this.clearTint();
    }

    this.setFlipX(this.facing === -1);
    this.setDepth(this.y);
  }
}
