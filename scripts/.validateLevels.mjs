// src/game/config/gameConfig.ts
var TILE = 16;

// src/game/config/levelData.ts
var LEVEL_COLS = 240;
var LEVEL_ROWS = 22;
var SURFACE_ROW = 18;
var tx = (col) => col * TILE + TILE / 2;
var ty = (row) => row * TILE + TILE / 2;
function buildWhisperingWoods() {
  const cols = LEVEL_COLS;
  const rows = LEVEL_ROWS;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const fill = (c0, r0, c1, r1, tile) => {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = tile;
      }
    }
  };
  const ground = (c0, c1, surfaceRow = SURFACE_ROW) => {
    fill(c0, surfaceRow, c1, rows - 1, 1);
  };
  ground(0, 39);
  ground(44, 57);
  fill(60, 15, 61, 15, 1);
  ground(63, 74);
  fill(75, 17, 75, rows - 1, 1);
  fill(76, 16, 77, rows - 1, 1);
  fill(78, 16, 101, 16, 2);
  fill(102, 16, 103, rows - 1, 1);
  fill(104, 17, 104, rows - 1, 1);
  ground(105, 175);
  fill(129, 15, 130, 15, 1);
  fill(132, 13, 134, 13, 1);
  fill(135, 12, 143, 12, 1);
  ground(180, 202);
  fill(186, 16, 193, rows - 1, 1);
  fill(203, 15, 210, rows - 1, 1);
  ground(211, 215);
  ground(220, 239);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === -1) continue;
      if (grid[r][c] === 2 || grid[r][c] === 3) continue;
      const above = r > 0 ? grid[r - 1][c] : -1;
      grid[r][c] = above === -1 ? 0 : 1;
    }
  }
  const surfaceY = (col) => {
    for (let r = 0; r < rows; r++) {
      if (grid[r][col] !== -1) return r * TILE;
    }
    return null;
  };
  const coins = [];
  const coin = (col, row) => {
    coins.push({ x: tx(col), y: ty(row) });
  };
  const coinArc = (cols_, rows_) => {
    cols_.forEach((c, i) => coin(c, rows_[i]));
  };
  coin(8, 16);
  coin(10, 16);
  coin(12, 16);
  coin(14, 16);
  coinArc([40, 41, 42, 43], [14, 13, 13, 14]);
  coin(47, 16);
  coin(49, 16);
  coin(51, 16);
  coinArc([58, 60, 61, 63], [14, 13, 13, 14]);
  coin(80, 15);
  coin(84, 15);
  coin(88, 15);
  coin(92, 15);
  coin(96, 15);
  coin(107, 16);
  coin(109, 16);
  coin(111, 16);
  coin(113, 16);
  coin(129, 14);
  coin(131, 12);
  coin(133, 12);
  coin(136, 11);
  coin(138, 11);
  coin(142, 11);
  coin(137, 16);
  coin(139, 16);
  coin(150, 16);
  coin(153, 16);
  coin(156, 16);
  coinArc([176, 177, 178, 179], [14, 13, 13, 14]);
  coin(187, 14);
  coin(189, 14);
  coin(191, 14);
  coin(204, 13);
  coin(206, 13);
  coin(208, 13);
  coinArc([216, 217, 218, 219], [14, 13, 13, 14]);
  coin(222, 16);
  coin(225, 16);
  coin(228, 16);
  coin(231, 16);
  const slime = (c0, c1, surfaceRow = SURFACE_ROW) => ({
    type: "slime",
    x: tx(Math.round((c0 + c1) / 2)),
    y: surfaceRow * TILE - 8,
    minX: c0 * TILE + 6,
    maxX: (c1 + 1) * TILE - 6
  });
  const enemies = [
    slime(18, 30),
    // patrolling the start meadow
    slime(46, 56),
    // right after gap A
    slime(66, 74),
    // holding the ground before the bridge
    slime(82, 97, 16),
    // on the wooden bridge
    slime(118, 128),
    // stalking the meadow before the crystal ledge
    slime(147, 157),
    // guarding the stretch after the crystal
    { type: "slime", big: true, x: tx(165), y: SURFACE_ROW * TILE - 8, minX: 160 * TILE + 6, maxX: 171 * TILE - 6 },
    slime(194, 202),
    // between hill and plateau
    slime(224, 232),
    // guarding the exit
    { type: "bat", x: tx(90), y: SURFACE_ROW * TILE - 74, minX: 84 * TILE, maxX: 97 * TILE },
    { type: "bat", x: tx(224), y: SURFACE_ROW * TILE - 82, minX: 217 * TILE, maxX: 231 * TILE }
  ];
  const pickups = [
    { type: "heart", x: tx(47), y: ty(16) },
    { type: "boots", x: tx(68), y: ty(16) },
    { type: "shield", x: tx(100), y: ty(15) },
    { type: "boots", x: tx(150), y: ty(16) },
    { type: "heart", x: tx(194), y: ty(14) },
    { type: "shield", x: tx(207), y: ty(13) },
    { type: "heart", x: tx(226), y: ty(16) }
  ];
  const crystal = { id: "ww_crystal_1", x: tx(140), y: ty(11) };
  const checkpoints = [
    { id: "ww_cp_1", index: 1, x: tx(110), y: SURFACE_ROW * TILE - 16 },
    { id: "ww_cp_2", index: 2, x: tx(182), y: SURFACE_ROW * TILE - 16 }
  ];
  const exit = { x: 234 * TILE, y: SURFACE_ROW * TILE - 32 };
  const decorations = [];
  const treeTypes = ["tree_a", "tree_b", "tree_c"];
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
    decorations.push({ key: "bush", x: tx(col), y: y + 5 });
  }
  const tuftCols = [5, 7, 11, 19, 22, 31, 36, 45, 50, 65, 68, 74, 93, 101, 106, 114, 118, 127, 141, 149, 154, 163, 171, 181, 188, 195, 205, 212, 223, 230, 237];
  for (const col of tuftCols) {
    const y = surfaceY(col);
    if (y === null) continue;
    decorations.push({ key: "tuft", x: tx(col), y: y + 4 });
  }
  const flowerCols = [
    [12, "flower_a"],
    [21, "flower_b"],
    [33, "flower_a"],
    [48, "flower_b"],
    [67, "flower_a"],
    [110, "flower_a"],
    [117, "flower_b"],
    [146, "flower_a"],
    [160, "flower_b"],
    [183, "flower_a"],
    [198, "flower_b"],
    [224, "flower_a"],
    [233, "flower_a"]
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
    decorations.push({ key: "mushroom", x: tx(col), y: y + 4 });
  }
  const rockCols = [26, 56, 126, 175, 200, 229];
  for (const col of rockCols) {
    const y = surfaceY(col);
    if (y === null) continue;
    decorations.push({ key: "rock", x: tx(col), y: y + 3 });
  }
  const signY = surfaceY(7);
  if (signY !== null) decorations.push({ key: "sign", x: tx(7), y: signY + 7 });
  return {
    grid,
    cols,
    rows,
    tileKey: "tiles",
    playerStart: { x: tx(4), y: SURFACE_ROW * TILE - 12 },
    coins,
    enemies,
    pickups,
    thinIce: [],
    crystal,
    checkpoints,
    exit,
    decorations,
    pitY: rows * TILE - 8
  };
}
function newGrid(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(-1));
}
function fillRect(grid, c0, r0, c1, r1, tile) {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = tile;
    }
  }
}
function groundRect(grid, c0, c1, surfaceRow, fillTile) {
  fillRect(grid, c0, surfaceRow, c1, grid.length - 1, fillTile);
}
function dressTerrain(grid, surfaceTile, fillTile, keep) {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === -1 || keep.includes(grid[r][c])) continue;
      grid[r][c] = r > 0 && grid[r - 1][c] === -1 ? surfaceTile : fillTile;
    }
  }
}
function topRowOf(grid, col) {
  for (let r = 0; r < grid.length; r++) if (grid[r][col] !== -1) return r;
  return null;
}
function draftTools(d) {
  const fill = (c0, r0, c1, r1, tile = 3) => fillRect(d.grid, c0, r0, c1, r1, tile);
  const ground = (c0, c1, surface = d.surface) => groundRect(d.grid, c0, c1, surface, 1);
  const coin = (col, row) => {
    d.coins.push({ x: tx(col), y: ty(row) });
  };
  const coinArc = (cols_, rows_) => cols_.forEach((c, i) => coin(c, rows_[i]));
  const surfaceY = (col) => {
    const r = topRowOf(d.grid, col);
    return r === null ? null : r * TILE;
  };
  const prop = (key, col, dy = 3) => {
    const y = surfaceY(col);
    if (y === null) return;
    d.decorations.push({ key, x: tx(col), y: y + dy });
  };
  const slime = (c0, c1, surface = d.surface, tint, big = false) => {
    d.enemies.push({
      type: "slime",
      x: tx(Math.round((c0 + c1) / 2)),
      y: surface * TILE - 8,
      minX: c0 * TILE + 6,
      maxX: (c1 + 1) * TILE - 6,
      ...tint === void 0 ? {} : { tint },
      ...big ? { big: true } : {}
    });
  };
  const bat = (c0, c1, height = 76, surface = d.surface, tint) => {
    d.enemies.push({
      type: "bat",
      x: tx(Math.round((c0 + c1) / 2)),
      y: surface * TILE - height,
      minX: c0 * TILE,
      maxX: (c1 + 1) * TILE,
      ...tint === void 0 ? {} : { tint }
    });
  };
  const pickup = (type, col, dy = 24) => {
    d.pickups.push({ type, x: tx(col), y: d.surface * TILE - dy });
  };
  return { fill, ground, coin, coinArc, surfaceY, prop, slime, bat, pickup };
}
function finishDraft(d, extra) {
  return {
    grid: d.grid,
    cols: d.cols,
    rows: d.rows,
    tileKey: "tiles",
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
    ...extra
  };
}
function makeDraft(cols, rows, surface) {
  return { grid: newGrid(cols, rows), cols, rows, surface, coins: [], enemies: [], pickups: [], decorations: [] };
}
function buildEmberCaverns() {
  const cols = 214;
  const rows = LEVEL_ROWS;
  const surface = 18;
  const d = makeDraft(cols, rows, surface);
  const t = draftTools(d);
  const { fill, ground, coin, coinArc, prop, slime, bat, pickup } = t;
  ground(0, 32);
  fill(35, 16, 36, 16);
  ground(39, 62);
  fill(63, 17, 63, rows - 1);
  fill(64, 16, 65, rows - 1);
  fill(66, 15, 67, rows - 1);
  fill(68, 15, 74, 15);
  fill(75, 15, 104, 15);
  fill(105, 16, 107, rows - 1);
  fill(108, 17, 110, rows - 1);
  ground(111, 140);
  fill(143, 16, 145, 16);
  fill(148, 13, 150, 13);
  fill(153, 10, 156, 10);
  fill(159, 13, 162, 13);
  fill(164, 16, 167, 16);
  ground(168, 190);
  ground(195, cols - 1);
  dressTerrain(d.grid, 0, 1, [2, 3]);
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
  const emberTint = 14715466;
  slime(14, 24, surface, emberTint);
  slime(42, 56, surface, emberTint);
  slime(57, 62, surface, emberTint);
  slime(68, 74, 15, emberTint, true);
  slime(78, 96, 15, emberTint);
  slime(98, 104, 15, emberTint);
  slime(130, 139, surface, emberTint);
  slime(186, 190, surface, emberTint);
  bat(26, 34, 72, surface, emberTint);
  bat(70, 90, 76, 15, emberTint);
  bat(196, 204, 70, surface, emberTint);
  pickup("heart", 20);
  pickup("boots", 45);
  pickup("heart", 108);
  pickup("boots", 136);
  pickup("heart", 198);
  d.pickups.push({ type: "shield", x: tx(165), y: ty(15) });
  d.pickups.push({ type: "shield", x: tx(86), y: ty(14) });
  [4, 12, 22, 30, 46, 54, 61, 113, 121, 131, 137, 174, 184, 199, 207, 211].forEach((c) => prop("stalagmite", c));
  [8, 26, 50, 58, 117, 127, 178, 196, 210].forEach((c) => prop("crystal_cluster", c));
  [16, 44, 112, 126, 170, 188, 203].forEach((c) => prop("rock", c));
  prop("sign", 7, 7);
  return finishDraft(d, {
    tileKey: "tiles_cavern",
    crystal: { id: "ec_crystal_1", x: tx(154), y: ty(9) },
    checkpoints: [
      { id: "ec_cp_1", index: 1, x: tx(120), y: surface * TILE - 16 },
      { id: "ec_cp_2", index: 2, x: tx(176), y: surface * TILE - 16 }
    ],
    exit: { x: 206 * TILE, y: surface * TILE - 32 },
    playerStart: { x: tx(4), y: surface * TILE - 12 }
  });
}
function buildFrostfallPeaks() {
  const cols = 226;
  const rows = LEVEL_ROWS;
  const surface = 18;
  const d = makeDraft(cols, rows, surface);
  const { fill, ground, coin, coinArc, prop, slime, bat, pickup } = draftTools(d);
  ground(0, 26);
  fill(29, 16, 29, 16);
  ground(32, 52);
  fill(53, 17, 55, rows - 1);
  fill(56, 16, 58, rows - 1);
  fill(59, 14, 61, rows - 1);
  fill(62, 13, 74, 13);
  fill(77, 12, 77, 12);
  fill(80, 13, 90, 13);
  fill(91, 14, 93, rows - 1);
  fill(94, 16, 96, rows - 1);
  ground(97, 128);
  fill(131, 15, 133, rows - 1);
  fill(136, 12, 138, rows - 1);
  fill(141, 9, 144, rows - 1);
  fill(147, 12, 149, rows - 1);
  fill(152, 15, 154, rows - 1);
  ground(155, 186);
  ground(192, 210);
  fill(215, 16, 217, rows - 1);
  ground(218, cols - 1);
  dressTerrain(d.grid, 0, 1, [2, 3]);
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
  const frostTint = 10475240;
  slime(15, 24, surface, frostTint);
  slime(36, 50, surface, frostTint);
  slime(63, 70, 13, frostTint, true);
  slime(83, 88, 13, frostTint);
  slime(116, 126, surface, frostTint);
  slime(118, 127, surface, frostTint, true);
  slime(155, 160, surface, frostTint);
  slime(196, 208, surface, frostTint);
  bat(74, 82, 60, 13, frostTint);
  bat(187, 196, 74, surface, frostTint);
  pickup("heart", 14);
  pickup("boots", 40);
  d.pickups.push({ type: "heart", x: tx(97), y: ty(13) });
  pickup("boots", 124);
  pickup("shield", 160);
  pickup("heart", 200);
  pickup("boots", 224);
  d.pickups.push({ type: "shield", x: tx(65), y: ty(12) });
  [5, 14, 24, 38, 47, 100, 110, 120, 158, 168, 178, 196, 204, 220].forEach((c) => prop("pine_snow", c, 2));
  [8, 20, 42, 50, 106, 116, 126, 164, 174, 200, 214, 222].forEach((c) => prop("ice_spike", c));
  [11, 34, 45, 112, 124, 170, 190, 207].forEach((c) => prop("rock", c));
  prop("sign", 7, 7);
  return finishDraft(d, {
    tileKey: "tiles_peaks",
    thinIce: [
      // The first drift is only ice — keep moving or you go through.
      { c0: 27, c1: 31, row: 18 },
      // A thin patch on the windward ridge (a fall here drops into the void).
      { c0: 68, c1: 72, row: 13 },
      // Snow-drift crossing near the second checkpoint.
      { c0: 187, c1: 191, row: 18 },
      // The final approach before the ice shelf.
      { c0: 211, c1: 214, row: 18 }
    ],
    crystal: { id: "ff_crystal_1", x: tx(142), y: ty(8) },
    checkpoints: [
      { id: "ff_cp_1", index: 1, x: tx(106), y: surface * TILE - 16 },
      { id: "ff_cp_2", index: 2, x: tx(170), y: surface * TILE - 16 }
    ],
    exit: { x: 220 * TILE, y: surface * TILE - 32 },
    playerStart: { x: tx(4), y: surface * TILE - 12 }
  });
}
function buildForgottenKingdom() {
  const cols = 232;
  const rows = LEVEL_ROWS;
  const surface = 18;
  const d = makeDraft(cols, rows, surface);
  const { fill, ground, coin, coinArc, prop, slime, bat, pickup } = draftTools(d);
  ground(0, 30);
  fill(33, 16, 33, 16);
  fill(35, 16, 35, 16);
  ground(37, 58);
  fill(59, 17, 61, rows - 1);
  fill(62, 15, 64, rows - 1);
  fill(65, 13, 67, rows - 1);
  fill(68, 13, 86, 13);
  fill(78, 10, 84, 10);
  fill(88, 12, 89, 12);
  fill(91, 13, 96, 13);
  fill(97, 14, 99, rows - 1);
  fill(100, 16, 102, rows - 1);
  ground(103, 140);
  fill(141, 17, 144, rows - 1);
  fill(145, 16, 170, 16);
  fill(171, 17, 173, rows - 1);
  ground(174, 200);
  ground(206, cols - 1);
  fill(203, 16, 203, 16);
  dressTerrain(d.grid, 0, 1, [2, 3]);
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
  const ruinTint = 11055242;
  slime(16, 28, surface, ruinTint);
  slime(40, 54, surface, ruinTint);
  slime(70, 76, 13, ruinTint, true);
  slime(122, 139, surface, ruinTint);
  slime(124, 136, surface, ruinTint, true);
  slime(145, 149, 16, ruinTint);
  slime(150, 166, 16, ruinTint);
  slime(196, 200, surface, ruinTint);
  slime(206, 214, surface, ruinTint);
  bat(15, 24, 68, surface, ruinTint);
  bat(31, 37, 70, surface, ruinTint);
  bat(88, 100, 84, surface, ruinTint);
  bat(155, 168, 72, 16, ruinTint);
  bat(214, 224, 74, surface, ruinTint);
  pickup("heart", 14);
  pickup("boots", 45);
  d.pickups.push({ type: "heart", x: tx(101), y: ty(15) });
  pickup("boots", 134);
  pickup("heart", 176);
  pickup("boots", 210);
  d.pickups.push({ type: "shield", x: tx(93), y: ty(12) });
  d.pickups.push({ type: "shield", x: tx(158), y: ty(15) });
  [6, 18, 27, 44, 53, 108, 124, 134, 178, 188, 196, 212, 224].forEach((c) => prop("ruin_pillar", c, 2));
  [10, 22, 48, 56, 112, 130, 184, 200, 218].forEach((c) => prop("rubble", c));
  [14, 40, 116, 128, 174, 192, 208].forEach((c) => prop("rock", c));
  prop("sign", 7, 7);
  return finishDraft(d, {
    tileKey: "tiles_kingdom",
    crystal: { id: "fk_crystal_1", x: tx(81), y: ty(9) },
    checkpoints: [
      { id: "fk_cp_1", index: 1, x: tx(112), y: surface * TILE - 16 },
      { id: "fk_cp_2", index: 2, x: tx(186), y: surface * TILE - 16 }
    ],
    exit: { x: 224 * TILE, y: surface * TILE - 32 },
    playerStart: { x: tx(4), y: surface * TILE - 12 }
  });
}

