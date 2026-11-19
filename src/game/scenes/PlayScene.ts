import Phaser from 'phaser';
import {
  SCENE_KEYS,
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE,
  ENEMY,
  PLAYER,
  PICKUP,
  SCORE,
  THIN_ICE,
} from '../config/gameConfig';
import { type LevelLayout } from '../config/levelData';
import { getLevel, themeFor, type LevelDef, type ThemeDef } from '../config/levels';
import { createTileLayer, spawnDecorations } from '../utils/levelBuilder';
import { ensureTextures } from '../utils/textures';
import { Player, type PlayerControls } from '../entities/Player';
import { Slime, type EnemyTarget } from '../entities/Slime';
import { Bat } from '../entities/Bat';
import { PowerUp, type PowerUpKind } from '../entities/PowerUp';
import type { Enemy } from '../entities/Enemy';
import { Coin } from '../entities/Coin';
import { ScoreSystem } from '../systems/ScoreSystem';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';
import {
  attachGameplayScene,
  detachGameplayScene,
  resetTouch,
  takeEscSwallow,
  touchInput,
  type GameplaySceneLike,
} from '../../store/bridge';
import { getUI, hydrateFromSave, setHud, setPhase, showToast } from '../../store/uiStore';

/** Data passed to the scene on (re)start. */
export interface LevelInit {
  mode?: 'new' | 'continue' | 'restart';
  /** Which world/level to build; defaults to World 1. */
  levelId?: string;
  checkpoint?: number;
  collectedCrystals?: string[];
}

const COIN_PICKUP_RADIUS = 16;
const CRYSTAL_PICKUP_RADIUS = 18;

interface ParallaxLayer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
}

/** Runtime state of one collapsible ice tile (Frostfall Peaks). */
interface ThinIceTile {
  col: number;
  row: number;
  state: 'solid' | 'cracking' | 'gone';
  /** ms the player has lingered on this tile. */
  timer: number;
  crack: Phaser.GameObjects.Image | null;
}

/**
 * The single gameplay scene. Everything world-specific — layout, tileset,
 * parallax backdrop, ambience and HUD labels — comes from the LevelDef that
 * the bridge hands over, so all four worlds share one code path.
 */
export class PlayScene extends Phaser.Scene implements GameplaySceneLike {
  private levelDef!: LevelDef;
  private theme!: ThemeDef;
  private layout!: LevelLayout;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private player!: Player;
  private enemies: Enemy[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private coins: Coin[] = [];
  private powerUps: PowerUp[] = [];
  private scoreSys!: ScoreSystem;
  private crystalSprite: Phaser.GameObjects.Sprite | null = null;
  private crystalGlow: Phaser.GameObjects.Image | null = null;
  private checkpointSprites: Phaser.GameObjects.Sprite[] = [];
  private exitSprite!: Phaser.GameObjects.Sprite;

  private levelInit: LevelInit = {};
  private activeCheckpointIndex = 0;
  private lastSafePoint = { x: 0, y: 0 };

  /* ---------------- Sub-levels (parts) ---------------- */
  private currentPart = 1;
  /** World-x thresholds the player crosses to enter the next sub-level. */
  private partBoundaries: number[] = [];

  /* ---------------- Power-ups ---------------- */
  private shieldUntil = -Infinity;
  private shieldAura: Phaser.GameObjects.Image | null = null;
  private lastShieldBlockAt = -Infinity;

  /* ---------------- Thin ice ---------------- */
  private iceTiles: ThinIceTile[] = [];

  /* ---------------- Kingdom mood layers ---------------- */
  private vignette: Phaser.GameObjects.Image | null = null;
  private vignetteTween: Phaser.Tweens.Tween | null = null;
  private blinkTweens: Phaser.Tweens.Tween[] = [];

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevTouch = { jump: false, attack: false };

  private parallax: ParallaxLayer[] = [];
  private ambient: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private overlayTween: Phaser.Tweens.Tween | null = null;

  private paused = false;
  private won = false;
  private gameOver = false;
  private wasAttacking = false;

  private damageFlash!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(SCENE_KEYS.level);
  }

  init(data?: LevelInit): void {
    this.levelInit = {
      mode: data?.mode ?? 'new',
      levelId: data?.levelId ?? 'ww_1',
      checkpoint: data?.checkpoint ?? 0,
      collectedCrystals: data?.collectedCrystals ?? [],
    };
    // Reset per-run state (scene instances are reused across restarts).
    this.enemies = [];
    this.coins = [];
    this.powerUps = [];
    this.iceTiles = [];
    this.checkpointSprites = [];
    this.parallax = [];
    this.ambient = [];
    this.overlayTween = null;
    this.vignette = null;
    this.vignetteTween = null;
    this.blinkTweens = [];
    this.activeCheckpointIndex = 0;
    this.currentPart = 1;
    this.partBoundaries = [];
    this.shieldUntil = -Infinity;
    this.shieldAura = null;
    this.lastShieldBlockAt = -Infinity;
    this.paused = false;
    this.won = false;
    this.gameOver = false;
    this.wasAttacking = false;
    this.crystalSprite = null;
    this.crystalGlow = null;
    this.prevTouch = { jump: false, attack: false };
  }

  create(): void {
    ensureTextures(this);
    this.physics.resume();
    resetTouch();

    this.levelDef = getLevel(this.levelInit.levelId ?? 'ww_1');
    this.theme = themeFor(this.levelDef);
    this.layout = this.levelDef.build();
    const { layout } = this;

    /* ---------------- Terrain ---------------- */
    this.layer = createTileLayer(this, layout);
    spawnDecorations(this, layout);
    this.spawnThinIce(layout);

    const worldW = layout.cols * TILE;
    const worldH = layout.rows * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH + 64);

    /* ---------------- Backgrounds (screen-fixed parallax) ---------------- */
    this.buildBackgrounds();

