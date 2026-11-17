/**
 * Generic hit-point handling with cooldown / invulnerability windows.
 * Used by the player (hearts + i-frames) and enemies (simple HP pools).
 */
export interface DamageResult {
  /** True when the damage was applied (not blocked by invulnerability). */
  applied: boolean;
  /** True when this hit reduced HP to zero. */
  died: boolean;
}

export class HealthSystem {
  readonly maxHealth: number;
  private current: number;
  private invulnerableUntil = 0;

  constructor(maxHealth: number, startHealth = maxHealth) {
    this.maxHealth = Math.max(1, maxHealth);
    this.current = Math.max(0, Math.min(this.maxHealth, startHealth));
  }

  get health(): number {
    return this.current;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  isInvulnerable(now: number): boolean {
    return now < this.invulnerableUntil;
  }

  /** Grant invulnerability frames. */
  grantInvulnerability(now: number, durationMs: number): void {
    this.invulnerableUntil = Math.max(this.invulnerableUntil, now + durationMs);
  }

  clearInvulnerability(): void {
    this.invulnerableUntil = 0;
  }

  /**
   * Apply damage unless invulnerable.
   * @param amount hit points to remove (clamped)
   * @param now    current time in ms
   * @param iframe invulnerability window granted when the hit lands
   */
  damage(amount: number, now: number, iframe = 0): DamageResult {
    if (this.isDead || this.isInvulnerable(now)) return { applied: false, died: false };
    this.current = Math.max(0, this.current - Math.max(0, amount));
    if (iframe > 0) this.grantInvulnerability(now, iframe);
    return { applied: true, died: this.current <= 0 };
  }

  heal(amount: number): number {
    const before = this.current;
    this.current = Math.min(this.maxHealth, this.current + Math.max(0, amount));
    return this.current - before;
  }

  reset(full = true): void {
    this.current = full ? this.maxHealth : 0;
    this.clearInvulnerability();
  }
}
