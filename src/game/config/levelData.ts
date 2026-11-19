import { TILE } from '../config/gameConfig';

/**
 * Whispering Woods — World 1 level layout.
 *
 * The level is painted into a tile grid with helper functions so the
 * platforming geometry is readable and easy to tune. Tiles: -1 empty,
 * 0 grass, 1 dirt, 2 wooden plank, 3 stone.
 */

export const LEVEL_COLS = 240;
export const LEVEL_ROWS = 22;
/** Ground surface row (the first solid row of the main terrain). */
const SURFACE_ROW = 18;

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface EnemySpawn {
  type: 'slime' | 'bat';
  x: number;
  y: number;
  minX: number;
  maxX: number;
  /** Optional colour shift so each world's slimes match the scenery. */
  tint?: number;
  /** Elite variant: bigger, tougher, worth more score. */
  big?: boolean;
}

export interface PickupSpawn {
  type: 'heart' | 'shield' | 'boots';
  x: number;
  y: number;
}

/** A span of collapsible ice (Frostfall Peaks only). */
export interface ThinIceSpawn {
  c0: number;
  c1: number;
  row: number;
}

export interface CheckpointSpawn {
  id: string;
  index: number;
  x: number;
  y: number;
}

export interface DecorationSpawn {
  key: string;
  x: number;
  y: number;
}

export interface LevelLayout {
  grid: number[][];
  cols: number;
  rows: number;
  /** Texture key of the 4-tile tileset (surface / fill / plank / block). */
  tileKey: string;
  playerStart: SpawnPoint;
  coins: SpawnPoint[];
  enemies: EnemySpawn[];
  pickups: PickupSpawn[];
  thinIce: ThinIceSpawn[];
  crystal: { id: string; x: number; y: number } | null;
  checkpoints: CheckpointSpawn[];
  exit: SpawnPoint;
  decorations: DecorationSpawn[];
  /** World y beyond which the player has fallen into a pit. */
  pitY: number;
}

const tx = (col: number): number => col * TILE + TILE / 2;
const ty = (row: number): number => row * TILE + TILE / 2;

