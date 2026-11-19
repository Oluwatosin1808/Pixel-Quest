import { SCORE } from '../config/gameConfig';
import type { HudState } from '../../types';
import { setHud } from '../../store/uiStore';

/**
 * Tracks run-scoring values and mirrors them into the React HUD.
 * The HUD is only patched when a value actually changes.
 */
export class ScoreSystem {
  coins = 0;
  score = 0;
  crystals = 0;
  readonly crystalsTotal: number;

  constructor(crystalsTotal = 1) {
    this.crystalsTotal = crystalsTotal;
  }

  addCoins(count = 1): void {
    this.coins += count;
    this.score += SCORE.coin * count;
    this.sync();
  }

  addEnemyKill(points: number = SCORE.enemy): void {
    this.score += points;
    this.sync();
  }

  addCrystal(): void {
    this.crystals += 1;
    this.score += SCORE.crystal;
    this.sync();
  }

  addBonus(points: number): void {
    this.score += points;
    this.sync();
  }

  reset(): void {
    this.coins = 0;
    this.score = 0;
    this.crystals = 0;
    this.sync();
  }

  snapshot(): Pick<HudState, 'coins' | 'score' | 'crystals' | 'crystalsTotal'> {
    return { coins: this.coins, score: this.score, crystals: this.crystals, crystalsTotal: this.crystalsTotal };
  }

  sync(health?: number, maxHealth?: number): void {
    const patch: Partial<HudState> = { ...this.snapshot() };
    if (health !== undefined) patch.health = health;
    if (maxHealth !== undefined) patch.maxHealth = maxHealth;
    setHud(patch);
  }
}
