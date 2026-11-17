import Phaser from 'phaser';
import { PLAYER } from '../config/gameConfig';

/**
 * Sword combat bookkeeping.
 *
 * One attack = one active hitbox window. Every target is registered against
 * the current attack so a single swing can never damage the same enemy twice,
 * while still hitting every enemy caught inside the active range.
 */
export class CombatSystem {
  private attackStartedAt = -Infinity;
  private activeUntil = -Infinity;
  private lastCooldownAt = -Infinity;
  private hitTargets = new Set<unknown>();

  constructor(private readonly cooldownMs = PLAYER.attackCooldownMs, private readonly activeMs = PLAYER.attackActiveMs) {}

  /** Begin a swing if the cooldown allows it. */
  tryAttack(now: number): boolean {
    if (now - this.lastCooldownAt < this.cooldownMs) return false;
    this.lastCooldownAt = now;
    this.attackStartedAt = now;
    this.activeUntil = now + this.activeMs;
    this.hitTargets.clear();
    return true;
  }

  isActive(now: number): boolean {
    return now >= this.attackStartedAt && now <= this.activeUntil;
  }

  isOnCooldown(now: number): boolean {
    return now - this.lastCooldownAt < this.cooldownMs;
  }

  /** The active hitbox in world space, in front of the given position. */
  getHitbox(x: number, y: number, facing: 1 | -1): Phaser.Geom.Rectangle {
    const offsetX = PLAYER.hitboxOffsetX * facing;
    const left = facing === 1 ? x + offsetX : x - offsetX - PLAYER.hitboxWidth;
    return new Phaser.Geom.Rectangle(left, y - PLAYER.hitboxHeight / 2, PLAYER.hitboxWidth, PLAYER.hitboxHeight);
  }

  /**
   * Register a target hit by the current swing.
   * @param now current scene time (same clock used by tryAttack)
   * @returns true only the first time a given target is hit by this swing.
   */
  registerHit(target: unknown, now: number): boolean {
    if (!this.isActive(now)) return false;
    if (this.hitTargets.has(target)) return false;
    this.hitTargets.add(target);
    return true;
  }

  reset(): void {
    this.attackStartedAt = -Infinity;
    this.activeUntil = -Infinity;
    this.lastCooldownAt = -Infinity;
    this.hitTargets.clear();
  }
}
