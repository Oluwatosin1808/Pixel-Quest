import Phaser from 'phaser';

export type PowerUpKind = 'heart' | 'shield' | 'boots';

const TEXTURE_BY_KIND: Record<PowerUpKind, string> = {
  heart: 'power_heart',
  shield: 'power_shield',
  boots: 'power_boots',
};

const GLOW_TINT: Record<PowerUpKind, number> = {
  heart: 0xef6a55,
  shield: 0x9ad3c7,
  boots: 0xf4c430,
};

/**
 * A floating power-up: hearts restore health, shields grant temporary
 * invulnerability and boots grant a burst of speed. Collection is resolved
 * by proximity in the level scene (same as coins) so pickups can hover
 * over pits and ledges without physics bodies.
 */
export class PowerUp extends Phaser.GameObjects.Sprite {
  readonly kind: PowerUpKind;
  collected = false;
  private bobTween: Phaser.Tweens.Tween | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private glow: Phaser.GameObjects.Image | null = null;

  private constructor(scene: Phaser.Scene, x: number, y: number, kind: PowerUpKind) {
    super(scene, x, y, TEXTURE_BY_KIND[kind], 'f0');
    scene.add.existing(this);
    this.kind = kind;
    this.setDepth(y);
    this.play(`${kind}_pulse`);

    this.glow = scene.add
      .image(x, y, 'glow')
      .setDepth(y - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.38)
      .setTint(GLOW_TINT[kind])
      .setScale(0.9);
    this.glowTween = scene.tweens.add({
      targets: this.glow,
      scale: { from: 0.8, to: 1.25 },
      alpha: { from: 0.42, to: 0.24 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  static spawn(scene: Phaser.Scene, x: number, y: number, kind: PowerUpKind): PowerUp {
    const power = new PowerUp(scene, x, y, kind);
    power.bobTween = scene.tweens.add({
      targets: power,
      y: y - 3,
      duration: 820 + ((x * 7) % 260),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return power;
  }

  /**
   * Collect the power-up. Returns true only the first time; the caller
   * applies the effect, score and particle feedback.
   */
  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    this.bobTween?.stop();
    this.bobTween = null;
    this.glowTween?.stop();
    this.glowTween = null;

    const glow = this.glow;
    this.glow = null;
    if (glow) {
      this.scene.tweens.add({
        targets: glow,
        scale: 2.2,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => glow.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      alpha: 0,
      scale: 1.7,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
    return true;
  }

  override destroy(fromScene?: boolean): void {
    this.bobTween?.stop();
    this.bobTween = null;
    this.glowTween?.stop();
    this.glowTween = null;
    if (this.glow) {
      this.glow.destroy();
      this.glow = null;
    }
    super.destroy(fromScene);
  }
}