export function buildWhisperingWoods(): LevelLayout {
  const cols = LEVEL_COLS;
  const rows = LEVEL_ROWS;
  const grid: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(-1));

  const fill = (c0: number, r0: number, c1: number, r1: number, tile: number): void => {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = tile;
      }
    }
  };

  const ground = (c0: number, c1: number, surfaceRow = SURFACE_ROW): void => {
    fill(c0, surfaceRow, c1, rows - 1, 1);
  };

  /* ---------------- Terrain ---------------- */

  // Section A — start meadow.
  ground(0, 39);

  // Gap A (cols 40-43) — first pit.
  ground(44, 57);

  // Gap B (cols 58-62) — stepping platform in the middle.
  fill(60, 15, 61, 15, 1);
  ground(63, 74);

  // Approach stairs to the bridge.
  fill(75, 17, 75, rows - 1, 1);
  fill(76, 16, 77, rows - 1, 1);

  // Wooden bridge over a long pit (cols 78-101).
  fill(78, 16, 101, 16, 2);
  fill(102, 16, 103, rows - 1, 1);
  fill(104, 17, 104, rows - 1, 1);

  // Section E — checkpoint meadow.
  ground(105, 175);

  // Hidden high ledge (crystal) above cols 129-143.
  fill(129, 15, 130, 15, 1);
  fill(132, 13, 134, 13, 1);
  fill(135, 12, 143, 12, 1);

  // Gap C (cols 176-179).
  ground(180, 202);

  // Hill bump on the approach.
  fill(186, 16, 193, rows - 1, 1);

  // Raised plateau (cols 203-210).
  fill(203, 15, 210, rows - 1, 1);
  ground(211, 215);

  // Gap D (cols 216-219).
  ground(220, 239);

  /* ---------------- Tile dressing ---------------- */

  // Grass on any solid tile with empty space above; dirt underneath.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === -1) continue;
      if (grid[r][c] === 2 || grid[r][c] === 3) continue; // planks / stone keep their tile
      const above = r > 0 ? grid[r - 1][c] : -1;
      grid[r][c] = above === -1 ? 0 : 1;
    }
  }

  /* ---------------- Surface probe (for decoration placement) ---------------- */

  const surfaceY = (col: number): number | null => {
    for (let r = 0; r < rows; r++) {
      if (grid[r][col] !== -1) return r * TILE;
    }
    return null;
  };

  /* ---------------- Coins ---------------- */

  const coins: SpawnPoint[] = [];
  const coin = (col: number, row: number): void => {
    coins.push({ x: tx(col), y: ty(row) });
  };
  const coinArc = (cols_: number[], rows_ : number[]): void => {
    cols_.forEach((c, i) => coin(c, rows_[i]));
  };

  // Start meadow trail.
  coin(8, 16);
  coin(10, 16);
  coin(12, 16);
  coin(14, 16);

  // Over gap A.
  coinArc([40, 41, 42, 43], [14, 13, 13, 14]);

  // Landing after gap A.
  coin(47, 16);
  coin(49, 16);
  coin(51, 16);

  // Gap B route.
  coinArc([58, 60, 61, 63], [14, 13, 13, 14]);

  // Across the bridge.
  coin(80, 15);
  coin(84, 15);
  coin(88, 15);
  coin(92, 15);
  coin(96, 15);

  // Around checkpoint 1.
  coin(107, 16);
  coin(109, 16);
  coin(111, 16);
  coin(113, 16);

  // Hidden route up to the crystal ledge.
  coin(129, 14);
  coin(131, 12);
  coin(133, 12);
  coin(136, 11);
  coin(138, 11);
  coin(142, 11);
  // Decoy coins below the ledge.
  coin(137, 16);
  coin(139, 16);

  // Section after the hidden area.
  coin(150, 16);
  coin(153, 16);
  coin(156, 16);

  // Over gap C.
  coinArc([176, 177, 178, 179], [14, 13, 13, 14]);

  // Hilltop coins.
  coin(187, 14);
  coin(189, 14);
  coin(191, 14);

  // Plateau coins.
  coin(204, 13);
  coin(206, 13);
  coin(208, 13);

  // Over gap D.
  coinArc([216, 217, 218, 219], [14, 13, 13, 14]);

  // Final stretch.
  coin(222, 16);
  coin(225, 16);
  coin(228, 16);
  coin(231, 16);

  /* ---------------- Enemies ---------------- */

  const slime = (c0: number, c1: number, surfaceRow = SURFACE_ROW): EnemySpawn => ({
    type: 'slime',
    x: tx(Math.round((c0 + c1) / 2)),
    y: surfaceRow * TILE - 8,
    minX: c0 * TILE + 6,
    maxX: (c1 + 1) * TILE - 6,
  });

  const enemies: EnemySpawn[] = [
    slime(18, 30), // patrolling the start meadow
    slime(46, 56), // right after gap A
    slime(66, 74), // holding the ground before the bridge
    slime(82, 97, 16), // on the wooden bridge
    slime(118, 128), // stalking the meadow before the crystal ledge
    slime(147, 157), // guarding the stretch after the crystal
    { type: 'slime', big: true, x: tx(165), y: SURFACE_ROW * TILE - 8, minX: 160 * TILE + 6, maxX: 171 * TILE - 6 },
    slime(194, 202), // between hill and plateau
    slime(224, 232), // guarding the exit
    { type: 'bat', x: tx(90), y: SURFACE_ROW * TILE - 74, minX: 84 * TILE, maxX: 97 * TILE },
    { type: 'bat', x: tx(224), y: SURFACE_ROW * TILE - 82, minX: 217 * TILE, maxX: 231 * TILE },
  ];

  /* ---------------- Pickups ---------------- */

  const pickups: PickupSpawn[] = [
    { type: 'heart', x: tx(47), y: ty(16) },
    { type: 'boots', x: tx(68), y: ty(16) },
    { type: 'shield', x: tx(100), y: ty(15) },
    { type: 'boots', x: tx(150), y: ty(16) },
    { type: 'heart', x: tx(194), y: ty(14) },
    { type: 'shield', x: tx(207), y: ty(13) },
    { type: 'heart', x: tx(226), y: ty(16) },
  ];

  /* ---------------- Crystal ---------------- */

  const crystal = { id: 'ww_crystal_1', x: tx(140), y: ty(11) };

  /* ---------------- Checkpoints ---------------- */

  const checkpoints: CheckpointSpawn[] = [
    { id: 'ww_cp_1', index: 1, x: tx(110), y: SURFACE_ROW * TILE - 16 },
    { id: 'ww_cp_2', index: 2, x: tx(182), y: SURFACE_ROW * TILE - 16 },
  ];

  /* ---------------- Exit ---------------- */

  const exit: SpawnPoint = { x: 234 * TILE, y: SURFACE_ROW * TILE - 32 };

  /* ---------------- Decorations ---------------- */

  const decorations: DecorationSpawn[] = [];
  const treeTypes = ['tree_a', 'tree_b', 'tree_c'];
  const treeCols = [6, 14, 24, 34, 47, 55, 66, 73, 108, 116, 124, 148, 155, 162, 170, 174, 183, 197, 201, 213, 221, 228, 235, 238];
  treeCols.forEach((col, i) => {
    const y = surfaceY(col);
    if (y === null) return;
    decorations.push({ key: treeTypes[i % treeTypes.length], x: tx(col), y });
  });

  const bushCols = [9, 16, 27, 44, 52, 70, 90, 99, 112, 120, 133, 145, 158, 166, 184, 192, 199, 213, 226, 232];
  for (const col of bushCols) {
    const y = surfaceY(col);
    if (y === null) continue;
    decorations.push({ key: 'bush', x: tx(col), y: y + 5 });
  }

  const tuftCols = [5, 7, 11, 19, 22, 31, 36, 45, 50, 65, 68, 74, 93, 101, 106, 114, 118, 127, 141, 149, 154, 163, 171, 181, 188, 195, 205, 212, 223, 230, 237];
  for (const col of tuftCols) {
    const y = surfaceY(col);
    if (y === null) continue;
    decorations.push({ key: 'tuft', x: tx(col), y: y + 4 });
  }

  const flowerCols: Array<[number, string]> = [
    [12, 'flower_a'],
    [21, 'flower_b'],
    [33, 'flower_a'],
    [48, 'flower_b'],
    [67, 'flower_a'],
    [110, 'flower_a'],
    [117, 'flower_b'],
    [146, 'flower_a'],
    [160, 'flower_b'],
    [183, 'flower_a'],
    [198, 'flower_b'],
    [224, 'flower_a'],
    [233, 'flower_a'],
  ];
  for (const [col, key] of flowerCols) {
    const y = surfaceY(col);
    if (y === null) continue;
    decorations.push({ key, x: tx(col), y: y + 3 });
  }

  const mushroomCols = [15, 69, 119, 169, 207];
  for (const col of mushroomCols) {
    const y = surfaceY(col);
    if (y === null) continue;
    decorations.push({ key: 'mushroom', x: tx(col), y: y + 4 });
  }

  const rockCols = [26, 56, 126, 175, 200, 229];
  for (const col of rockCols) {
    const y = surfaceY(col);
    if (y === null) continue;
    decorations.push({ key: 'rock', x: tx(col), y: y + 3 });
  }

  // Tutorial sign near the start.
  const signY = surfaceY(7);
  if (signY !== null) decorations.push({ key: 'sign', x: tx(7), y: signY + 7 });

  return {
    grid,
    cols,
    rows,
    tileKey: 'tiles',
    playerStart: { x: tx(4), y: SURFACE_ROW * TILE - 12 },
    coins,
    enemies,
    pickups,
    thinIce: [],
    crystal,
    checkpoints,
    exit,
    decorations,
    pitY: rows * TILE - 8,
  };
}