// src/game/config/levels.ts
var LEVELS = [
  {
    id: "ww_1",
    worldIndex: 1,
    worldName: "WORLD 1",
    levelName: "WHISPERING WOODS",
    subtitle: "Mist, moss and creeping slimes",
    theme: "forest",
    hint: "A/D MOVE\nSPACE JUMP\nJ SWORD",
    parts: ["MEADOW PATH", "THE OLD BRIDGE", "DEEPWOOD SHADE"],
    build: buildWhisperingWoods
  },
  {
    id: "ec_1",
    worldIndex: 2,
    worldName: "WORLD 2",
    levelName: "EMBER CAVERNS",
    subtitle: "Molten rock and sleeping stone",
    theme: "cavern",
    hint: "MIND THE\nGLOWING GAP",
    parts: ["EMBERS WAKE", "THE LAVA LAKE", "SUNKEN FORGE"],
    build: buildEmberCaverns
  },
  {
    id: "ff_1",
    worldIndex: 3,
    worldName: "WORLD 3",
    levelName: "FROSTFALL PEAKS",
    subtitle: "Thin air and sharper teeth",
    theme: "peaks",
    hint: "ICE HOLDS\nMOSTLY",
    parts: ["FIRST LIGHT", "WINDWARD RIDGE", "SUMMIT STORM"],
    build: buildFrostfallPeaks
  },
  {
    id: "fk_1",
    worldIndex: 4,
    worldName: "WORLD 4",
    levelName: "THE FORGOTTEN KINGDOM",
    subtitle: "Ruins that remember your name",
    theme: "kingdom",
    hint: "THE RUINS\nREMEMBER",
    parts: ["BROKEN GATE", "HALL OF KINGS", "THE LAST COURT"],
    build: buildForgottenKingdom
  }
];
var LEVEL_IDS = new Set(LEVELS.map((l) => l.id));
var CRYSTAL_IDS = new Set(LEVELS.map((l) => `${l.id.slice(0, 2)}_crystal_1`));

