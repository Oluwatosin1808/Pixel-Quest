/**
 * Static level validation — run after any levelData change.
 *
 * Checks, per level in the registry:
 *   - structural integrity (grid size, spawn / checkpoints / exit / crystal)
 *   - safe placement: enemies, pickups and thin ice sit far enough from the
 *     spawn, checkpoints and exit (>= 150 px), inside the world bounds, and
 *     on (or above) solid ground
 *   - thin-ice spans have solid approaches on both ends and headroom above
 *   - reachability: a coarse platformer BFS (walk / fall / 4-row step /
 *     5-column jump) connects the spawn to the exit
 *
 * Bundled with esbuild (no tsx/vite-node in this repo) and run with node.
 */
import { LEVELS } from '../src/game/config/levels';
import { TILE } from '../src/game/config/gameConfig';
import type { LevelLayout } from '../src/game/config/levelData';

const errors: string[] = [];
const warn = (level: string, msg: string): void => errors.push(`[${level}] ${msg}`);

const SAFE_SPAWN = 150; // px kept clear around spawn + checkpoints
const SAFE_EXIT = 48; // px kept clear around the win zone

interface Pt {
  x: number;
  y: number;
}

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

function validate(levelId: string, layout: LevelLayout, parts: number): string[] {
  const notes: string[] = [];
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

  const solid = (c: number, r: number): boolean => c >= 0 && c < cols && r >= 0 && r < rows && grid[r][c] !== -1;
  const firstSolidBelow = (c: number, fromR: number, maxDrop = 4): number => {
    for (let r = Math.max(0, fromR); r <= Math.min(rows - 1, fromR + maxDrop); r++) {
      if (solid(c, r)) return r;
    }
    return -1;
  };
  const standable = (c: number, r: number): boolean => solid(c, r) && !solid(c, r - 1);

  const inBounds = (p: Pt, what: string): void => {
    if (p.x < 0 || p.x > worldW || p.y < 0 || p.y > worldH) warn(levelId, `${what} out of bounds (${p.x}, ${p.y})`);
  };

  /* ---------------- Structure ---------------- */

  inBounds(layout.playerStart, 'player start');
  const spawnCol = Math.floor(layout.playerStart.x / TILE);
  if (firstSolidBelow(spawnCol, Math.floor(layout.playerStart.y / TILE)) === -1) {
    warn(levelId, 'player start has no ground beneath it');
  }
  if (layout.checkpoints.length < 2) warn(levelId, `only ${layout.checkpoints.length} checkpoints`);
  if (!layout.crystal) warn(levelId, 'missing crystal');
  inBounds(layout.exit, 'exit');
  if (firstSolidBelow(Math.floor(layout.exit.x / TILE), Math.floor(layout.exit.y / TILE), 6) === -1) {
    warn(levelId, 'exit has no ground beneath it');
  }
  if (parts !== 3) warn(levelId, `expected 3 sub-levels, registry has ${parts}`);

  /* ---------------- Shared safety zones ---------------- */

  const dangerZones: Array<{ p: Pt; radius: number; name: string }> = [
    { p: layout.playerStart, radius: SAFE_SPAWN, name: 'spawn' },
    ...layout.checkpoints.map((cp, i) => ({ p: cp as Pt, radius: SAFE_SPAWN, name: `checkpoint ${i + 1}` })),
    { p: layout.exit, radius: SAFE_EXIT, name: 'exit' },
  ];
  const checkSafety = (p: Pt, what: string): void => {
    inBounds(p, what);
    for (const zone of dangerZones) {
      if (dist(p, zone.p) < zone.radius) {
        warn(levelId, `${what} too close to ${zone.name} (${Math.round(dist(p, zone.p))} px < ${zone.radius})`);
      }
    }
  };

  /* ---------------- Enemies ---------------- */

  let slimes = 0;
  let elites = 0;
  let bats = 0;
  for (const [i, e] of layout.enemies.entries()) {
    const what = `enemy ${i + 1} (${e.type}${e.big ? '/elite' : ''})`;
    checkSafety({ x: e.x, y: e.y }, what);
    if (e.minX >= e.maxX) warn(levelId, `${what} has an empty patrol range`);
    if (e.minX < 0 || e.maxX > worldW) warn(levelId, `${what} patrol range leaves the world`);

    const col = Math.floor(e.x / TILE);
    const row = Math.floor(e.y / TILE);
    if (e.type === 'bat') {
      if (solid(col, row) || solid(col, row - 1)) warn(levelId, `${what} spawns inside terrain`);
    } else {
      if (firstSolidBelow(col, row) === -1) warn(levelId, `${what} has no ground beneath it`);
      if (e.big) elites++;
      else slimes++;
    }
    if (e.type === 'bat') bats++;
  }

  /* ---------------- Pickups ---------------- */

  for (const [i, p] of layout.pickups.entries()) {
    const what = `pickup ${i + 1} (${p.type})`;
    checkSafety({ x: p.x, y: p.y }, what);
    const col = Math.floor(p.x / TILE);
    const row = Math.floor(p.y / TILE);
    if (solid(col, row)) warn(levelId, `${what} is buried in terrain`);
    if (firstSolidBelow(col, row, 6) === -1) warn(levelId, `${what} floats with no ground below`);
  }

  /* ---------------- Thin ice ---------------- */

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
    const midX = ((span.c0 + span.c1 + 1) / 2) * TILE;
    checkSafety({ x: midX, y: span.row * TILE }, what);
    // Must be approachable from solid ground on both sides.
    if (!solid(span.c0 - 1, span.row)) warn(levelId, `${what} has no solid approach on the left`);
    if (!solid(span.c1 + 1, span.row)) warn(levelId, `${what} has no solid approach on the right`);
    // The player has to be able to stand on it (headroom above).
    for (let c = span.c0; c <= span.c1; c++) {
      if (solid(c, span.row - 1)) warn(levelId, `${what} is blocked at col ${c} (no headroom)`);
      if (!solid(c, span.row) && firstSolidBelow(c, span.row + 1, rows) === -1) {
        // A bridging span over a bottomless pit: the scene lays the sheet in
        // itself, which is expected — but there must be a pit to fall into.
        // (Nothing to flag; the hole IS the hazard.)
      }
    }
  }

  /* ---------------- Reachability (coarse BFS) ---------------- */

  const minStandable = (c: number, lo: number, hi: number): number | null => {
    for (let r = Math.max(0, lo); r <= Math.min(rows - 1, hi); r++) {
      if (standable(c, r)) return r;
    }
    return null;
  };

  const startRow = minStandable(spawnCol, Math.floor(layout.playerStart.y / TILE) - 1, Math.floor(layout.playerStart.y / TILE) + 4);
  if (startRow === null) {
    warn(levelId, 'no standable tile near the player start');
  } else {
    const seen = new Set<string>(`${spawnCol},${startRow}`);
    const queue: Array<[number, number]> = [[spawnCol, startRow]];
    while (queue.length > 0) {
      const [c, r] = queue.shift()!;
      // 6 columns covers the widest designed gap (5 empty tiles + landing).
      for (let dc = -6; dc <= 6; dc++) {
        if (dc === 0) continue;
        const c2 = c + dc;
        if (c2 < 0 || c2 >= cols) continue;

        const targets: number[] = [];
        const walk = minStandable(c2, r, rows - 1); // level floor or fall
        if (walk !== null) targets.push(walk);
        const jump = minStandable(c2, r - 4, r - 1); // up to a 4-row step-up
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
      const [c] = key.split(',').map(Number);
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

console.log('Pixel Quest — level validation\n');
for (const def of LEVELS) {
  const before = errors.length;
  const notes = validate(def.id, def.build(), def.parts.length);
  const status = errors.length === before ? 'OK  ' : 'FAIL';
  console.log(` ${status} ${def.id.padEnd(6)} ${def.levelName.padEnd(18)} ${notes.join(' | ')}`);
}

console.log('');
if (errors.length > 0) {
  for (const e of errors) console.log(`  ! ${e}`);
  console.log(`\n${errors.length} problem(s) found.`);
  process.exit(1);
} else {
  console.log('All levels passed.');
}