/* ================================================================== */
/* Shared helpers for the later worlds                                 */
/* ================================================================== */

type Grid = number[][];

function newGrid(cols: number, rows: number): Grid {
  return Array.from({ length: rows }, () => Array<number>(cols).fill(-1));
}

function fillRect(grid: Grid, c0: number, r0: number, c1: number, r1: number, tile: number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = tile;
    }
  }
}

/** Solid terrain from column `c0` to `c1`, starting at `surfaceRow`. */
function groundRect(grid: Grid, c0: number, c1: number, surfaceRow: number, fillTile: number): void {
  fillRect(grid, c0, surfaceRow, c1, grid.length - 1, fillTile);
}

/**
 * Exposed solid tiles become the surface tile, buried ones the fill tile.
 * Tiles listed in `keep` (planks, cut stone) are left untouched.
 */
function dressTerrain(grid: Grid, surfaceTile: number, fillTile: number, keep: number[]): void {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === -1 || keep.includes(grid[r][c])) continue;
      grid[r][c] = r > 0 && grid[r - 1][c] === -1 ? surfaceTile : fillTile;
    }
  }
}

function topRowOf(grid: Grid, col: number): number | null {
  for (let r = 0; r < grid.length; r++) if (grid[r][col] !== -1) return r;
  return null;
}

