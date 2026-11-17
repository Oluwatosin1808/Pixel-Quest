import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS, TILE } from '../config/gameConfig';
import { ensureTextures } from '../utils/textures';
import { AudioManager } from '../systems/AudioManager';
import { setPhase } from '../../store/uiStore';

/**
 * Atmospheric title-screen background rendered by Phaser behind the React
 * menu: parallax forest, drifting light, the adventurer idling on the ground
 * and a slime bouncing past.
 */
export class MainMenuScene extends Phaser.Scene {
  private layers: Array<{ sprite: Phaser.GameObjects.TileSprite; speed: number }> = [];
  private drift = 0;

  constructor() {
    super(SCENE_KEYS.menu);
  }

  create(): void {
    ensureTextures(this);
    AudioManager.get().playMusic('menu');
    // Reveal the React title screen once the backdrop is ready.
    setPhase('menu');

    /* --- Parallax background (screen-fixed tile sprites) --- */
    const bg = (key: string, depth: number, y: number): Phaser.GameObjects.TileSprite => {
      const sprite = this.add.tileSprite(GAME_WIDTH / 2, y, GAME_WIDTH, GAME_HEIGHT, key).setDepth(depth);
      sprite.setOrigin(0.5, 0.5);
      return sprite;
    };

    this.layers = [
      { sprite: this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg_sky').setDepth(-100) as Phaser.GameObjects.TileSprite, speed: 0 },
      { sprite: bg('bg_hills', -94, GAME_HEIGHT - 70), speed: 3 },
      { sprite: bg('bg_treeline', -90, GAME_HEIGHT - 85), speed: 7 },
      { sprite: bg('bg_treeline2', -86, GAME_HEIGHT - 100), speed: 13 },
      { sprite: bg('bg_near', -70, GAME_HEIGHT / 2), speed: 22 },
    ];

    // Light beams (additive, subtle).
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_beams')
      .setDepth(-60)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.9);

    /* --- Ground strip --- */
    const surfaceY = 240;
    for (let col = 0; col < GAME_WIDTH / TILE; col++) {
      const x = col * TILE + TILE / 2;
      this.add.image(x, surfaceY + TILE / 2, 'tiles', 'f0').setDepth(0);
      this.add.image(x, surfaceY + TILE * 1.5, 'tiles', 'f1').setDepth(0);
      this.add.image(x, surfaceY + TILE * 2.5, 'tiles', 'f1').setDepth(0);
    }

    /* --- Props --- */
    this.add.image(60, surfaceY, 'tree_b').setOrigin(0.5, 1).setDepth(-40).setY(surfaceY + 2);
    this.add.image(420, surfaceY, 'tree_a').setOrigin(0.5, 1).setDepth(-40).setY(surfaceY + 2);
    this.add.image(380, surfaceY, 'tree_c').setOrigin(0.5, 1).setDepth(-40).setY(surfaceY + 2);
    this.add.image(205, surfaceY + 5, 'bush').setOrigin(0.5, 1).setDepth(surfaceY + 5);
    this.add.image(300, surfaceY + 4, 'tuft').setOrigin(0.5, 1).setDepth(surfaceY + 4);
    this.add.image(150, surfaceY + 4, 'flower_a').setOrigin(0.5, 1).setDepth(surfaceY + 4);
    this.add.image(355, surfaceY + 4, 'flower_b').setOrigin(0.5, 1).setDepth(surfaceY + 4);

    /* --- Characters --- */
    const hero = this.add.sprite(120, surfaceY - 12, 'player_idle', 'f0').setDepth(surfaceY - 12);
    hero.play('player_idle');

    const slime = this.add.sprite(330, surfaceY - 8, 'slime', 'f0').setDepth(surfaceY - 8);
    slime.play('slime_move');
    this.tweens.add({
      targets: slime,
      x: 400,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
      onYoyo: () => slime.setFlipX(true),
      onRepeat: () => slime.setFlipX(false),
    });

    /* --- Floating coins --- */
    for (const [i, x] of [250, 275, 300].entries()) {
      const coin = this.add.sprite(x, surfaceY - 40 - (i === 1 ? 8 : 0), 'coin', 'f0').setDepth(surfaceY - 40);
      coin.play('coin_spin');
      this.tweens.add({
        targets: coin,
        y: coin.y - 3,
        duration: 900 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    /* --- Ambient dust + fireflies --- */
    this.add
      .particles(0, 0, 'px_dot', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 40, max: GAME_HEIGHT - 30 },
        lifespan: { min: 3000, max: 6000 },
        speed: { min: 3, max: 9 },
        angle: { min: 200, max: 340 },
        alpha: { start: 0.35, end: 0 },
        scale: { start: 1, end: 0.6 },
        quantity: 1,
        frequency: 500,
      })
      .setDepth(40);

    this.add
      .particles(0, 0, 'px_dot', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 60, max: GAME_HEIGHT - 40 },
        lifespan: { min: 2500, max: 5000 },
        speed: { min: 4, max: 14 },
        angle: { min: 0, max: 360 },
        alpha: { start: 0.9, end: 0 },
        scale: { start: 1.4, end: 0.4 },
        tint: [0xf4c430, 0xffe08a],
        blendMode: 'ADD',
        quantity: 1,
        frequency: 700,
      })
      .setDepth(41);
  }

  override update(_time: number, delta: number): void {
    this.drift += delta;
    for (const layer of this.layers) {
      if (layer.speed > 0) layer.sprite.tilePositionX += (layer.speed * delta) / 1000;
    }
    const sky = this.layers[0];
    if (sky) sky.sprite.setTilePosition(this.drift * 0.004, 0);
  }
}