    /* ---------------- Player ---------------- */
    const start = this.resolveStart(layout);
    this.player = new Player(this, start.x, start.y);
    this.lastSafePoint = { ...start };
    this.physics.add.collider(this.player, this.layer);

    this.player.onDied = () => this.handlePlayerDeath();
    this.player.onLanded = (fallSpeed) => this.spawnLandingDust(fallSpeed);

    /* ---------------- Sub-level boundaries ---------------- */
    this.partBoundaries = layout.checkpoints.map((cp) => cp.x + 40);
    this.currentPart = Math.min(this.levelDef.parts.length, (this.levelInit.checkpoint ?? 0) + 1);

    /* ---------------- Enemies ---------------- */
    this.enemyGroup = this.physics.add.group();
    for (const spawn of layout.enemies) {
      // Enemies grow tougher deeper into the level (part 1 is unchanged).
      const part = this.partForX(spawn.x);
      const bonus = part - 1;
      const chase = ENEMY.chaseSpeed + ENEMY.perPartChase * bonus;
      const aggro = ENEMY.aggroRange + ENEMY.perPartAggro * bonus;
      const enemy: Enemy =
        spawn.type === 'bat'
          ? new Bat(this, spawn.x, spawn.y, {
              minX: spawn.minX,
              maxX: spawn.maxX,
              maxHealth: part >= 3 ? 2 : 1,
              aggroRange: aggro + 24,
              chaseSpeed: chase,
              ...(spawn.tint === undefined ? {} : { baseTint: spawn.tint }),
            })
          : new Slime(this, spawn.x, spawn.y, {
              minX: spawn.minX,
              maxX: spawn.maxX,
              big: spawn.big === true,
              maxHealth: (spawn.big === true ? 5 : 2) + ENEMY.perPartHp * bonus,
              aggroRange: aggro,
              // Elites plod along slowly but gain the same part bonus.
              chaseSpeed: (spawn.big === true ? 66 : ENEMY.chaseSpeed) + ENEMY.perPartChase * bonus,
              ...(spawn.tint === undefined ? {} : { baseTint: spawn.tint }),
            });
      enemy.onKilled = (e) => this.handleEnemyKilled(e);
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
      this.physics.add.collider(enemy, this.layer);
    }
    this.physics.add.overlap(this.player, this.enemyGroup, (_playerObj, enemyObj) => {
      const enemy = enemyObj as Enemy;
      if (!enemy.active || enemy.isDead || this.player.dead || this.won) return;
      const now = this.time.now;
      if (enemy.contactDamage() > 0 && this.applyDamage(enemy.x, now)) {
        this.onPlayerHurt();
      }
    });

    /* ---------------- Collectibles ---------------- */
    for (const coin of layout.coins) {
      this.coins.push(Coin.spawn(this, coin.x, coin.y));
    }
    for (const pickup of layout.pickups) {
      this.powerUps.push(PowerUp.spawn(this, pickup.x, pickup.y, pickup.type));
    }
    this.spawnCrystal(layout);

    /* ---------------- Checkpoints & exit ---------------- */
    this.spawnCheckpoints(layout);
    this.spawnExit(layout);