/** Small scaffold so each world can declare its props / coins tersely. */
interface Draft {
  grid: Grid;
  cols: number;
  rows: number;
  surface: number;
  coins: SpawnPoint[];
  enemies: EnemySpawn[];
  pickups: PickupSpawn[];
  decorations: DecorationSpawn[];
}

function draftTools(d: Draft) {
  const fill = (c0: number, r0: number, c1: number, r1: number, tile = 3): void => fillRect(d.grid, c0, r0, c1, r1, tile);
  const ground = (c0: number, c1: number, surface = d.surface): void => groundRect(d.grid, c0, c1, surface, 1);
  const coin = (col: number, row: number): void => {
    d.coins.push({ x: tx(col), y: ty(row) });
  };
  const coinArc = (cols_: number[], rows_: number[]): void => cols_.forEach((c, i) => coin(c, rows_[i]));
  const surfaceY = (col: number): number | null => {
    const r = topRowOf(d.grid, col);
    return r === null ? null : r * TILE;
  };
  const prop = (key: string, col: number, dy = 3): void => {
    const y = surfaceY(col);
    if (y === null) return;
    d.decorations.push({ key, x: tx(col), y: y + dy });
  };
  const slime = (c0: number, c1: number, surface = d.surface, tint?: number, big = false): void => {
    d.enemies.push({
      type: 'slime',
      x: tx(Math.round((c0 + c1) / 2)),
      y: surface * TILE - 8,
      minX: c0 * TILE + 6,
      maxX: (c1 + 1) * TILE - 6,
      ...(tint === undefined ? {} : { tint }),
      ...(big ? { big: true } : {}),
    });
  };
  /** Flying enemy hovering `height` px above the surface row. */
  const bat = (c0: number, c1: number, height = 76, surface = d.surface, tint?: number): void => {
    d.enemies.push({
      type: 'bat',
      x: tx(Math.round((c0 + c1) / 2)),
      y: surface * TILE - height,
      minX: c0 * TILE,
      maxX: (c1 + 1) * TILE,
      ...(tint === undefined ? {} : { tint }),
    });
  };
  /** Power-up / health pickup resting on the surface row. */
  const pickup = (type: PickupSpawn['type'], col: number, dy = 24): void => {
    d.pickups.push({ type, x: tx(col), y: d.surface * TILE - dy });
  };
  return { fill, ground, coin, coinArc, surfaceY, prop, slime, bat, pickup };
}

function finishDraft(d: Draft, extra: Partial<LevelLayout>): LevelLayout {
  return {
    grid: d.grid,
    cols: d.cols,
    rows: d.rows,
    tileKey: 'tiles',
    playerStart: { x: tx(4), y: d.surface * TILE - 12 },
    coins: d.coins,
    enemies: d.enemies,
    pickups: d.pickups,
    thinIce: [],
    crystal: null,
    checkpoints: [],
    exit: { x: (d.cols - 8) * TILE, y: d.surface * TILE - 32 },
    decorations: d.decorations,
    pitY: d.rows * TILE - 8,
    ...extra,
  };
}

