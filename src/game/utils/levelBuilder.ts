import Phaser from 'phaser';
import { TILE } from '../config/gameConfig';
import type { LevelLayout } from '../config/levelData';

/**
 * Turns a LevelLayout into a colliding tilemap layer plus non-interactive
 * decoration sprites (trees, bushes, props).
 */
export function createTileLayer(scene: Phaser.Scene, layout: LevelLayout): Phaser.Tilemaps.TilemapLayer {
  const map = scene.make.tilemap({
    data: layout.grid,
    tileWidth: TILE,
    tileHeight: TILE,
  });
  const tileset = map.addTilesetImage('tiles', layout.tileKey ?? 'tiles', TILE, TILE, 0, 0);
  if (!tileset) throw new Error('tileset could not be created');
  const layer = map.createLayer(0, tileset, 0, 0);
  if (!layer) throw new Error('tile layer could not be created');

  layer.setCollisionByExclusion([-1]);
  layer.setDepth(0);
  return layer;
}

/** Place decoration sprites behind / around the play plane. */
export function spawnDecorations(scene: Phaser.Scene, layout: LevelLayout): void {
  for (const deco of layout.decorations) {
    const image = scene.add.image(deco.x, deco.y, deco.key);
    // Trees render behind the terrain; small props sort by world y.
    if (deco.key.startsWith('tree_')) {
      image.setDepth(-40);
      // Keep tree bases flush with the ground surface.
      image.setOrigin(0.5, 1);
      image.setY(deco.y + 2);
    } else {
      image.setOrigin(0.5, 1);
      image.setY(deco.y);
      image.setDepth(deco.y);
    }
  }
}