// scripts/validateLevels.ts
var errors = [];
var warn = (level, msg) => errors.push(`[${level}] ${msg}`);
var SAFE_SPAWN = 150;
var SAFE_EXIT = 48;
var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function validate(levelId, layout, parts) {
  const notes = [];
  const { grid, cols, rows } = layout;
  const worldW = cols * TILE;
  const worldH = rows * TILE;
  if (grid.length !== rows) warn(levelId, `grid rows ${grid.length} != ${rows}`);
  for (const row of grid) {
    if (row.length !== cols) {
      warn(levelId, `grid column count ${row.length} != ${cols}`);
      break;
    }
  }
  const solid = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows && grid[r][c] !== -1;
  const firstSolidBelow = (c, fromR, maxDrop = 4) => {
    for (let r = Math.max(0, fromR); r <= Math.min(rows - 1, fromR + maxDrop); r++) {
      if (solid(c, r)) return r;
    }
    return -1;
  };
  const standable = (c, r) => solid(c, r) && !solid(c, r - 1);
  const inBounds = (p, what) => {
    if (p.x < 0 || p.x > worldW || p.y < 0 || p.y > worldH) warn(levelId, `${what} out of bounds (${p.x}, ${p.y})`);
  };
  inBounds(layout.playerStart, "player start");
  const spawnCol = Math.floor(layout.playerStart.x / TILE);
  if (firstSolidBelow(spawnCol, Math.floor(layout.playerStart.y / TILE)) === -1) {
    warn(levelId, "player start has no ground beneath it");
  }
  if (layout.checkpoints.length < 2) warn(levelId, `only ${layout.checkpoints.length} checkpoints`);
  if (!layout.crystal) warn(levelId, "missing crystal");
  inBounds(layout.exit, "exit");
  if (firstSolidBelow(Math.floor(layout.exit.x / TILE), Math.floor(layout.exit.y / TILE), 6) === -1) {
    warn(levelId, "exit has no ground beneath it");
  }
  if (parts !== 3) warn(levelId, `expected 3 sub-levels, registry has ${parts}`);
  const dangerZones = [
    { p: layout.playerStart, radius: SAFE_SPAWN, name: "spawn" },
    ...layout.checkpoints.map((cp, i) => ({ p: cp, radius: SAFE_SPAWN, name: `checkpoint ${i + 1}` })),
    { p: layout.exit, radius: SAFE_EXIT, name: "exit" }
  ];
  const checkSafety = (p, what) => {
    inBounds(p, what);
    for (const zone of dangerZones) {
      if (dist(p, zone.p) < zone.radius) {
        warn(levelId, `${what} too close to ${zone.name} (${Math.round(dist(p, zone.p))} px < ${zone.radius})`);
      }
    }
  };
  let slimes = 0;
  let elites = 0;
  let bats = 0;
  for (const [i, e] of layout.enemies.entries()) {
    const what = `enemy ${i + 1} (${e.type}${e.big ? "/elite" : ""})`;
    checkSafety({ x: e.x, y: e.y }, what);
    if (e.minX >= e.maxX) warn(levelId, `${what} has an empty patrol range`);
    if (e.minX < 0 || e.maxX > worldW) warn(levelId, `${what} patrol range leaves the world`);
    const col = Math.floor(e.x / TILE);
    const row = Math.floor(e.y / TILE);
    if (e.type === "bat") {
      if (solid(col, row) || solid(col, row - 1)) warn(levelId, `${what} spawns inside terrain`);
    } else {
      if (firstSolidBelow(col, row) === -1) warn(levelId, `${what} has no ground beneath it`);
      if (e.big) elites++;
      else slimes++;
    }
    if (e.type === "bat") bats++;
  }
  for (const [i, p] of layout.pickups.entries()) {
    const what = `pickup ${i + 1} (${p.type})`;
    checkSafety({ x: p.x, y: p.y }, what);
    const col = Math.floor(p.x / TILE);
    const row = Math.floor(p.y / TILE);
    if (solid(col, row)) warn(levelId, `${what} is buried in terrain`);
    if (firstSolidBelow(col, row, 6) === -1) warn(levelId, `${what} floats with no ground below`);
  }
  for (const [i, span] of layout.thinIce.entries()) {
    const what = `thin ice ${i + 1} (cols ${span.c0}-${span.c1}, row ${span.row})`;
    if (span.c0 < 0 || span.c1 >= cols || span.c0 > span.c1) {
      warn(levelId, `${what} is out of bounds`);
      continue;
    }
    if (span.row <= 0 || span.row >= rows) {
      warn(levelId, `${what} has an invalid row`);
      continue;
    }
    const midX = (span.c0 + span.c1 + 1) / 2 * TILE;
    checkSafety({ x: midX, y: span.row * TILE }, what);
    if (!solid(span.c0 - 1, span.row)) warn(levelId, `${what} has no solid approach on the left`);
    if (!solid(span.c1 + 1, span.row)) warn(levelId, `${what} has no solid approach on the right`);
    for (let c = span.c0; c <= span.c1; c++) {
      if (solid(c, span.row - 1)) warn(levelId, `${what} is blocked at col ${c} (no headroom)`);
      if (!solid(c, span.row) && firstSolidBelow(c, span.row + 1, rows) === -1) {
      }
    }
  }
  const minStandable = (c, lo, hi) => {
    for (let r = Math.max(0, lo); r <= Math.min(rows - 1, hi); r++) {
      if (standable(c, r)) return r;
    }
    return null;
  };
  const startRow = minStandable(spawnCol, Math.floor(layout.playerStart.y / TILE) - 1, Math.floor(layout.playerStart.y / TILE) + 4);
  if (startRow === null) {
    warn(levelId, "no standable tile near the player start");
  } else {
    const seen = new Set(`${spawnCol},${startRow}`);
    const queue = [[spawnCol, startRow]];
    while (queue.length > 0) {
      const [c, r] = queue.shift();
      for (let dc = -6; dc <= 6; dc++) {
        if (dc === 0) continue;
        const c2 = c + dc;
        if (c2 < 0 || c2 >= cols) continue;
        const targets = [];
        const walk = minStandable(c2, r, rows - 1);
        if (walk !== null) targets.push(walk);
        const jump = minStandable(c2, r - 4, r - 1);
        if (jump !== null) {
          let clear = true;
          for (let k = jump; k <= r - 1; k++) {
            if (grid[k][c] !== -1) clear = false;
          }
          if (clear) targets.push(jump);
        }
        for (const t of targets) {
          const key = `${c2},${t}`;
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push([c2, t]);
        }
      }
    }
    const exitCol = Math.floor(layout.exit.x / TILE);
    let reached = false;
    for (const key of seen) {
      const [c] = key.split(",").map(Number);
      if (Math.abs(c - exitCol) <= 2) {
        reached = true;
        break;
      }
    }
    if (!reached) warn(levelId, `exit is NOT reachable from the spawn (visited ${seen.size} tiles)`);
    else notes.push(`reachability ok (${seen.size} tiles)`);
  }
  notes.push(`${slimes} slimes, ${elites} elite, ${bats} bats, ${layout.pickups.length} pickups, ${layout.coins.length} coins`);
  if (layout.thinIce.length > 0) notes.push(`${layout.thinIce.length} thin-ice spans`);
  return notes;
}
console.log("Pixel Quest \u2014 level validation\n");
for (const def of LEVELS) {
  const before = errors.length;
  const notes = validate(def.id, def.build(), def.parts.length);
  const status = errors.length === before ? "OK  " : "FAIL";
  console.log(` ${status} ${def.id.padEnd(6)} ${def.levelName.padEnd(18)} ${notes.join(" | ")}`);
}
console.log("");
if (errors.length > 0) {
  for (const e of errors) console.log(`  ! ${e}`);
  console.log(`
${errors.length} problem(s) found.`);
  process.exit(1);
} else {
  console.log("All levels passed.");
}