function makeDraft(cols: number, rows: number, surface: number): Draft {
  return { grid: newGrid(cols, rows), cols, rows, surface, coins: [], enemies: [], pickups: [], decorations: [] };
}

/* ================================================================== */
/* World 2 — Ember Caverns                                             */
/* ================================================================== */

export function buildEmberCaverns(): LevelLayout {
  const cols = 214;
  const rows = LEVEL_ROWS;
  const surface = 18;
  const d = makeDraft(cols, rows, surface);
  const t = draftTools(d);
  const { fill, ground, coin, coinArc, prop, slime, bat, pickup } = t;

  /* ---------------- Terrain ---------------- */

  ground(0, 32);
  fill(35, 16, 36, 16); // stepping stone over the first lava pit (33-38)
  ground(39, 62);

  // Stairs climbing out of the entry pit onto the bridge approach.
  fill(63, 17, 63, rows - 1);
  fill(64, 16, 65, rows - 1);
  fill(66, 15, 67, rows - 1);
  fill(68, 15, 74, 15); // ledge
  fill(75, 15, 104, 15); // stone bridge across the lava lake
  fill(105, 16, 107, rows - 1);
  fill(108, 17, 110, rows - 1);
  ground(111, 140);

  // The chasm crossing: five stepping stones climbing to the crystal ledge.
  fill(143, 16, 145, 16);
  fill(148, 13, 150, 13);
  fill(153, 10, 156, 10); // crystal shelf
  fill(159, 13, 162, 13);
  fill(164, 16, 167, 16);
  ground(168, 190);

  ground(195, cols - 1); // lava gap 191-194

  dressTerrain(d.grid, 0, 1, [2, 3]);

  /* ---------------- Coins ---------------- */

  coin(6, 16);
  coin(9, 16);
  coin(12, 16);
  coin(15, 16);
  coin(18, 16);
  coinArc([33, 34, 36, 37, 38], [14, 13, 13, 14, 14]);
  coin(44, 16);
  coin(47, 16);
  coin(50, 16);
  coin(53, 16);
  coin(56, 16);
  coin(59, 16);
  coin(70, 14);
  coin(73, 14);
  coin(80, 14);
  coin(85, 14);
  coin(90, 14);
  coin(95, 14);
  coin(100, 14);
  coin(115, 16);
  coin(118, 16);
  coin(121, 16);
  coin(124, 16);
  coin(127, 16);
  coin(130, 16);
  coin(133, 16);
  coin(136, 16);
  coin(144, 15);
  coin(149, 12);
  coin(154, 9);
  coin(155, 9);
  coin(160, 12);
  coin(165, 15);
  coin(172, 16);
  coin(176, 16);
  coin(180, 16);
  coin(184, 16);
  coin(188, 16);
  coinArc([191, 192, 193, 194], [14, 13, 13, 14]);
  coin(200, 16);
  coin(204, 16);
  coin(208, 16);

  /* ---------------- Enemies ---------------- */

  const emberTint = 0xe08a4a;
  slime(14, 24, surface, emberTint);
  slime(42, 56, surface, emberTint);
  slime(57, 62, surface, emberTint);
  slime(68, 74, 15, emberTint, true); // elite holding the ledge before the bridge
  slime(78, 96, 15, emberTint); // patrolling the lava bridge
  slime(98, 104, 15, emberTint); // holding the far end of the bridge
  slime(130, 139, surface, emberTint);
  slime(186, 190, surface, emberTint);
  bat(26, 34, 72, surface, emberTint); // swooping over the first lava pit
  bat(70, 90, 76, 15, emberTint); // hunting above the lava lake
  bat(196, 204, 70, surface, emberTint); // circling the final approach

  /* ---------------- Pickups ---------------- */

  pickup('heart', 20);
  pickup('boots', 45);
  pickup('heart', 108);
  pickup('boots', 136);
  pickup('heart', 198);
  d.pickups.push({ type: 'shield', x: tx(165), y: ty(15) }); // on the stepping stone
  d.pickups.push({ type: 'shield', x: tx(86), y: ty(14) }); // on the lava bridge

  /* ---------------- Props ---------------- */

  [4, 12, 22, 30, 46, 54, 61, 113, 121, 131, 137, 174, 184, 199, 207, 211].forEach((c) => prop('stalagmite', c));
  [8, 26, 50, 58, 117, 127, 178, 196, 210].forEach((c) => prop('crystal_cluster', c));
  [16, 44, 112, 126, 170, 188, 203].forEach((c) => prop('rock', c));
  prop('sign', 7, 7);

  return finishDraft(d, {
    tileKey: 'tiles_cavern',
    crystal: { id: 'ec_crystal_1', x: tx(154), y: ty(9) },
    checkpoints: [
      { id: 'ec_cp_1', index: 1, x: tx(120), y: surface * TILE - 16 },
      { id: 'ec_cp_2', index: 2, x: tx(176), y: surface * TILE - 16 },
    ],
    exit: { x: 206 * TILE, y: surface * TILE - 32 },
    playerStart: { x: tx(4), y: surface * TILE - 12 },
  });
}

