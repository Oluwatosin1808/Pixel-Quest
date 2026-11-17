import Phaser from 'phaser';

/**
 * A collectible coin: spins in place with a gentle bob. Collection is
 * resolved by proximity in the level scene (no physics body needed), which
 * keeps coins cheap and lets them float freely above pits.
 */
export class Coin extends Phaser.GameObjects.Sprite {
  collected = false;
  private bobTween: Phaser.Tweens.Tween | null = null;

  private constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'coin', 'f0');
    scene.add.existing(this);
    this.play('coin_spin');
    this.setDepth(y);
  }

  static spawn(scene: Phaser.Scene, x: number, y: number): Coin {
    const coin = new Coin(scene, x, y);
    coin.bobTween = scene.tweens.add({
      targets: coin,
      y: y - 2.5,
      duration: 750 + ((x * 13) % 300),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return coin;
  }

  /**
   * Collect the coin. Returns true only the first time.
   * The caller is responsible for scoring and particle effects.
   */
  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    this.bobTween?.stop();
    this.bobTween = null;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 8,
      alpha: 0,
      scale: 1.6,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
    return true;
  }

  override destroy(fromScene?: boolean): void {
    this.bobTween?.stop();
    this.bobTween = null;
    super.destroy(fromScene);
  }
}
