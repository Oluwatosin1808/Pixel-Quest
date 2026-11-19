/** Central game tuning constants shared by scenes and entities. */

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const TILE = 16;

/** Arcade physics tuning. */
export const PHYSICS = {
  gravity: 1400,
  maxFallSpeed: 620,
} as const;

/** Player movement tuning (pixels / second unless noted). */
export const PLAYER = {
  runSpeed: 150,
  airRunFactor: 0.85,
  attackMoveFactor: 0.6,
  jumpVelocity: -470,
  jumpCutFactor: 0.45,
  coyoteMs: 110,
  jumpBufferMs: 130,
  invulnMs: 1200,
  respawnInvulnMs: 1500,
  attackCooldownMs: 340,
  attackActiveMs: 150,
  knockbackX: 175,
  knockbackY: -230,
  maxHealth: 3,
  /** Attack hitbox relative to the sprite centre, for facing = right. */
  hitboxWidth: 30,
  hitboxHeight: 22,
  hitboxOffsetX: 10,
} as const;

/** Enemy tuning. */
export const ENEMY = {
  patrolSpeed: 38,
  chaseSpeed: 74,
  aggroRange: 118,
  aggroYRange: 44,
  /** How far past its patrol strip an enemy may chase (anti-camp leash). */
  leash: 56,
  contactDamage: 1,
  hurtKnockbackX: 140,
  hurtKnockbackY: -160,
  hurtStunMs: 220,
  flashMs: 90,
  /** Stat gains applied per sub-level (part 1 gets none). */
  perPartHp: 1,
  perPartChase: 8,
  perPartAggro: 26,
} as const;

/** Scoring rules. */
export const SCORE = {
  coin: 10,
  enemy: 25,
  eliteEnemy: 60,
  batEnemy: 30,
  crystal: 100,
  levelClear: 500,
  partClear: 150,
  heartFull: 25,
} as const;

/** Pickup tuning (power-ups + health drops). */
export const PICKUP = {
  radius: 15,
  shieldMs: 9000,
  bootsMs: 9000,
  /** Chance a slain enemy drops a health heart when the player is hurt. */
  dropHeartChance: 0.2,
  /** Chance a slain enemy drops a coin instead. */
  dropCoinChance: 0.12,
} as const;

/** Thin-ice (Frostfall Peaks) tuning. */
export const THIN_ICE = {
  /** Walking speed (px/s) considered "fast enough" to stay safe. */
  safeSpeed: 72,
  /** Standing / crawling this long makes the ice groan. */
  warnMs: 620,
  /** Standing / crawling this long collapses the ice. */
  collapseMs: 1450,
} as const;

export const SCENE_KEYS = {
  boot: 'Boot',
  preload: 'Preload',
  menu: 'MainMenu',
  level: 'Play',
  preview: 'TexturePreview',
} as const;

export const SAVE_KEY = 'pixel_quest_save_v1';
export const SAVE_VERSION = 1;
export const GAME_VERSION = '1.0.0';