/* ================================================================== */
/* World 3 — Frostfall Peaks                                           */
/* ================================================================== */

export function buildFrostfallPeaks(): LevelLayout {
  const cols = 226;
  const rows = LEVEL_ROWS;
  const surface = 18;
  const d = makeDraft(cols, rows, surface);
  const { fill, ground, coin, coinArc, prop, slime, bat, pickup } = draftTools(d);

  /* ---------------- Terrain ---------------- */

  ground(0, 26);
  fill(29, 16, 29, 16); // ice block over the first drift (27-31)
  ground(32, 52);

  // Switchback up onto the high ridge.
  fill(53, 17, 55, rows - 1);
  fill(56, 16, 58, rows - 1);
  fill(59, 14, 61, rows - 1);
  fill(62, 13, 74, 13); // windward ridge
  fill(77, 12, 77, 12); // stepping ice above the crevasse (75-79)
  fill(80, 13, 90, 13); // leeward ridge
  fill(91, 14, 93, rows - 1);
  fill(94, 16, 96, rows - 1);
  ground(97, 128);

  // Pillar gauntlet over the frozen chasm (129-154).
  fill(131, 15, 133, rows - 1);
  fill(136, 12, 138, rows - 1);
  fill(141, 9, 144, rows - 1); // summit — crystal
  fill(147, 12, 149, rows - 1);
  fill(152, 15, 154, rows - 1);
  ground(155, 186);

  ground(192, 210); // snow drift gap 187-191
  fill(215, 16, 217, rows - 1); // final ice shelf (gap 211-214)
  ground(218, cols - 1);

  dressTerrain(d.grid, 0, 1, [2, 3]);

  /* ---------------- Coins ---------------- */

  coin(6, 16);
  coin(9, 16);
  coin(12, 16);
  coin(15, 16);
  coinArc([27, 28, 30, 31], [14, 13, 13, 14]);
  coin(36, 16);
  coin(39, 16);
  coin(42, 16);
  coin(45, 16);
  coin(48, 16);
  coin(60, 13);
  coin(64, 12);
  coin(68, 12);
  coin(72, 12);
  coin(77, 11);
  coin(82, 12);
  coin(86, 12);
  coin(90, 12);
  coin(100, 16);
  coin(104, 16);
  coin(108, 16);
  coin(112, 16);
  coin(116, 16);
  coin(120, 16);
  coin(124, 16);
  coin(132, 14);
  coin(137, 11);
  coin(142, 8);
  coin(143, 8);
  coin(148, 11);
  coin(153, 14);
  coin(160, 16);
  coin(164, 16);
  coin(168, 16);
  coin(172, 16);
  coin(176, 16);
  coin(180, 16);
  coin(184, 16);
  coinArc([187, 188, 189, 190, 191], [14, 13, 12, 13, 14]);
  coin(196, 16);
  coin(200, 16);
  coin(204, 16);
  coin(208, 16);
  coinArc([211, 212, 213, 214], [14, 13, 13, 14]);
  coin(220, 16);
  coin(223, 16);

  /* ---------------- Enemies ---------------- */

  const frostTint = 0x9fd6e8;
  slime(15, 24, surface, frostTint);
  slime(36, 50, surface, frostTint);
  slime(63, 70, 13, frostTint, true); // elite pacing the windward ridge
  slime(83, 88, 13, frostTint); // guarding the leeward ridge
  slime(116, 126, surface, frostTint);
  slime(118, 127, surface, frostTint, true); // elite before the chasm
  slime(155, 160, surface, frostTint);
  slime(196, 208, surface, frostTint);
  bat(74, 82, 60, 13, frostTint); // hunting above the crevasse
  bat(187, 196, 74, surface, frostTint); // circling the snow drift

  /* ---------------- Pickups ---------------- */

  pickup('heart', 14);
  pickup('boots', 40);
  d.pickups.push({ type: 'heart', x: tx(97), y: ty(13) }); // floating before the ridge
  pickup('boots', 124);
  pickup('shield', 160);
  pickup('heart', 200);
  pickup('boots', 224);
  d.pickups.push({ type: 'shield', x: tx(65), y: ty(12) }); // on the windward ridge

  /* ---------------- Props ---------------- */

  [5, 14, 24, 38, 47, 100, 110, 120, 158, 168, 178, 196, 204, 220].forEach((c) => prop('pine_snow', c, 2));
  [8, 20, 42, 50, 106, 116, 126, 164, 174, 200, 214, 222].forEach((c) => prop('ice_spike', c));
  [11, 34, 45, 112, 124, 170, 190, 207].forEach((c) => prop('rock', c));
  prop('sign', 7, 7);

  return finishDraft(d, {
    tileKey: 'tiles_peaks',
    thinIce: [
      // The first drift is only ice — keep moving or you go through.
      { c0: 27, c1: 31, row: 18 },
      // A thin patch on the windward ridge (a fall here drops into the void).
      { c0: 68, c1: 72, row: 13 },
      // Snow-drift crossing near the second checkpoint.
      { c0: 187, c1: 191, row: 18 },
      // The final approach before the ice shelf.
      { c0: 211, c1: 214, row: 18 },
    ],
    crystal: { id: 'ff_crystal_1', x: tx(142), y: ty(8) },
    checkpoints: [
      { id: 'ff_cp_1', index: 1, x: tx(106), y: surface * TILE - 16 },
      { id: 'ff_cp_2', index: 2, x: tx(170), y: surface * TILE - 16 },
    ],
    exit: { x: 220 * TILE, y: surface * TILE - 32 },
    playerStart: { x: tx(4), y: surface * TILE - 12 },
  });
}