    /* ---------------- Camera ---------------- */
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, 0.12, 0.14);
    cam.centerOn(this.player.x, this.player.y);

    /* ---------------- Input ---------------- */
    const kb = this.input.keyboard;
    if (kb) {
      const add = (key: string): Phaser.Input.Keyboard.Key => kb.addKey(key);
      this.keys = {
        leftA: add('A'),
        leftArrow: add('LEFT'),
        rightD: add('D'),
        rightArrow: add('RIGHT'),
        jumpW: add('W'),
        jumpUp: add('UP'),
        jumpSpace: add('SPACE'),
        attackJ: add('J'),
        attackX: add('X'),
        escape: add('ESC'),
      };
      kb.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'D', 'W', 'J', 'X', 'ESC']);
    }

    /* ---------------- Damage flash overlay ---------------- */
    this.damageFlash = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xef6a55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9000)
      .setAlpha(0);

    /* ---------------- Score + HUD ---------------- */
    this.scoreSys = new ScoreSystem(1);
    const collected = this.levelInit.collectedCrystals ?? [];
    if (layout.crystal && collected.includes(layout.crystal.id)) {
      this.scoreSys.crystals = 1;
    }
    this.syncHud();

    /* ---------------- Audio + bridge ---------------- */
    AudioManager.get().playMusic('level');
    attachGameplayScene(this);
    this.events.once('shutdown', () => {
      detachGameplayScene(this);
      resetTouch();
    });

    /* ---------------- Ambient effects ---------------- */
    this.spawnAmbient(worldW, worldH);

    /* ---------------- Tutorial signpost ---------------- */
    this.add
      .text(7 * TILE + TILE / 2, 246, this.levelDef.hint, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#f2e6c9',
        stroke: '#080b0a',
        strokeThickness: 3,
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(1000);
  }

  /* ================================================================ */
  /* Construction helpers                                              */
  /* ================================================================ */

  private resolveStart(layout: LevelLayout): { x: number; y: number } {
    const cp = this.levelInit.checkpoint ?? 0;
    if (cp > 0) {
      const checkpoint = layout.checkpoints.find((c) => c.index === cp);
      if (checkpoint) {
        this.activeCheckpointIndex = cp;
        return { x: checkpoint.x, y: checkpoint.y };
      }
    }
    this.activeCheckpointIndex = 0;
    return { ...layout.playerStart };
  }

  private buildBackgrounds(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const theme = this.theme;

    this.add.image(cx, cy, theme.sky).setDepth(-100).setScrollFactor(0);

    for (const def of theme.layers) {
      const sprite = this.add.tileSprite(cx, cy, GAME_WIDTH, GAME_HEIGHT, def.key).setDepth(def.depth);
      sprite.setScrollFactor(0);
      this.parallax.push({ sprite, factor: def.factor });
      if (def.blink) {
        // The kingdom's watching eyes fade in and out of the dark.
        this.blinkTweens.push(
          this.tweens.add({
            targets: sprite,
            alpha: { from: 1, to: 0.08 },
            duration: 760 + (Math.abs(def.depth) % 5) * 140,
            delay: 500 + (Math.abs(def.depth) % 7) * 320,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          }),
        );
      }
    }

    const overlay = theme.overlay;
    if (overlay) {
      const image = this.add
        .image(cx, cy, overlay.key)
        .setDepth(overlay.depth)
        .setScrollFactor(0)
        .setAlpha(overlay.alpha);
      if (overlay.pulse) {
        image.setBlendMode(Phaser.BlendModes.ADD);
        this.overlayTween = this.tweens.add({
          targets: image,
          alpha: { from: overlay.alpha, to: overlay.alpha * 0.55 },
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (overlay.drift) {
        const range = overlay.drift;
        this.overlayTween = this.tweens.add({
          targets: image,
          x: { from: cx - range, to: cx + range },
          duration: 5200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    const vignette = theme.vignette;
    if (vignette) {
      // Screen-fixed darkening frame that closes the world in around you.
      this.vignette = this.add
        .image(cx, cy, vignette.key)
        .setScrollFactor(0)
        .setDepth(8500)
        .setAlpha(vignette.alpha);
      if (vignette.pulse) {
        this.vignetteTween = this.tweens.add({
          targets: this.vignette,
          alpha: { from: vignette.alpha, to: vignette.alpha * 0.7 },
          duration: 2600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private spawnCrystal(layout: LevelLayout): void {
    const crystal = layout.crystal;
    if (!crystal) return;
    const collected = this.levelInit.collectedCrystals ?? [];
    if (collected.includes(crystal.id)) return;

    this.crystalGlow = this.add
      .image(crystal.x, crystal.y, 'glow')
      .setDepth(crystal.y - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55);
    this.tweens.add({
      targets: this.crystalGlow,
      scale: { from: 0.9, to: 1.25 },
      alpha: { from: 0.65, to: 0.35 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.crystalSprite = this.add.sprite(crystal.x, crystal.y, 'crystal', 'f0').setDepth(crystal.y);
    this.crystalSprite.play('crystal_shine');
    this.tweens.add({
      targets: this.crystalSprite,
      y: crystal.y - 3,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private spawnCheckpoints(layout: LevelLayout): void {
    for (const cp of layout.checkpoints) {
      const sprite = this.add.sprite(cp.x, cp.y, 'checkpoint', 'f0').setDepth(cp.y + 8);
      const active = cp.index <= (this.levelInit.checkpoint ?? 0);
      if (active) sprite.setFrame('f1');
      this.checkpointSprites.push(sprite);

      const zone = this.add.zone(cp.x, cp.y, 22, 34);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => this.activateCheckpoint(cp.index, cp.x, cp.y, sprite));
    }
  }

  private spawnExit(layout: LevelLayout): void {
    this.exitSprite = this.add
      .sprite(layout.exit.x, layout.exit.y, 'exit', 'f0')
      .setDepth(layout.exit.y + 4);
    this.exitSprite.play('exit_portal');

    const zone = this.add.zone(layout.exit.x, layout.exit.y, 42, 58);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => this.win());
  }

  private spawnAmbient(worldW: number, worldH: number): void {
    const kind = this.theme.ambient;

    if (kind === 'forest') {
      // Dust motes drifting across each section of the forest.
      for (let x = 240; x < worldW; x += 560) {
        this.ambient.push(
          this.add
            .particles(x, worldH / 2, 'px_dot', {
              x: { min: -240, max: 240 },
              y: { min: -120, max: 120 },
              lifespan: { min: 3500, max: 7000 },
              speed: { min: 3, max: 10 },
              angle: { min: 200, max: 340 },
              alpha: { start: 0.3, end: 0 },
              scale: { start: 1, end: 0.5 },
              quantity: 1,
              frequency: 650,
            })
            .setDepth(60),
        );
      }
      // Golden fireflies near the ground.
      for (let x = 360; x < worldW; x += 640) {
        this.ambient.push(
          this.add
            .particles(x, worldH - 90, 'px_dot', {
              x: { min: -260, max: 260 },
              y: { min: -70, max: 40 },
              lifespan: { min: 2200, max: 4800 },
              speed: { min: 3, max: 12 },
              angle: { min: 0, max: 360 },
              alpha: { start: 0.95, end: 0 },
              scale: { start: 1.5, end: 0.4 },
              tint: [0xf4c430, 0xffe08a],
              blendMode: 'ADD',
              quantity: 1,
              frequency: 900,
            })
            .setDepth(61),
        );
      }
      return;
    }

    if (kind === 'embers') {
      // Embers rising out of the lava below.
      for (let x = 200; x < worldW; x += 380) {
        this.ambient.push(
          this.add
            .particles(x, worldH - 40, 'px_dot', {
              x: { min: -180, max: 180 },
              y: { min: 0, max: 60 },
              lifespan: { min: 2600, max: 5200 },
              speed: { min: 14, max: 34 },
              angle: { min: 250, max: 290 },
              alpha: { start: 0.95, end: 0 },
              scale: { start: 1.6, end: 0.4 },
              tint: [0xff8a3c, 0xffc46a, 0xf4c430],
              blendMode: 'ADD',
              gravityY: -30,
              quantity: 1,
              frequency: 420,
            })
            .setDepth(62),
        );
      }
      // Hanging volcanic dust.
      for (let x = 320; x < worldW; x += 520) {
        this.ambient.push(
          this.add
            .particles(x, worldH / 2, 'px_dot', {
              x: { min: -220, max: 220 },
              y: { min: -120, max: 120 },
              lifespan: { min: 4000, max: 8000 },
              speed: { min: 2, max: 7 },
              angle: { min: 190, max: 350 },
              alpha: { start: 0.25, end: 0 },
              scale: { start: 1, end: 0.5 },
              quantity: 1,
              frequency: 780,
            })
            .setDepth(60),
        );
      }
      return;
    }

    if (kind === 'snow') {
      // Constant snowfall across the whole level.
      for (let x = 240; x < worldW; x += 420) {
        this.ambient.push(
          this.add
            .particles(x, -20, 'px_small', {
              x: { min: -200, max: 200 },
              y: { min: -40, max: 40 },
              lifespan: { min: 4200, max: 7000 },
              speed: { min: 34, max: 58 },
              angle: { min: 78, max: 102 },
              alpha: { start: 0.9, end: 0.15 },
              scale: { start: 1.4, end: 0.8 },
              quantity: 2,
              frequency: 260,
            })
            .setDepth(63),
        );
      }
      // Icy glints near the ground.
      for (let x = 360; x < worldW; x += 700) {
        this.ambient.push(
          this.add
            .particles(x, worldH - 80, 'px_dot', {
              x: { min: -240, max: 240 },
              y: { min: -60, max: 30 },
              lifespan: { min: 2400, max: 4600 },
              speed: { min: 3, max: 9 },
              angle: { min: 0, max: 360 },
              alpha: { start: 0.9, end: 0 },
              scale: { start: 1.3, end: 0.3 },
              tint: [0x9fd6e8, 0xffffff],
              blendMode: 'ADD',
              quantity: 1,
              frequency: 950,
            })
            .setDepth(61),
        );
      }
      return;
    }

    if (kind === 'wisp') {
      // Pale grave-lights wandering low through the ruins.
      for (let x = 220; x < worldW; x += 320) {
        this.ambient.push(
          this.add
            .particles(x, worldH - 70, 'px_dot', {
              x: { min: -150, max: 150 },
              y: { min: -110, max: 30 },
              lifespan: { min: 5000, max: 9500 },
              speed: { min: 4, max: 13 },
              angle: { min: 230, max: 310 },
              alpha: { start: 0.9, end: 0 },
              scale: { start: 1.9, end: 0.5 },
              tint: [0x8fd6b4, 0xb9e8d2, 0x9fb8c9],
              blendMode: 'ADD',
              quantity: 1,
              frequency: 1400,
            })
            .setDepth(64),
        );
      }
      // Cold ash drifting between the tombs.
      for (let x = 260; x < worldW; x += 540) {
        this.ambient.push(
          this.add
            .particles(x, worldH / 2, 'px_small', {
              x: { min: -240, max: 240 },
              y: { min: -130, max: 130 },
              lifespan: { min: 4600, max: 8800 },
              speed: { min: 2, max: 7 },
              angle: { min: 195, max: 345 },
              alpha: { start: 0.28, end: 0 },
              scale: { start: 1.1, end: 0.45 },
              tint: [0x6f7f88, 0x56615c],
              quantity: 1,
              frequency: 820,
            })
            .setDepth(60),
        );
      }
      return;
    }

    // 'dust' — slow ash and motes drifting through the ruins.
    for (let x = 240; x < worldW; x += 500) {
      this.ambient.push(
        this.add
          .particles(x, worldH / 2, 'px_dot', {
            x: { min: -230, max: 230 },
            y: { min: -130, max: 130 },
            lifespan: { min: 4200, max: 8200 },
            speed: { min: 2, max: 8 },
            angle: { min: 195, max: 345 },
            alpha: { start: 0.35, end: 0 },
            scale: { start: 1.1, end: 0.45 },
            quantity: 1,
            frequency: 700,
          })
          .setDepth(60),
      );
    }
    for (let x = 400; x < worldW; x += 660) {
      this.ambient.push(
        this.add
          .particles(x, worldH - 90, 'px_dot', {
            x: { min: -250, max: 250 },
            y: { min: -70, max: 40 },
            lifespan: { min: 2600, max: 5000 },
            speed: { min: 3, max: 10 },
            angle: { min: 0, max: 360 },
            alpha: { start: 0.75, end: 0 },
            scale: { start: 1.4, end: 0.4 },
            tint: [0xc9b06a, 0x9a9077],
            blendMode: 'ADD',
            quantity: 1,
            frequency: 1050,
          })
          .setDepth(61),
      );
    }
  }

  /* ================================================================ */
  /* Per-frame update                                                  */
  /* ================================================================ */

  override update(time: number, delta: number): void {
    // Parallax follows the camera even while paused (cheap and keeps depth alive).
    const cam = this.cameras.main;
    for (const layer of this.parallax) {
      layer.sprite.tilePositionX = cam.scrollX * layer.factor;
    }

    if (this.paused) {
      // Consume any Escape edge so React's resume cannot be undone.
      const escape = this.keys?.escape;
      if (escape && Phaser.Input.Keyboard.JustDown(escape)) takeEscSwallow();
      return;
    }

    if (this.gameOver) return;

    const controls = this.readControls();
    if (this.won) {
      controls.left = false;
      controls.right = false;
      controls.jumpHeld = false;
      controls.jumpPressed = false;
      controls.attackPressed = false;
    }

    this.player.update(time, controls);

    if (!this.player.dead && !this.won) {
      this.resolveSwordHits(time);
      this.updateEnemies(time);
      this.resolvePickups();
      this.resolvePit();
      this.updateLastSafe();
      this.trackAttackFx();
      this.updateThinIce(delta);
      this.updateShieldAura();
      this.checkPartAdvance();
    } else {
      this.updateEnemies(time);
    }

    // Pause toggle: the scene only ever initiates a pause; resuming is
    // handled by the React pause menu (with the key hand-off above).
    const escape = this.keys?.escape;
    if (escape && Phaser.Input.Keyboard.JustDown(escape)) {
      if (!takeEscSwallow() && getUI().phase === 'playing') this.pauseGame();
    }
  }

  private readControls(): PlayerControls {
    const t = touchInput;
    const jumpEdge = t.jump && !this.prevTouch.jump;
    const attackEdge = t.attack && !this.prevTouch.attack;
    this.prevTouch = { jump: t.jump, attack: t.attack };

    const kb = this.keys;
    let left = t.left;
    let right = t.right;
    let jumpHeld = t.jump;
    let jumpPressed = jumpEdge;
    let attackPressed = attackEdge;

    if (kb) {
      left = left || kb.leftA.isDown || kb.leftArrow.isDown;
      right = right || kb.rightD.isDown || kb.rightArrow.isDown;
      jumpHeld = jumpHeld || kb.jumpW.isDown || kb.jumpUp.isDown || kb.jumpSpace.isDown;
      const jW = Phaser.Input.Keyboard.JustDown(kb.jumpW);
      const jU = Phaser.Input.Keyboard.JustDown(kb.jumpUp);
      const jS = Phaser.Input.Keyboard.JustDown(kb.jumpSpace);
      const aJ = Phaser.Input.Keyboard.JustDown(kb.attackJ);
      const aX = Phaser.Input.Keyboard.JustDown(kb.attackX);
      jumpPressed = jumpPressed || jW || jU || jS;
      attackPressed = attackPressed || aJ || aX;
    }

    return { left, right, jumpHeld, jumpPressed, attackPressed };
  }

  private updateEnemies(time: number): void {
    const target: EnemyTarget = { x: this.player.x, y: this.player.y, dead: this.player.dead };
    for (const enemy of this.enemies) {
      if (enemy.active) enemy.updateEnemy(time, target);
    }
  }

  private resolveSwordHits(time: number): void {
    if (!this.player.isAttackActive(time)) return;
    const hitbox = this.player.getAttackHitbox();
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      if (!Phaser.Geom.Rectangle.Overlaps(hitbox, enemy.getBounds())) continue;
      if (!this.player.registerAttackHit(enemy, time)) continue;

      const connected = enemy.hurt(1, this.player.x, time);
      if (!connected) continue;
      const killed = enemy.isDead;
      if (killed) {
        this.hitSpark(enemy.x, enemy.y);
        this.cameras.main.shake(110, 0.004);
      } else {
        this.hitSpark(enemy.x, enemy.y - 4);
      }
      AudioManager.get().playSfx('hit');
      this.floatText(enemy.x, enemy.y - 14, killed ? `+${enemy.scoreValue}` : 'HIT', killed ? '#f4c430' : '#f2e6c9');
    }
  }

  private trackAttackFx(): void {
    const attacking = this.player.isAttacking;
    if (attacking && !this.wasAttacking) {
      const facing = this.player.facing;
      const slash = this.add
        .image(this.player.x + facing * 12, this.player.y - 1, 'slash')
        .setDepth(this.player.y + 2)
        .setFlipX(facing === -1)
        .setAlpha(0.95);
      slash.setScale(0.7);
      this.tweens.add({
        targets: slash,
        scale: 1.2,
        alpha: 0,
        duration: 190,
        ease: 'Quad.easeOut',
        onComplete: () => slash.destroy(),
      });
    }
    this.wasAttacking = attacking;
  }

  private resolvePickups(): void {
    const px = this.player.x;
    const py = this.player.y;

    for (const coin of this.coins) {
      if (!coin.active || coin.collected) continue;
      if (Phaser.Math.Distance.Between(px, py, coin.x, coin.y) > COIN_PICKUP_RADIUS) continue;
      if (!coin.collect()) continue;
      this.scoreSys.addCoins(1);
      this.syncHud();
      AudioManager.get().playSfx('coin');
      this.coinBurst(coin.x, coin.y);
      this.floatText(coin.x, coin.y - 6, '+10', '#ffe08a');
    }

    const crystal = this.crystalSprite;
    if (crystal && crystal.active) {
      if (Phaser.Math.Distance.Between(px, py, crystal.x, crystal.y) <= CRYSTAL_PICKUP_RADIUS) {
        this.collectCrystal(crystal);
      }
    }

    for (const power of this.powerUps) {
      if (!power.active || power.collected) continue;
      if (Phaser.Math.Distance.Between(px, py, power.x, power.y) > PICKUP.radius) continue;
      if (!power.collect()) continue;
      this.applyPowerUp(power.kind, power.x, power.y);
    }
  }

  private resolvePit(): void {
    if (this.player.y <= this.layout.pitY) return;
    const now = this.time.now;
    const shielded = now < this.shieldUntil;
    const died = this.applyDamage(null, now);
    // Rescue at the last grounded position — for a fatal fall the death
    // animation plays there instead, so no infinite-fall loop is possible.
    this.player.reposition(this.lastSafePoint.x, this.lastSafePoint.y);
    if (shielded) return; // the shield already showed its own feedback
    if (!died) {
      this.player.health.grantInvulnerability(now, PLAYER.respawnInvulnMs);
      this.cameras.main.flash(160, 20, 30, 25);
    }
    this.onPlayerHurt();
  }

  private updateLastSafe(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!(body.blocked.down || body.touching.down)) return;
    if (this.player.y > this.layout.pitY - 40) return;
    // Only record positions that actually rest on solid ground.
    const tile = this.layer.getTileAtWorldXY(this.player.x, this.player.y + 14);
    if (!tile) return;
    // Never record thin ice: falling through would rescue you into the hole.
    if (this.isThinIceTile(tile.x, tile.y)) return;
    this.lastSafePoint = { x: this.player.x, y: this.player.y - 4 };
  }

  /* ================================================================ */
  /* Damage (shield-aware)                                             */
  /* ================================================================ */

  /**
   * Route all player damage through the shield check. Returns true when
   * real damage landed (callers then run their hurt feedback).
   */
  private applyDamage(fromX: number | null, now: number): boolean {
    if (now < this.shieldUntil) {
      if (now - this.lastShieldBlockAt > 380) {
        this.lastShieldBlockAt = now;
        AudioManager.get().playSfx('hit');
        this.hitSpark(this.player.x, this.player.y - 6);
        this.floatText(this.player.x, this.player.y - 16, 'BLOCKED', '#9ad3c7');
      }
      return false;
    }
    return this.player.takeDamage(fromX, now);
  }

  /* ================================================================ */
  /* Power-ups                                                         */
  /* ================================================================ */

  private applyPowerUp(kind: PowerUpKind, x: number, y: number): void {
    const now = this.time.now;
    const tint = kind === 'heart' ? 0xef6a55 : kind === 'shield' ? 0x9ad3c7 : 0xf4c430;

    if (kind === 'heart') {
      const healed = this.player.heal(1);
      if (healed > 0) {
        AudioManager.get().playSfx('heal');
        this.floatText(x, y - 6, 'HP +1', '#ef6a55');
      } else {
        this.scoreSys.addBonus(SCORE.heartFull);
        this.floatText(x, y - 6, `+${SCORE.heartFull}`, '#f4c430');
      }
    } else if (kind === 'shield') {
      this.shieldUntil = now + PICKUP.shieldMs;
      this.ensureShieldAura();
      AudioManager.get().playSfx('powerup');
      showToast('SHIELD UP', 'teal');
      this.floatText(x, y - 6, 'SHIELD', '#9ad3c7');
    } else {
      this.player.applySpeedBoost(PICKUP.bootsMs);
      AudioManager.get().playSfx('powerup');
      showToast('SPEED UP', 'gold');
      this.floatText(x, y - 6, 'SPEED UP', '#f4c430');
    }

    this.syncHud();
    this.checkpointBurst(x, y, tint);
  }

  private ensureShieldAura(): void {
    if (this.shieldAura) return;
    const aura = this.add
      .image(this.player.x, this.player.y - 1, 'ring')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x9ad3c7)
      .setDepth(this.player.y - 1)
      .setScale(1.5);
    this.tweens.add({
      targets: aura,
      scale: { from: 1.35, to: 1.8 },
      alpha: { from: 0.9, to: 0.55 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.shieldAura = aura;
  }

  private updateShieldAura(): void {
    const active = this.time.now < this.shieldUntil;
    const aura = this.shieldAura;
    if (!active) {
      if (aura) {
        this.tweens.killTweensOf(aura);
        aura.destroy();
        this.shieldAura = null;
      }
      return;
    }
    if (!aura) return;
    aura.setPosition(this.player.x, this.player.y - 1);
    aura.setDepth(this.player.y - 1);
  }

  /* ================================================================ */
  /* Sub-levels (parts)                                               */
  /* ================================================================ */

  /** Which sub-level a world-x position belongs to (1-based). */
  private partForX(x: number): number {
    let part = 1;
    for (const boundary of this.partBoundaries) {
      if (x > boundary) part += 1;
    }
    return Math.min(part, this.levelDef.parts.length);
  }

  /** Crossed into a new sub-level? Announce it and pay the bonus. */
  private checkPartAdvance(): void {
    const part = this.partForX(this.player.x);
    if (part <= this.currentPart) return;
    this.currentPart = part;

    const name = this.levelDef.parts[part - 1] ?? '';
    this.scoreSys.addBonus(SCORE.partClear);
    this.syncHud();
    AudioManager.get().playSfx('powerup');
    this.banner(this.player.x, this.player.y - 40, `PART ${part}`, '#9ad3c7');
    this.floatText(this.player.x, this.player.y - 54, `+${SCORE.partClear}`, '#f4c430');
    this.checkpointBurst(this.player.x, this.player.y, this.theme.accent);
    // Let any checkpoint toast finish before announcing the sub-level.
    this.time.delayedCall(1200, () => showToast(`PART ${part} · ${name}`, 'teal'));
  }

  /* ================================================================ */
  /* Thin ice (Frostfall Peaks)                                        */
  /* ================================================================ */

  /** Lay the collapsible sheets: bridge gaps and mark ridge patches. */
  private spawnThinIce(layout: LevelLayout): void {
    for (const span of layout.thinIce) {
      for (let col = span.c0; col <= span.c1; col++) {
        // Gap spans get a real ice sheet to walk on; ridge patches already
        // have terrain (they collapse to reveal the drop below).
        const existing = this.layer.getTileAt(col, span.row);
        if (!existing || existing.index === -1) {
          this.layer.putTileAt(0, col, span.row);
        }
        const crack = this.add
          .image(col * TILE + TILE / 2, span.row * TILE + TILE / 2, 'ice_crack')
          .setDepth(1)
          .setAlpha(0.26);
        this.iceTiles.push({ col, row: span.row, state: 'solid', timer: 0, crack });
      }
    }
  }

  /**
   * Per-frame ice logic: standing still (or crawling) on a sheet makes it
   * groan, then collapse. Moving at full run speed keeps it intact.
   */
  private updateThinIce(delta: number): void {
    if (this.iceTiles.length === 0) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const feet = body.bottom;
    const px = this.player.x;
    const movingFast = Math.abs(body.velocity.x) >= THIN_ICE.safeSpeed;

    for (const ice of this.iceTiles) {
      if (ice.state === 'gone') continue;

      const x0 = ice.col * TILE;
      const top = ice.row * TILE;
      const standing = px >= x0 - 3 && px <= x0 + TILE + 3 && Math.abs(feet - top) <= 4;

      if (!standing || movingFast) {
        ice.timer = Math.max(0, ice.timer - delta * 1.8);
        continue;
      }

      ice.timer += delta;
      if (ice.state === 'solid' && ice.timer >= THIN_ICE.warnMs) {
        ice.state = 'cracking';
        AudioManager.get().playSfx('crack');
        if (ice.crack) {
          ice.crack.setAlpha(0.95);
          this.tweens.add({
            targets: ice.crack,
            scale: { from: 1, to: 1.2 },
            alpha: { from: 0.95, to: 0.55 },
            duration: 240,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }
      if (ice.timer >= THIN_ICE.collapseMs) this.collapseIce(ice);
    }
  }

  private collapseIce(ice: ThinIceTile): void {
    ice.state = 'gone';
    ice.timer = 0;
    this.layer.putTileAt(-1, ice.col, ice.row);

    const cx = ice.col * TILE + TILE / 2;
    const cy = ice.row * TILE + TILE / 2;
    if (ice.crack) {
      this.tweens.killTweensOf(ice.crack);
      ice.crack.destroy();
      ice.crack = null;
    }
    this.add.image(cx, cy, 'ice_hole').setDepth(1);

    AudioManager.get().playSfx('shatter');
    this.burst(cx, cy, 'px_small', {
      speed: { min: 50, max: 130 },
      angle: { min: 200, max: 340 },
      lifespan: 520,
      gravityY: 420,
      scale: { start: 1.6, end: 0.6 },
      alpha: { start: 1, end: 0 },
      tint: [0xe8f6fb, 0x9fd6e8, 0xffffff],
      quantity: 10,
    });
    this.cameras.main.shake(130, 0.003);
  }

  private isThinIceTile(col: number, row: number): boolean {
    for (const ice of this.iceTiles) {
      if (ice.col === col && ice.row === row) return true;
    }
    return false;
  }

  /* ================================================================ */
  /* Events                                                            */
  /* ================================================================ */

  private onPlayerHurt(): void {
    this.syncHud();
    this.cameras.main.shake(160, 0.008);
    this.damageFlash.setAlpha(0.32);
    this.tweens.killTweensOf(this.damageFlash);
    this.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeIn',
    });
  }

  private handleEnemyKilled(enemy: Enemy): void {
    this.scoreSys.addEnemyKill(enemy.scoreValue);
    this.syncHud();
    this.enemyBurst(enemy.x, enemy.y);
    this.maybeDropLoot(enemy);
  }

  /** Slain enemies may drop a heart (while hurt) or a coin. */
  private maybeDropLoot(enemy: Enemy): void {
    const hurt = this.player.health.health < PLAYER.maxHealth;
    if (hurt && Math.random() < PICKUP.dropHeartChance) {
      this.powerUps.push(PowerUp.spawn(this, enemy.x, enemy.y - 6, 'heart'));
      return;
    }
    if (!hurt && Math.random() < PICKUP.dropCoinChance) {
      this.coins.push(Coin.spawn(this, enemy.x, enemy.y - 8));
    }
  }

  private handlePlayerDeath(): void {
    if (this.gameOver || this.won) return;
    this.gameOver = true;
    resetTouch();
    if (this.shieldAura) {
      this.tweens.killTweensOf(this.shieldAura);
      this.shieldAura.destroy();
      this.shieldAura = null;
    }
    this.physics.pause();
    SaveSystem.submitScore(this.scoreSys.score);
    hydrateFromSave(SaveSystem.load());
    this.time.delayedCall(420, () => {
      if (this.gameOver) setPhase('gameover');
    });
  }

  private collectCrystal(crystal: Phaser.GameObjects.Sprite): void {
    const id = this.layout.crystal?.id;
    if (!id) return;

    this.scoreSys.addCrystal();
    this.syncHud();

    const save = SaveSystem.load();
    const set = new Set(save.crystals);
    set.add(id);
    SaveSystem.update({ crystals: [...set] });
    hydrateFromSave(SaveSystem.load());

    AudioManager.get().playSfx('crystal');
    showToast('CRYSTAL +100', 'gold');
    this.floatText(crystal.x, crystal.y - 12, '+100', '#f4c430');
    this.checkpointBurst(crystal.x, crystal.y, this.theme.accent);
    this.cameras.main.flash(220, 255, 240, 200);

    this.tweens.killTweensOf(crystal);
    this.tweens.add({
      targets: crystal,
      y: crystal.y - 14,
      alpha: 0,
      scale: 1.6,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => crystal.destroy(),
    });
    if (this.crystalGlow) {
      const glow = this.crystalGlow;
      this.tweens.killTweensOf(glow);
      this.tweens.add({ targets: glow, alpha: 0, duration: 340, onComplete: () => glow.destroy() });
      this.crystalGlow = null;
    }
    this.crystalSprite = null;
  }

  private activateCheckpoint(index: number, x: number, y: number, sprite: Phaser.GameObjects.Sprite): void {
    if (index <= this.activeCheckpointIndex) return;
    if (this.player.dead || this.won) return;

    this.activeCheckpointIndex = index;
    this.lastSafePoint = { x, y };
    sprite.setFrame('f1');

    const healed = this.player.heal(PLAYER.maxHealth);
    this.syncHud();

    SaveSystem.setCheckpoint(this.levelDef.id, index);
    hydrateFromSave(SaveSystem.load());

    AudioManager.get().playSfx('checkpoint');
    showToast(`CHECKPOINT ${index}`, 'teal');
    this.checkpointBurst(x, y - 8, 0xf4c430);
    this.banner(x, y - 34, 'CHECKPOINT!', '#f4c430');
    if (healed > 0) this.floatText(x, y - 48, 'HP RESTORED', '#ef6a55');

    // Glow overlay for the activated shrine.
    const glow = this.add
      .image(x, y - 10, 'glow')
      .setDepth(sprite.depth - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    this.tweens.add({
      targets: glow,
      scale: { from: 0.8, to: 1.15 },
      alpha: { from: 0.55, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private win(): void {
    if (this.won || this.gameOver || this.player.dead) return;
    this.won = true;
    resetTouch();
    this.player.setVelocity(0, 0);

    this.scoreSys.addBonus(SCORE.levelClear);
    this.syncHud();

    const before = SaveSystem.load().highestUnlockedWorld;
    const { unlockedWorld } = SaveSystem.completeLevel(this.levelDef.id, this.levelDef.worldIndex);
    SaveSystem.submitScore(this.scoreSys.score);
    hydrateFromSave(SaveSystem.load());

    AudioManager.get().playSfx('victory');
    this.cameras.main.flash(340, 255, 244, 210);
    this.banner(this.player.x, this.player.y - 36, 'LEVEL COMPLETE!', '#f4c430');
    this.checkpointBurst(this.exitSprite.x, this.exitSprite.y, 0xf4c430);

    if (unlockedWorld > before) {
      this.time.delayedCall(1500, () => showToast(`WORLD ${unlockedWorld} UNLOCKED`, 'gold'));
    }

    this.time.delayedCall(1200, () => {
      if (!this.won) return;
      this.physics.pause();
      setPhase('victory');
    });
  }

  /* ================================================================ */
  /* Feedback effects                                                  */
  /* ================================================================ */

  private floatText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color,
        stroke: '#080b0a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(9500);
    this.tweens.add({
      targets: label,
      y: y - 18,
      alpha: 0,
      duration: 750,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private banner(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color,
        stroke: '#080b0a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(9500);
    this.tweens.add({
      targets: label,
      y: y - 20,
      duration: 900,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: 900,
      duration: 350,
      onComplete: () => label.destroy(),
    });
  }

  private burst(
    x: number,
    y: number,
    texture: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  ): void {
    const emitter = this.add.particles(x, y, texture, { ...config, emitting: false });
    emitter.explode(typeof config.quantity === 'number' ? config.quantity : 8);
    this.time.delayedCall(900, () => {
      if (emitter.active) emitter.destroy();
    });
  }

  private coinBurst(x: number, y: number): void {
    this.burst(x, y, 'spark', {
      speed: { min: 30, max: 70 },
      angle: { min: 0, max: 360 },
      lifespan: 320,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xf4c430, 0xffe08a, 0xffffff],
      quantity: 6,
    });
  }

  private hitSpark(x: number, y: number): void {
    this.burst(x, y, 'spark', {
      speed: { min: 40, max: 90 },
      angle: { min: 0, max: 360 },
      lifespan: 240,
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xffe08a],
      quantity: 5,
    });
  }

  private enemyBurst(x: number, y: number): void {
    this.burst(x, y, 'px_dot', {
      speed: { min: 35, max: 95 },
      angle: { min: 200, max: 340 },
      lifespan: 480,
      gravityY: 380,
      scale: { start: 1.6, end: 0.4 },
      alpha: { start: 1, end: 0 },
      tint: [0x46a06a, 0x2f6b4a, 0x9ad3c7],
      quantity: 12,
    });
    this.burst(x, y, 'puff', {
      speed: { min: 8, max: 24 },
      angle: { min: 0, max: 360 },
      lifespan: 420,
      scale: { start: 0.7, end: 1.4 },
      alpha: { start: 0.75, end: 0 },
      quantity: 4,
    });
  }

  private checkpointBurst(x: number, y: number, tint: number): void {
    const ring = this.add.image(x, y, 'ring').setDepth(9400).setBlendMode(Phaser.BlendModes.ADD).setTint(tint);
    this.tweens.add({
      targets: ring,
      scale: { from: 0.5, to: 2.6 },
      alpha: { from: 0.95, to: 0 },
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.burst(x, y, 'spark', {
      speed: { min: 45, max: 110 },
      angle: { min: 0, max: 360 },
      lifespan: 520,
      scale: { start: 1.3, end: 0 },
      alpha: { start: 1, end: 0 },
      tint,
      quantity: 14,
    });
  }

  private spawnLandingDust(fallSpeed: number): void {
    const strength = Math.min(1, fallSpeed / 500);
    this.burst(this.player.x, this.player.y + 11, 'puff', {
      speed: { min: 14, max: 40 },
      angle: { min: 200, max: 340 },
      lifespan: 340,
      scale: { start: 0.6 + strength * 0.5, end: 1.3 },
      alpha: { start: 0.7, end: 0 },
      quantity: Math.round(3 + strength * 4),
    });
    if (strength > 0.6) this.cameras.main.shake(90, 0.003);
  }

  /* ================================================================ */
  /* HUD + scene control                                               */
  /* ================================================================ */

  private syncHud(): void {
    setHud({
      health: this.player ? this.player.health.health : PLAYER.maxHealth,
      maxHealth: PLAYER.maxHealth,
      ...(this.scoreSys ? this.scoreSys.snapshot() : {}),
      worldName: this.levelDef.worldName,
      levelName: this.levelDef.levelName,
      part: this.currentPart,
      parts: this.levelDef.parts.length,
    });
  }

  /* ---------------- GameplaySceneLike ---------------- */

  pauseGame(): void {
    if (this.paused || this.gameOver || this.won) return;
    this.paused = true;
    resetTouch();
    this.physics.pause();
    this.anims.pauseAll();
    for (const emitter of this.ambient) emitter.emitting = false;
    this.overlayTween?.pause();
    this.vignetteTween?.pause();
    for (const tween of this.blinkTweens) tween.pause();
    setPhase('paused');
  }

  resumeGame(): void {
    if (!this.paused) return;
    this.paused = false;
    this.physics.resume();
    this.anims.resumeAll();
    for (const emitter of this.ambient) emitter.emitting = true;
    this.overlayTween?.resume();
    this.vignetteTween?.resume();
    for (const tween of this.blinkTweens) tween.resume();
    setPhase('playing');
  }

  restartLevel(): void {
    // Make sure a previous pause cannot leak into the fresh run.
    this.paused = false;
    this.physics.resume();
    this.anims.resumeAll();
    for (const emitter of this.ambient) emitter.emitting = true;
    this.overlayTween?.resume();
    this.vignetteTween?.resume();
    for (const tween of this.blinkTweens) tween.resume();
    resetTouch();

    const save = SaveSystem.load();
    const checkpoint = this.activeCheckpointIndex;
    this.scene.restart({
      levelId: this.levelDef.id,
      mode: checkpoint > 0 ? 'continue' : 'new',
      checkpoint,
      collectedCrystals: save.crystals,
    } satisfies LevelInit);
  }

  returnToMenu(): void {
    resetTouch();
    AudioManager.get().playMusic('menu');
    setPhase('menu');
    this.scene.start(SCENE_KEYS.menu);
  }
}
