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
  patrolSpeed: 34,
  chaseSpeed: 66,
  aggroRange: 110,
  aggroYRange: 44,
  contactDamage: 1,
  hurtKnockbackX: 140,
  hurtKnockbackY: -160,
  hurtStunMs: 220,
  flashMs: 90,
} as const;

/** Scoring rules. */
export const SCORE = {
  coin: 10,
  enemy: 25,
  crystal: 100,
  levelClear: 500,
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