/* ================================================================== */
/* World 4 — The Forgotten Kingdom                                     */
/* ================================================================== */

export function buildForgottenKingdom(): LevelLayout {
  const cols = 232;
  const rows = LEVEL_ROWS;
  const surface = 18;
  const d = makeDraft(cols, rows, surface);
  const { fill, ground, coin, coinArc, prop, slime, bat, pickup } = draftTools(d);

  /* ---------------- Terrain ---------------- */

  ground(0, 30);
  fill(33, 16, 33, 16); // broken pillars spanning the moat (31-36)
  fill(35, 16, 35, 16);
  ground(37, 58);

  // Ruined staircase up to the battlement walkway.
  fill(59, 17, 61, rows - 1);
  fill(62, 15, 64, rows - 1);
  fill(65, 13, 67, rows - 1);
  fill(68, 13, 86, 13); // battlement walkway
  fill(78, 10, 84, 10); // high ledge holding the crystal
  fill(88, 12, 89, 12); // fallen block bridging the collapse (87-90)
  fill(91, 13, 96, 13);
  fill(97, 14, 99, rows - 1);
  fill(100, 16, 102, rows - 1);
  ground(103, 140);

  // Sunken hall dropping onto the long causeway over the abyss.
  fill(141, 17, 144, rows - 1);
  fill(145, 16, 170, 16); // causeway
  fill(171, 17, 173, rows - 1);
  ground(174, 200);

  ground(206, cols - 1); // moat 201-205 with a stepping stone at 203
  fill(203, 16, 203, 16);

  dressTerrain(d.grid, 0, 1, [2, 3]);

  /* ---------------- Coins ---------------- */

  coin(6, 16);
  coin(9, 16);
  coin(12, 16);
  coin(15, 16);
  coin(18, 16);
  coinArc([31, 32, 34, 36], [14, 13, 13, 14]);
  coin(42, 16);
  coin(45, 16);
  coin(48, 16);
  coin(51, 16);
  coin(54, 16);
  coin(63, 14);
  coin(66, 12);
  coin(70, 12);
  coin(74, 12);
  coin(79, 9);
  coin(81, 9);
  coin(83, 9);
  coin(88, 11);
  coin(93, 12);
  coin(98, 13);
  coin(101, 15);
  coin(106, 16);
  coin(110, 16);
  coin(114, 16);
  coin(118, 16);
  coin(122, 16);
  coin(126, 16);
  coin(130, 16);
  coin(134, 16);
  coin(138, 16);
  coin(146, 15);
  coin(150, 15);
  coin(155, 15);
  coin(160, 15);
  coin(165, 15);
  coin(169, 15);
  coin(178, 16);
  coin(182, 16);
  coin(186, 16);
  coin(190, 16);
  coin(194, 16);
  coin(198, 16);
  coinArc([201, 202, 204, 205], [14, 13, 13, 14]);
  coin(210, 16);
  coin(214, 16);
  coin(218, 16);
  coin(222, 16);
  coin(226, 16);

  /* ---------------- Enemies ---------------- */

  const ruinTint = 0xa8b08a;
  slime(16, 28, surface, ruinTint);
  slime(40, 54, surface, ruinTint);
  slime(70, 76, 13, ruinTint, true); // elite stalking the battlement
  slime(122, 139, surface, ruinTint);
  slime(124, 136, surface, ruinTint, true); // elite behind the first shrine
  slime(145, 149, 16, ruinTint); // holding the causeway entrance
  slime(150, 166, 16, ruinTint); // pacing along the causeway
  slime(196, 200, surface, ruinTint);
  slime(206, 214, surface, ruinTint);
  bat(15, 24, 68, surface, ruinTint); // wheeling over the broken gate
  bat(31, 37, 70, surface, ruinTint); // diving across the moat
  bat(88, 100, 84, surface, ruinTint); // circling the collapsed walkway
  bat(155, 168, 72, 16, ruinTint); // hunting above the causeway
  bat(214, 224, 74, surface, ruinTint); // guarding the last court

  /* ---------------- Pickups ---------------- */

  pickup('heart', 14);
  pickup('boots', 45);
  d.pickups.push({ type: 'heart', x: tx(101), y: ty(15) }); // on the stair landing
  pickup('boots', 134);
  pickup('heart', 176);
  pickup('boots', 210);
  d.pickups.push({ type: 'shield', x: tx(93), y: ty(12) }); // on the walkway
  d.pickups.push({ type: 'shield', x: tx(158), y: ty(15) }); // on the causeway

  /* ---------------- Props ---------------- */

  [6, 18, 27, 44, 53, 108, 124, 134, 178, 188, 196, 212, 224].forEach((c) => prop('ruin_pillar', c, 2));
  [10, 22, 48, 56, 112, 130, 184, 200, 218].forEach((c) => prop('rubble', c));
  [14, 40, 116, 128, 174, 192, 208].forEach((c) => prop('rock', c));
  prop('sign', 7, 7);

  return finishDraft(d, {
    tileKey: 'tiles_kingdom',
    crystal: { id: 'fk_crystal_1', x: tx(81), y: ty(9) },
    checkpoints: [
      { id: 'fk_cp_1', index: 1, x: tx(112), y: surface * TILE - 16 },
      { id: 'fk_cp_2', index: 2, x: tx(186), y: surface * TILE - 16 },
    ],
    exit: { x: 224 * TILE, y: surface * TILE - 32 },
    playerStart: { x: tx(4), y: surface * TILE - 12 },
  });
}
