import Phaser from 'phaser';
import { PAL } from './palette';

/**
 * Procedural pixel-art texture generation.
 *
 * Pixel Quest ships with no binary art assets: every sprite, tile and
 * background is drawn here at runtime onto canvases, guaranteeing crisp
 * 16-bit styling with no missing asset paths. All builders are idempotent so
 * scene restarts never duplicate textures.
 */

type Ctx = CanvasRenderingContext2D;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function pixel(ctx: Ctx, x: number, y: number, color: string): void {
  rect(ctx, Math.round(x), Math.round(y), 1, 1, color);
}

/** Thick pixel line (Bresenham) used for sword blades etc. */
function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, thickness: number, color: string): void {
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const steps = Math.max(dx, dy);
  const half = Math.floor(thickness / 2);
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    ctx.fillRect(x - half, y - half, thickness, thickness);
  }
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, fill: string, outline?: string): void {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) pixel(ctx, x, y, fill);
      else if (outline && d <= r + 0.85) pixel(ctx, x, y, outline);
    }
  }
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Horizontal sprite sheet: frames named f0..f(count-1). */
function makeSheet(
  scene: Phaser.Scene,
  key: string,
  frameWidth: number,
  frameHeight: number,
  count: number,
  draw: (ctx: Ctx, index: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = createCanvas(frameWidth * count, frameHeight);
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(i * frameWidth, 0);
    draw(ctx, i);
    ctx.restore();
  }
  const texture = scene.textures.addCanvas(key, canvas);
  if (!texture) return;
  for (let i = 0; i < count; i++) {
    texture.add(`f${i}`, 0, i * frameWidth, 0, frameWidth, frameHeight);
  }
}

/** Single static texture. */
function makeImage(scene: Phaser.Scene, key: string, width: number, height: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = createCanvas(width, height);
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

/* ------------------------------------------------------------------ */
/* Adventurer                                                          */
/* ------------------------------------------------------------------ */

/**
 * Character pose. The adventurer is drawn on a 32x24 frame with the body
 * centred on x=16 so horizontal flipping never shifts the sprite.
 */
interface Pose {
  bodyX?: number;
  bodyY?: number;
  eye?: 'open' | 'blink' | 'hurt';
  mouth?: 'none' | 'open';
  frontLeg?: { dx: number; lift: number };
  backLeg?: { dx: number; lift: number };
  frontArm?: { dx: number; dy: number };
  backArm?: { dx: number; dy: number };
  sword?: 'windup' | 'up' | 'swing' | 'down' | null;
  lying?: boolean;
}

const C = {
  hair: PAL.hair,
  skin: PAL.skin,
  skinShade: PAL.skinShade,
  tunic: PAL.teal,
  tunicDark: '#2f625c',
  scarf: PAL.scarf,
  belt: PAL.goldDark,
  pants: PAL.bark,
  boot: PAL.brown,
  bootDark: PAL.barkDark,
  blade: PAL.steel,
  bladeHi: PAL.white,
  bladeEdge: PAL.steelDark,
  hilt: PAL.gold,
  grip: PAL.bark,
  outline: PAL.ink,
  blood: PAL.blood,
};

function drawLeg(ctx: Ctx, footX: number, lift: number, bodyX: number): void {
  const top = 18 + lift;
  const legHeight = 3 - (lift > 0 ? 1 : 0);
  const x = footX - 1 + bodyX;
  // pants
  rect(ctx, x, top, 3, legHeight, C.pants);
  // boot
  const bootY = top + legHeight;
  rect(ctx, x, bootY, 3, 3, C.boot);
  rect(ctx, x, bootY + 2, 3, 1, C.bootDark);
}

function drawArm(ctx: Ctx, x: number, y: number, color: string): void {
  rect(ctx, x, y, 2, 4, color);
  rect(ctx, x, y + 3, 2, 1, C.skin); // hand
}

function drawSword(ctx: Ctx, pose: Pose['sword'], bodyX: number): void {
  if (!pose) return;
  const bx = bodyX;
  // Hand / grip position per pose.
  const grips: Record<string, [number, number]> = {
    windup: [18 + bx, 11],
    up: [20 + bx, 11],
    swing: [21 + bx, 13],
    down: [21 + bx, 14],
  };
  const tips: Record<string, [number, number]> = {
    windup: [12 + bx, 4],
    up: [25 + bx, 2],
    swing: [31 + bx, 12],
    down: [28 + bx, 21],
  };
  const [gx, gy] = grips[pose];
  const [tx, ty] = tips[pose];
  // blade
  line(ctx, gx, gy, tx, ty, 2, C.blade);
  // highlight along the blade
  line(ctx, gx, gy - 1, tx, ty - 1, 1, C.bladeHi);
  // cross guard
  const guardAngle = Math.atan2(ty - gy, tx - gx);
  const px = Math.cos(guardAngle + Math.PI / 2);
  const py = Math.sin(guardAngle + Math.PI / 2);
  line(ctx, Math.round(gx - px * 2), Math.round(gy - py * 2), Math.round(gx + px * 2), Math.round(gy + py * 2), 1, C.hilt);
  // grip
  line(ctx, gx, gy, Math.round(gx - (tx - gx) * 0.18), Math.round(gy - (ty - gy) * 0.18), 2, C.grip);
}

function drawAdventurer(ctx: Ctx, pose: Pose): void {
  const bx = pose.bodyX ?? 0;
  const by = pose.bodyY ?? 0;
  const lying = pose.lying ?? false;

  if (lying) {
    // Lying on the ground, head to the left.
    rect(ctx, 5, 19, 9, 4, C.tunic); // torso
    rect(ctx, 5, 22, 9, 1, C.tunicDark);
    rect(ctx, 14, 20, 6, 3, C.pants); // legs
    rect(ctx, 19, 20, 3, 3, C.boot); // boots
    rect(ctx, 2, 17, 7, 5, C.skin); // head
    rect(ctx, 1, 16, 8, 3, C.hair); // hair
    pixel(ctx, 4, 20, C.outline); // closed eye
    pixel(ctx, 6, 20, C.outline);
    rect(ctx, 6, 22, 2, 1, C.skinShade); // mouth
    rect(ctx, 8, 18, 8, 2, C.scarf); // scarf trailing
    return;
  }

  // --- Back arm ---
  const backArm = pose.backArm ?? { dx: 0, dy: 0 };
  drawArm(ctx, 11 + bx + backArm.dx, 10 + by + backArm.dy, C.tunicDark);

  // --- Back leg ---
  const backLeg = pose.backLeg ?? { dx: -2, lift: 0 };
  drawLeg(ctx, 16 + backLeg.dx, backLeg.lift, bx);

  // --- Torso ---
  rect(ctx, 11 + bx, 9 + by, 10, 8, C.tunic);
  rect(ctx, 11 + bx, 15 + by, 10, 1, C.tunicDark);
  rect(ctx, 11 + bx, 14 + by, 10, 1, C.belt); // belt
  pixel(ctx, 15 + bx, 14 + by, C.hilt); // buckle
  pixel(ctx, 16 + bx, 14 + by, C.hilt);
  // scarf
  rect(ctx, 11 + bx, 9 + by, 10, 2, C.scarf);
  rect(ctx, 10 + bx, 10 + by, 2, 3, C.scarf); // trailing end

  // --- Head ---
  rect(ctx, 11 + bx, 2 + by, 10, 7, C.skin);
  rect(ctx, 11 + bx, 8 + by, 10, 1, C.skinShade);
  rect(ctx, 10 + bx, 1 + by, 12, 3, C.hair); // hair top
  rect(ctx, 10 + bx, 4 + by, 2, 3, C.hair); // back tuft
  pixel(ctx, 21 + bx, 4 + by, C.hair);
  // eyes
  const eye = pose.eye ?? 'open';
  if (eye === 'blink') {
    rect(ctx, 15 + bx, 6 + by, 4, 1, C.outline);
  } else if (eye === 'hurt') {
    pixel(ctx, 15 + bx, 5 + by, C.outline);
    pixel(ctx, 16 + bx, 6 + by, C.outline);
    pixel(ctx, 18 + bx, 5 + by, C.outline);
    pixel(ctx, 19 + bx, 6 + by, C.outline);
  } else {
    rect(ctx, 15 + bx, 5 + by, 1, 2, C.outline);
    rect(ctx, 18 + bx, 5 + by, 1, 2, C.outline);
  }
  // mouth
  if (pose.mouth === 'open') {
    rect(ctx, 16 + bx, 7 + by, 2, 1, C.blood);
  } else {
    pixel(ctx, 17 + bx, 7 + by, C.skinShade);
  }

  // --- Front leg ---
  const frontLeg = pose.frontLeg ?? { dx: 2, lift: 0 };
  drawLeg(ctx, 16 + frontLeg.dx, frontLeg.lift, bx);

  // --- Front arm ---
  const frontArm = pose.frontArm ?? { dx: 0, dy: 0 };
  drawArm(ctx, 19 + bx + frontArm.dx, 10 + by + frontArm.dy, C.tunic);

  // --- Sword ---
  drawSword(ctx, pose.sword ?? null, bx);
}

/* ------------------------------------------------------------------ */
/* Slime                                                               */
/* ------------------------------------------------------------------ */

function drawSlime(ctx: Ctx, index: number): void {
  const squash = [0, 2, 1][index] ?? 0; // 0 = tall, 2 = flattened
  const top = 2 + squash;
  const height = 12 - squash;
  const halfWidth = 9 + squash;
  const cx = 10;

  // Body: rows narrowing toward the top.
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.round(halfWidth * (0.55 + 0.45 * t));
    const x0 = cx - w;
    // gradient body: light top, deep bottom
    const color = y < height * 0.35 ? PAL.forestBright : y < height * 0.7 ? PAL.forestLight : PAL.moss;
    rect(ctx, x0, top + y, w * 2, 1, color);
  }
  // outline
  rect(ctx, cx - halfWidth, top + height - 1, halfWidth * 2, 1, PAL.ink);
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.round(halfWidth * (0.55 + 0.45 * t));
    pixel(ctx, cx - w - 1, top + y, PAL.ink);
    pixel(ctx, cx + w, top + y, PAL.ink);
  }
  rect(ctx, cx - Math.round(halfWidth * 0.55) - 1, top - 1, Math.round(halfWidth * 1.1) + 2, 1, PAL.ink);

  // Glossy highlight
  rect(ctx, cx - 5, top + 2, 4, 2, PAL.tealPale);
  pixel(ctx, cx - 6, top + 3, PAL.tealPale);

  // Eyes
  const eyeY = top + Math.max(4, Math.floor(height * 0.5));
  rect(ctx, cx - 4, eyeY, 2, 3, PAL.cream);
  rect(ctx, cx + 2, eyeY, 2, 3, PAL.cream);
  pixel(ctx, cx - 3, eyeY + 1, PAL.ink);
  pixel(ctx, cx + 3, eyeY + 1, PAL.ink);

  // Mouth
  rect(ctx, cx - 1, eyeY + 4, 3, 1, PAL.ink);
  // Feet nubs
  rect(ctx, cx - halfWidth + 1, top + height, 3, 1, PAL.ink);
  rect(ctx, cx + halfWidth - 3, top + height, 3, 1, PAL.ink);
}

/* ------------------------------------------------------------------ */
/* Collectibles                                                        */
/* ------------------------------------------------------------------ */

function drawCoin(ctx: Ctx, index: number): void {
  const widths = [9, 6, 2, 6];
  const w = widths[index];
  const cx = 5;
  const cy = 5;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const dx = Math.abs(x + 0.5 - cx);
      if (dx > w / 2) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= 4.6) {
        let color: string = PAL.gold;
        if (x < cx && y < cy) color = PAL.goldLight;
        if (y > cy + 1.5) color = PAL.goldDark;
        if (w <= 2) color = PAL.goldLight;
        pixel(ctx, x, y, color);
      } else if (d <= 5.4) {
        pixel(ctx, x, y, PAL.ink);
      }
    }
  }
}

function drawCrystal(ctx: Ctx, index: number): void {
  const glints: Array<[number, number]> = [
    [4, 4],
    [7, 7],
    [5, 10],
  ];
  // Silhouette rows (12 wide, 16 tall).
  const rows: Array<[number, number]> = [
    [5, 6],
    [4, 7],
    [3, 8],
    [2, 9],
    [1, 10],
    [1, 10],
    [1, 10],
    [1, 10],
    [1, 10],
    [2, 9],
    [3, 8],
    [4, 7],
    [4, 7],
    [5, 6],
    [5, 6],
    [6, 5],
  ];
  rows.forEach(([x0, x1], y) => {
    for (let x = x0; x <= x1; x++) {
      let color: string;
      if (x <= x0 + 1) color = PAL.gold;
      else if (x >= x1 - 1) color = PAL.goldDark;
      else color = PAL.goldLight;
      pixel(ctx, x, y, color);
    }
    // outline
    pixel(ctx, x0 - 1, y, PAL.ink);
    pixel(ctx, x1 + 1, y, PAL.ink);
  });
  rect(ctx, 4, 0, 4, 1, PAL.ink);
  rect(ctx, 4, 15, 4, 1, PAL.ink);
  // central facet shine
  rect(ctx, 5, 3, 2, 8, PAL.cream);
  // moving glint
  const [gx, gy] = glints[index];
  pixel(ctx, gx, gy, PAL.white);
  pixel(ctx, gx + 1, gy, PAL.white);
  pixel(ctx, gx, gy + 1, PAL.white);
}

/* ------------------------------------------------------------------ */
/* Environment props                                                   */
/* ------------------------------------------------------------------ */

function drawTree(ctx: Ctx, width: number, height: number, seed: number): void {
  const cx = Math.floor(width / 2);
  const trunkTop = Math.floor(height * 0.52);
  const trunkW = Math.max(4, Math.floor(width * 0.14));

  // Canopy: three overlapping discs.
  const canopyR = Math.floor(width * 0.36);
  const canopyY = Math.floor(height * 0.3);
  disc(ctx, cx - Math.floor(canopyR * 0.7), canopyY + 6, canopyR * 0.8, PAL.forestMid, PAL.ink);
  disc(ctx, cx + Math.floor(canopyR * 0.7), canopyY + 6, canopyR * 0.8, PAL.forestMid, PAL.ink);
  disc(ctx, cx, canopyY, canopyR, PAL.forestMid, PAL.ink);
  // lit top-left
  disc(ctx, cx - Math.floor(canopyR * 0.35), canopyY - 4, canopyR * 0.55, PAL.forestLight);
  disc(ctx, cx - Math.floor(canopyR * 0.5), canopyY - 7, canopyR * 0.3, PAL.forestBright);
  // dithered shading bottom-right
  for (let y = canopyY - canopyR; y < canopyY + canopyR * 2; y++) {
    for (let x = cx - canopyR; x < cx + canopyR; x++) {
      if ((x + y + seed) % 3 !== 0) continue;
      const d = Math.hypot(x - cx, y - canopyY);
      if (d > canopyR * 0.55 && d < canopyR + 1) pixel(ctx, x, y, PAL.forestDeep);
    }
  }

  // Trunk
  rect(ctx, cx - Math.floor(trunkW / 2), trunkTop, trunkW, height - trunkTop, PAL.bark);
  rect(ctx, cx - Math.floor(trunkW / 2), trunkTop, 1, height - trunkTop, PAL.brownLight);
  rect(ctx, cx + Math.floor(trunkW / 2) - 1, trunkTop, 1, height - trunkTop, PAL.barkDark);
  // bark marks
  for (let y = trunkTop + 3; y < height - 4; y += 6) {
    pixel(ctx, cx - 1 + (y % 2), y, PAL.barkDark);
  }
  // roots
  rect(ctx, cx - Math.floor(trunkW / 2) - 2, height - 3, 2, 3, PAL.barkDark);
  rect(ctx, cx + Math.floor(trunkW / 2), height - 3, 2, 3, PAL.barkDark);
}

function drawBush(ctx: Ctx): void {
  disc(ctx, 7, 8, 6, PAL.forestMid, PAL.ink);
  disc(ctx, 16, 8, 6, PAL.forestMid, PAL.ink);
  disc(ctx, 11, 6, 6, PAL.forestMid, PAL.ink);
  disc(ctx, 9, 5, 3.4, PAL.forestLight);
  disc(ctx, 15, 7, 3, PAL.forestLight);
  for (let y = 2; y < 12; y++) {
    for (let x = 1; x < 22; x++) {
      if ((x * 3 + y * 5) % 7 === 0 && Math.hypot(x - 11, y - 7) > 5) pixel(ctx, x, y, PAL.forestDeep);
    }
  }
}

function drawTuft(ctx: Ctx): void {
  const blades: Array<[number, number]> = [
    [1, 5],
    [4, 3],
    [7, 4],
    [10, 2],
    [6, 6],
  ];
  for (const [x, top] of blades) {
    for (let y = top; y < 6; y++) {
      pixel(ctx, x + Math.floor((y - top) / 3), y, y < top + 1 ? PAL.forestBright : PAL.moss);
    }
  }
  rect(ctx, 0, 5, 13, 1, PAL.forestDeep);
}

function drawFlower(ctx: Ctx, petal: string): void {
  rect(ctx, 3, 4, 1, 4, PAL.moss);
  pixel(ctx, 2, 6, PAL.forestLight);
  pixel(ctx, 4, 5, PAL.forestLight);
  pixel(ctx, 3, 3, petal);
  pixel(ctx, 2, 4, petal);
  pixel(ctx, 4, 4, petal);
  pixel(ctx, 3, 5, petal);
  pixel(ctx, 3, 4, PAL.cream);
}

function drawMushroom(ctx: Ctx): void {
  rect(ctx, 3, 7, 4, 3, PAL.creamDim);
  rect(ctx, 1, 3, 8, 4, PAL.red);
  rect(ctx, 1, 6, 8, 1, PAL.blood);
  pixel(ctx, 3, 4, PAL.cream);
  pixel(ctx, 6, 4, PAL.cream);
  pixel(ctx, 5, 3, PAL.cream);
  rect(ctx, 1, 3, 8, 1, PAL.redLight);
}

function drawRock(ctx: Ctx): void {
  rect(ctx, 2, 3, 9, 4, PAL.slate);
  rect(ctx, 3, 2, 6, 1, PAL.slate);
  rect(ctx, 2, 6, 9, 1, PAL.charcoalLight);
  rect(ctx, 3, 3, 3, 1, '#4d5c55');
  pixel(ctx, 9, 4, '#2a3430');
}

function drawSign(ctx: Ctx): void {
  rect(ctx, 7, 8, 3, 8, PAL.bark);
  rect(ctx, 7, 14, 3, 2, PAL.barkDark);
  rect(ctx, 1, 1, 15, 9, PAL.brown);
  rect(ctx, 1, 1, 15, 1, PAL.brownLight);
  rect(ctx, 1, 9, 15, 1, PAL.barkDark);
  rect(ctx, 2, 2, 13, 7, '#7d5836');
  // carved marks
  rect(ctx, 4, 4, 9, 1, PAL.barkDark);
  rect(ctx, 4, 6, 6, 1, PAL.barkDark);
}

/* ------------------------------------------------------------------ */
/* Structures                                                          */
/* ------------------------------------------------------------------ */

function drawCheckpoint(ctx: Ctx, active: boolean): void {
  // Stone shrine: base, pillar, orb.
  rect(ctx, 2, 27, 12, 5, PAL.slate);
  rect(ctx, 2, 27, 12, 1, '#4d5c55');
  rect(ctx, 3, 24, 10, 3, PAL.charcoalLight);
  rect(ctx, 5, 10, 6, 14, PAL.slate);
  rect(ctx, 5, 10, 1, 14, '#4d5c55');
  rect(ctx, 10, 10, 1, 14, '#2a3430');
  rect(ctx, 4, 9, 8, 2, PAL.charcoalLight);
  // rune marks
  rect(ctx, 7, 14, 1, 4, active ? PAL.gold : '#2a3430');
  rect(ctx, 6, 16, 3, 1, active ? PAL.gold : '#2a3430');
  // orb
  const orbY = 5;
  if (active) {
    disc(ctx, 8, orbY, 4, PAL.gold, PAL.ink);
    disc(ctx, 7, orbY - 1, 2, PAL.goldLight);
    pixel(ctx, 7, orbY - 2, PAL.white);
  } else {
    disc(ctx, 8, orbY, 4, PAL.slate, PAL.ink);
    disc(ctx, 7, orbY - 1, 2, '#4d5c55');
    pixel(ctx, 7, orbY - 2, '#6d7d75');
  }
  // feet
  rect(ctx, 1, 31, 14, 1, PAL.ink);
}

function drawExit(ctx: Ctx, frame: number): void {
  const W = 48;
  const H = 64;
  // Portal interior (animated bands).
  for (let y = 12; y < H - 4; y++) {
    for (let x = 14; x < W - 14; x++) {
      const band = (y + frame * 4) % 12;
      let color: string;
      if (band < 4) color = PAL.teal;
      else if (band < 8) color = PAL.tealLight;
      else color = PAL.tealPale;
      // dither the bands
      if ((x + y) % 4 === 0 && band >= 8) color = PAL.teal;
      pixel(ctx, x, y, color);
    }
  }
  // shimmering highlights
  for (let i = 0; i < 4; i++) {
    const sx = 17 + ((i * 7 + frame * 3) % 18);
    const sy = 16 + ((i * 11 + frame * 5) % 36);
    pixel(ctx, sx, sy, PAL.cream);
  }

  // Stone arch.
  rect(ctx, 4, 8, 10, H - 8, PAL.slate);
  rect(ctx, W - 14, 8, 10, H - 8, PAL.slate);
  rect(ctx, 4, 8, 10, 1, '#4d5c55');
  rect(ctx, W - 14, 8, 10, 1, '#4d5c55');
  rect(ctx, 4, 8, 1, H - 8, '#2a3430');
  rect(ctx, W - 14, 8, 1, H - 8, '#2a3430');
  // arch top
  for (let x = 4; x < W - 4; x++) {
    const t = (x - 4) / (W - 8);
    rect(ctx, x, 4 + Math.round(Math.abs(t - 0.5) * -6 + 3), 1, 6, PAL.slate);
  }
  rect(ctx, 4, 4, W - 8, 2, PAL.slate);
  // keystone (gold)
  rect(ctx, W / 2 - 3, 2, 6, 5, PAL.gold);
  rect(ctx, W / 2 - 3, 2, 6, 1, PAL.goldLight);
  rect(ctx, W / 2 - 3, 6, 6, 1, PAL.goldDark);
  pixel(ctx, W / 2, 4, PAL.white);
  // mortar lines
  for (let y = 14; y < H - 4; y += 6) {
    rect(ctx, 5, y, 8, 1, '#2a3430');
    rect(ctx, W - 13, y, 8, 1, '#2a3430');
  }
  // base
  rect(ctx, 2, H - 4, W - 4, 4, PAL.charcoalLight);
  rect(ctx, 2, H - 4, W - 4, 1, '#4d5c55');
  rect(ctx, 1, H - 1, W - 2, 1, PAL.ink);
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

function drawSlash(ctx: Ctx): void {
  // Crescent arc centred on the left edge, sweeping forward.
  const cx = 5;
  const cy = 16;
  for (let a = -78; a <= 78; a += 1.6) {
    const rad = (a * Math.PI) / 180;
    for (let r = 11; r <= 14; r++) {
      const x = cx + Math.cos(rad) * r;
      const y = cy + Math.sin(rad) * r;
      const color = r <= 12 ? PAL.white : r === 13 ? PAL.goldLight : PAL.gold;
      pixel(ctx, x, y, color);
    }
  }
}

function drawSpark(ctx: Ctx): void {
  // Four-point star.
  rect(ctx, 2, 0, 1, 5, PAL.white);
  rect(ctx, 0, 2, 5, 1, PAL.white);
  pixel(ctx, 2, 2, PAL.goldLight);
  pixel(ctx, 1, 1, PAL.goldLight);
  pixel(ctx, 3, 1, PAL.goldLight);
  pixel(ctx, 1, 3, PAL.goldLight);
  pixel(ctx, 3, 3, PAL.goldLight);
}

function drawRing(ctx: Ctx): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
      if (d > 6.2 && d <= 7.6) pixel(ctx, x, y, PAL.goldLight);
      else if (d > 7.6 && d <= 8.4) pixel(ctx, x, y, PAL.gold);
    }
  }
}

function drawGlow(ctx: Ctx): void {
  // Dithered radial glow (gold).
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
      if (d > 16) continue;
      const strength = 1 - d / 16;
      const threshold = strength * 5;
      if (threshold >= 4) pixel(ctx, x, y, PAL.goldLight);
      else if (threshold >= 3 && (x + y) % 2 === 0) pixel(ctx, x, y, PAL.gold);
      else if (threshold >= 2 && (x * y) % 3 === 0) pixel(ctx, x, y, PAL.goldDark);
      else if (threshold >= 1 && (x + y * 2) % 4 === 0) pixel(ctx, x, y, PAL.bark);
    }
  }
}

function drawPuff(ctx: Ctx): void {
  disc(ctx, 4, 5, 3, 'rgba(242,230,201,0.9)');
  disc(ctx, 7, 5, 2.4, 'rgba(242,230,201,0.9)');
  disc(ctx, 5.5, 3.6, 2.2, 'rgba(242,230,201,0.95)');
}

/* ------------------------------------------------------------------ */
/* Backgrounds                                                         */
/* ------------------------------------------------------------------ */

function drawSky(ctx: Ctx, width: number, height: number): void {
  const bands: Array<[number, string]> = [
    [0, '#0c1d18'],
    [52, '#11281f'],
    [96, '#173a2d'],
    [136, '#205140'],
    [172, '#2f6b5a'],
    [204, '#5d9182'],
    [232, '#a8bfa4'],
    [250, '#e6d9b4'],
  ];
  for (let i = 0; i < bands.length; i++) {
    const [y, color] = bands[i];
    const nextY = i + 1 < bands.length ? bands[i + 1][0] : height;
    rect(ctx, 0, y, width, nextY - y, color);
    // dithered transition into the next band
    if (i + 1 < bands.length) {
      const nextColor = bands[i + 1][1];
      for (let d = 0; d < 6; d++) {
        for (let x = 0; x < width; x++) {
          if ((x + d) % 2 === 0 && (x * 7 + d * 13) % 3 !== 0) pixel(ctx, x, nextY - 6 + d, nextColor);
        }
      }
    }
  }
  // Pale sun disc near the horizon.
  disc(ctx, width - 110, 214, 26, 'rgba(255,224,138,0.25)');
  disc(ctx, width - 110, 214, 17, 'rgba(255,224,138,0.45)');
  disc(ctx, width - 110, 214, 11, 'rgba(255,240,200,0.8)');
}

function drawHills(ctx: Ctx, width: number, height: number): void {
  const base = height;
  // Far ridge.
  ctx.fillStyle = '#16352a';
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= width; x++) {
    const y =
      base -
      40 -
      Math.sin((x / width) * Math.PI * 2) * 18 -
      Math.sin((x / width) * Math.PI * 6 + 1.2) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, base);
  ctx.closePath();
  ctx.fill();

  // Distant conifer silhouettes.
  for (let i = 0; i < 26; i++) {
    const x = (i * 37 + 11) % width;
    const h = 26 + ((i * 13) % 18);
    const y = base - 44 - Math.sin((x / width) * Math.PI * 2) * 18;
    ctx.fillStyle = '#122b21';
    for (let row = 0; row < h; row += 2) {
      const w = Math.round((row / h) * 12) + 1;
      rect(ctx, x - w, y - row, w * 2, 2, '#122b21');
    }
    rect(ctx, x - 1, y, 2, 6, '#0e2019');
  }
}

function drawTreeLine(ctx: Ctx, width: number, height: number, color: string, dark: string, scale: number): void {
  const base = height;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= width; x++) {
    const y = base - 46 * scale - Math.sin((x / (48 * scale)) * Math.PI * 2) * 16 * scale - Math.sin((x / (19 * scale)) * Math.PI * 2 + 0.6) * 9 * scale;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, base);
  ctx.closePath();
  ctx.fill();

  // Canopy blobs + trunks in the same tone.
  const spacing = Math.round(52 * scale);
  for (let x = 0; x < width; x += spacing) {
    const jitter = ((x * 7919) % 23) - 11;
    const cx = x + spacing / 2 + jitter;
    const cy = base - 52 * scale + Math.sin((cx / (48 * scale)) * Math.PI * 2) * -12 * scale;
    disc(ctx, cx, cy, 16 * scale, color, dark);
    disc(ctx, cx - 9 * scale, cy + 5 * scale, 11 * scale, color, dark);
    disc(ctx, cx + 9 * scale, cy + 5 * scale, 11 * scale, color, dark);
    rect(ctx, cx - 2 * scale, cy + 6 * scale, 4 * scale, base - cy - 6 * scale, dark);
  }
}

function drawNearTrees(ctx: Ctx, width: number, height: number): void {
  const trunkCount = 5;
  for (let i = 0; i < trunkCount; i++) {
    const cx = 40 + i * Math.floor((width - 80) / (trunkCount - 1));
    const w = 14 + ((i * 5) % 7);
    // slight lean
    const lean = i % 2 === 0 ? 2 : -2;
    for (let y = 0; y < height; y++) {
      const offset = Math.round((y / height) * lean);
      rect(ctx, cx - Math.floor(w / 2) + offset, y, w, 1, PAL.bark);
      rect(ctx, cx - Math.floor(w / 2) + offset, y, 1, 1, '#5d432a');
      rect(ctx, cx + Math.floor(w / 2) - 1 + offset, y, 1, 1, PAL.barkDark);
      if (y % 9 === 0) rect(ctx, cx - 2 + offset, y, 3, 1, PAL.barkDark);
      if (y % 13 === 4) rect(ctx, cx + 2 + offset, y, 2, 1, '#5d432a');
    }
    // hanging canopy at the very top
    for (let x = cx - 34; x < cx + 34; x += 4) {
      const drop = 10 + ((x * 5 + i * 7) % 16);
      rect(ctx, x, 0, 5, drop, i % 2 === 0 ? PAL.forestDeep : '#16352a');
      if ((x + i) % 3 === 0) rect(ctx, x + 1, drop, 3, 3, '#16352a');
    }
  }
}

function drawLightBeams(ctx: Ctx, _width: number, height: number): void {
  ctx.globalAlpha = 0.055;
  for (let i = 0; i < 4; i++) {
    const x0 = 30 + i * 130;
    for (let y = 0; y < height; y++) {
      const x = x0 + Math.round(y * 0.35);
      rect(ctx, x, y, 14 + i * 3, 1, PAL.cream);
      if (y % 3 === 0) rect(ctx, x + 14 + i * 3, y, 6, 1, PAL.cream);
    }
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */

function drawTiles(ctx: Ctx): void {
  // f0: grass top
  rect(ctx, 0, 0, 16, 16, '#5a4028');
  rect(ctx, 0, 0, 16, 1, PAL.forestBright);
  rect(ctx, 0, 1, 16, 3, PAL.forestLight);
  rect(ctx, 0, 3, 16, 1, PAL.moss);
  // grass blades
  rect(ctx, 2, 0, 1, 1, PAL.forestBright);
  rect(ctx, 7, 0, 1, 1, PAL.forestBright);
  rect(ctx, 12, 0, 1, 1, PAL.forestBright);
  // dirt speckles
  rect(ctx, 3, 6, 2, 1, PAL.brown);
  rect(ctx, 11, 8, 2, 1, PAL.brown);
  rect(ctx, 6, 11, 1, 1, PAL.brown);
  rect(ctx, 13, 13, 2, 1, PAL.bark);
  pixel(ctx, 1, 9, PAL.brownLight);
  pixel(ctx, 9, 14, PAL.brownLight);
  rect(ctx, 0, 15, 16, 1, '#4a3320');

  // f1: dirt
  rect(ctx, 16, 0, 16, 16, '#5a4028');
  rect(ctx, 18, 3, 3, 2, PAL.brown);
  rect(ctx, 26, 6, 3, 2, PAL.brown);
  rect(ctx, 20, 10, 2, 1, PAL.bark);
  rect(ctx, 28, 12, 2, 2, PAL.brownLight);
  rect(ctx, 23, 14, 3, 1, PAL.bark);
  pixel(ctx, 30, 2, PAL.brownLight);
  pixel(ctx, 17, 12, PAL.brownLight);
  pixel(ctx, 25, 8, PAL.bark);

  // f2: wooden plank (bridge) — only the top rows are visible
  rect(ctx, 32, 0, 16, 6, PAL.brown);
  rect(ctx, 32, 0, 16, 1, '#a5804f');
  rect(ctx, 32, 1, 16, 1, '#8f6b42');
  rect(ctx, 32, 5, 16, 1, PAL.barkDark);
  rect(ctx, 36, 1, 1, 4, PAL.barkDark);
  rect(ctx, 44, 1, 1, 4, PAL.barkDark);
  rect(ctx, 40, 2, 1, 3, '#5d432a');
  // rope ends
  rect(ctx, 32, 6, 16, 1, '#3d2c1b');

  // f3: stone block
  rect(ctx, 48, 0, 16, 16, PAL.slate);
  rect(ctx, 48, 0, 16, 1, '#4d5c55');
  rect(ctx, 48, 7, 16, 1, '#2a3430');
  rect(ctx, 55, 0, 1, 7, '#2a3430');
  rect(ctx, 51, 8, 1, 7, '#2a3430');
  rect(ctx, 48, 15, 16, 1, '#202825');
}

/* ------------------------------------------------------------------ */
/* World themes — tiles, backdrops and props for worlds 2-4           */
/* ------------------------------------------------------------------ */

/** Dithered horizontal colour bands, shared by every sky. */
function paintBands(ctx: Ctx, width: number, height: number, bands: Array<[number, string]>): void {
  for (let i = 0; i < bands.length; i++) {
    const [y, color] = bands[i];
    const nextY = i + 1 < bands.length ? bands[i + 1][0] : height;
    rect(ctx, 0, y, width, nextY - y, color);
    if (i + 1 < bands.length) {
      const nextColor = bands[i + 1][1];
      for (let d = 0; d < 6; d++) {
        for (let x = 0; x < width; x++) {
          if ((x + d) % 2 === 0 && (x * 7 + d * 13) % 3 !== 0) pixel(ctx, x, nextY - 6 + d, nextColor);
        }
      }
    }
  }
}

/** Filled ridge silhouette with a lit crest. */
function ridge(
  ctx: Ctx,
  width: number,
  base: number,
  height: number,
  fill: string,
  rim: string | null,
  freq: number,
  phase: number,
): void {
  const trace = (lift: number): void => {
    ctx.beginPath();
    ctx.moveTo(0, base);
    for (let x = 0; x <= width; x++) {
      const y =
        base -
        height -
        Math.sin((x / width) * Math.PI * 2 * freq) * height * 0.42 -
        Math.sin((x / width) * Math.PI * 5 * freq + phase) * height * 0.26;
      ctx.lineTo(x, y - lift);
    }
    ctx.lineTo(width, base);
    ctx.closePath();
  };
  if (rim) {
    ctx.fillStyle = rim;
    trace(3);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  trace(0);
  ctx.fill();
}

/* --- World 2: Ember Caverns ---------------------------------------- */

function drawTilesCavern(ctx: Ctx): void {
  // f0: volcanic crust
  rect(ctx, 0, 0, 16, 16, '#2c2320');
  rect(ctx, 0, 0, 16, 1, '#e07a3a');
  rect(ctx, 0, 1, 16, 2, '#8f4a26');
  rect(ctx, 0, 3, 16, 1, '#5e3320');
  rect(ctx, 2, 6, 3, 1, '#c96a30');
  rect(ctx, 10, 9, 3, 1, '#a85428');
  rect(ctx, 5, 12, 2, 1, '#7a3f22');
  pixel(ctx, 1, 9, '#43322a');
  pixel(ctx, 12, 4, '#43322a');
  pixel(ctx, 8, 14, '#1e1715');
  rect(ctx, 0, 15, 16, 1, '#1a1512');

  // f1: rock fill
  rect(ctx, 16, 0, 16, 16, '#2c2320');
  rect(ctx, 18, 3, 4, 2, '#3a2e28');
  rect(ctx, 26, 6, 4, 2, '#241d1a');
  rect(ctx, 20, 10, 3, 1, '#3a2e28');
  rect(ctx, 28, 12, 3, 2, '#453529');
  rect(ctx, 23, 14, 4, 1, '#241d1a');
  pixel(ctx, 31, 2, '#453529');
  pixel(ctx, 17, 12, '#453529');
  pixel(ctx, 25, 8, '#1a1512');

  // f2: cut stone slab
  rect(ctx, 32, 0, 16, 6, '#4a4642');
  rect(ctx, 32, 0, 16, 1, '#6a645e');
  rect(ctx, 32, 1, 16, 1, '#5a544e');
  rect(ctx, 32, 5, 16, 1, '#26221f');
  rect(ctx, 36, 1, 1, 4, '#26221f');
  rect(ctx, 44, 1, 1, 4, '#26221f');
  rect(ctx, 40, 2, 1, 3, '#3a3632');
  rect(ctx, 32, 6, 16, 1, '#1a1512');

  // f3: basalt block
  rect(ctx, 48, 0, 16, 16, '#38302c');
  rect(ctx, 48, 0, 16, 1, '#4d443e');
  rect(ctx, 48, 7, 16, 1, '#221c19');
  rect(ctx, 55, 0, 1, 7, '#221c19');
  rect(ctx, 51, 8, 1, 7, '#221c19');
  rect(ctx, 48, 15, 16, 1, '#1a1512');
}

function drawCavernSky(ctx: Ctx, width: number, height: number): void {
  paintBands(ctx, width, height, [
    [0, '#0b0a0c'],
    [56, '#141016'],
    [112, '#1e1520'],
    [164, '#2c1a1e'],
    [206, '#452220'],
    [240, '#6b3420'],
  ]);
  disc(ctx, Math.round(width * 0.3), height + 24, 96, 'rgba(255,140,60,0.20)');
  disc(ctx, Math.round(width * 0.74), height + 30, 118, 'rgba(255,120,50,0.16)');
}

function drawCavernFar(ctx: Ctx, width: number, height: number): void {
  ridge(ctx, width, height, 46, '#1b1219', '#2c1c22', 1.6, 0.7);
}

function drawCavernTeeth(ctx: Ctx, width: number, _height: number): void {
  // Stalactite ceiling: tapered spikes hanging from the top edge.
  for (let i = 0; i < 30; i++) {
    const x = (i * 17 + 9) % width;
    const len = 30 + ((i * 37) % 78);
    const half = 4 + ((i * 13) % 7);
    for (let y = 0; y < len; y++) {
      const t = y / len;
      const w = Math.max(1, Math.round(half * (1 - t * 0.92)));
      rect(ctx, x - w, y, w * 2 + 1, 1, y < len * 0.45 ? '#241b23' : '#1b141b');
    }
    rect(ctx, x - half, 0, half * 2 + 1, 1, '#332634');
    pixel(ctx, x - half + 1, 2, '#4a3648');
    if (i % 4 === 0) pixel(ctx, x, Math.floor(len * 0.7), '#6b3a22');
  }
}

function drawCavernMid(ctx: Ctx, width: number, height: number): void {
  const base = height;
  // Rubble mounds along the cavern floor.
  for (let x = -10; x < width + 30; x += 46) {
    const r = 26 + ((x * 7) % 16);
    disc(ctx, x, base, r, '#1f1720', '#2a2029');
    disc(ctx, x + 20, base, r - 8, '#1f1720');
  }
  rect(ctx, 0, base - 4, width, 4, '#1f1720');
}

function drawCavernNear(ctx: Ctx, width: number, height: number): void {
  const base = height;
  // Chunky rock columns framing the view.
  for (let i = 0; i < 7; i++) {
    const cx = 24 + i * Math.floor((width - 48) / 6);
    const w = 22 + ((i * 9) % 14);
    for (let y = 0; y < base; y++) {
      const wobble = Math.round(Math.sin(y / 34 + i) * 3);
      rect(ctx, cx - Math.floor(w / 2) + wobble, y, w, 1, '#150f16');
      rect(ctx, cx - Math.floor(w / 2) + wobble, y, 2, 1, '#221a23');
      rect(ctx, cx + Math.floor(w / 2) - 2 + wobble, y, 2, 1, '#0e0a10');
      if (y % 17 === 0) rect(ctx, cx - 3 + wobble, y, 5, 1, '#0e0a10');
    }
    // hanging teeth at the top of each column
    for (let x = cx - w; x < cx + w; x += 6) {
      const drop = 12 + ((x * 5 + i * 11) % 26);
      rect(ctx, x, 0, 4, drop, '#120d14');
    }
  }
}

function drawCavernGlow(ctx: Ctx, width: number, height: number): void {
  // Additive lava bloom sitting along the bottom of the screen.
  const bands: Array<[number, string]> = [
    [height - 74, 'rgba(255,140,60,0.05)'],
    [height - 46, 'rgba(255,120,50,0.12)'],
    [height - 22, 'rgba(255,150,70,0.24)'],
    [height - 6, 'rgba(255,190,110,0.42)'],
  ];
  for (const [y, color] of bands) rect(ctx, 0, y, width, height - y, color);
  for (let i = 0; i < 60; i++) {
    const x = (i * 53 + 21) % width;
    const y = height - 4 - ((i * 29) % 26);
    pixel(ctx, x, y, 'rgba(255,214,150,0.55)');
  }
}

/* --- World 3: Frostfall Peaks --------------------------------------- */

function drawTilesPeaks(ctx: Ctx): void {
  // f0: packed snow
  rect(ctx, 0, 0, 16, 16, '#5a6f80');
  rect(ctx, 0, 0, 16, 2, '#f4f9ff');
  rect(ctx, 0, 2, 16, 2, '#cfe2ef');
  rect(ctx, 0, 4, 16, 1, '#9db8cc');
  rect(ctx, 3, 7, 3, 1, '#7d97ad');
  rect(ctx, 11, 9, 3, 1, '#7d97ad');
  rect(ctx, 6, 12, 2, 1, '#4d6273');
  pixel(ctx, 1, 10, '#8aa4b8');
  pixel(ctx, 9, 14, '#8aa4b8');
  rect(ctx, 0, 15, 16, 1, '#3f5262');

  // f1: frozen rock
  rect(ctx, 16, 0, 16, 16, '#4a5f70');
  rect(ctx, 18, 3, 4, 2, '#5d7488');
  rect(ctx, 26, 6, 4, 2, '#3b4e5e');
  rect(ctx, 20, 10, 3, 1, '#5d7488');
  rect(ctx, 28, 12, 3, 2, '#6b849a');
  rect(ctx, 23, 14, 4, 1, '#3b4e5e');
  pixel(ctx, 31, 2, '#6b849a');
  pixel(ctx, 17, 12, '#6b849a');
  pixel(ctx, 25, 8, '#2f4150');

  // f2: snowy plank
  rect(ctx, 32, 0, 16, 6, '#7d6446');
  rect(ctx, 32, 0, 16, 2, '#f4f9ff');
  rect(ctx, 32, 2, 16, 1, '#cfe2ef');
  rect(ctx, 32, 5, 16, 1, '#4a3a26');
  rect(ctx, 36, 2, 1, 3, '#4a3a26');
  rect(ctx, 44, 2, 1, 3, '#4a3a26');
  rect(ctx, 40, 3, 1, 2, '#5d4a30');
  rect(ctx, 32, 6, 16, 1, '#2f2517');

  // f3: ice block
  rect(ctx, 48, 0, 16, 16, '#7fb4cd');
  rect(ctx, 48, 0, 16, 1, '#dff3ff');
  rect(ctx, 48, 7, 16, 1, '#5b8ea8');
  rect(ctx, 55, 0, 1, 7, '#5b8ea8');
  rect(ctx, 51, 8, 1, 7, '#5b8ea8');
  rect(ctx, 48, 15, 16, 1, '#47718a');
  rect(ctx, 50, 2, 4, 3, '#a8d8ec');
}

function drawPeaksSky(ctx: Ctx, width: number, height: number): void {
  paintBands(ctx, width, height, [
    [0, '#131c34'],
    [54, '#1d2b48'],
    [104, '#2c4260'],
    [150, '#486a86'],
    [192, '#7c9db2'],
    [226, '#bcd2dc'],
    [248, '#e8eef0'],
  ]);
  disc(ctx, 118, 74, 22, 'rgba(240,248,255,0.22)');
  disc(ctx, 118, 74, 15, 'rgba(244,250,255,0.55)');
}

function drawPeaksFar(ctx: Ctx, width: number, height: number): void {
  ridge(ctx, width, height, 58, '#2b3f5c', '#5b7896', 1.4, 0.4);
  // Snow caps along the crest.
  for (let x = 0; x < width; x += 6) {
    const y =
      height -
      58 -
      Math.sin((x / width) * Math.PI * 2 * 1.4) * 24 -
      Math.sin((x / width) * Math.PI * 7 + 0.4) * 15;
    rect(ctx, x, y - 3, 6, 4, '#dfeef7');
  }
}

function drawPeaksMid(ctx: Ctx, width: number, height: number): void {
  const base = height;
  ridge(ctx, width, base, 40, '#25384f', '#3d5a74', 2.1, 1.1);
  // Conifer silhouettes along the ridge.
  for (let i = 0; i < 34; i++) {
    const x = (i * 15 + 6) % width;
    const y =
      base -
      40 -
      Math.sin((x / width) * Math.PI * 2 * 2.1) * 17 -
      Math.sin((x / width) * Math.PI * 10.5 + 1.1) * 10;
    const h = 22 + ((i * 11) % 16);
    for (let row = 0; row < h; row += 2) {
      const w = Math.round((row / h) * 9) + 1;
      rect(ctx, x - w, y - row, w * 2, 2, '#1e3145');
    }
    rect(ctx, x - 1, y, 2, 5, '#16253a');
    rect(ctx, x - 3, y - h + 3, 6, 2, '#cfe2ef');
  }
}

function drawPeaksNear(ctx: Ctx, width: number, height: number): void {
  const base = height;
  for (let i = 0; i < 9; i++) {
    const cx = 20 + i * Math.floor((width - 40) / 8);
    const h = 74 + ((i * 17) % 40);
    const w = 13 + ((i * 7) % 7);
    // trunk
    rect(ctx, cx - 2, base - 14, 4, 14, '#152536');
    // needle tiers
    for (let tier = 0; tier < 4; tier++) {
      const top = base - 14 - h + tier * Math.floor(h / 5);
      const bottom = top + Math.floor(h / 4);
      const half = Math.max(2, Math.round((w / 2) * (0.45 + tier * 0.24)));
      for (let y = top; y < bottom; y++) {
        const t = (y - top) / Math.max(1, bottom - top);
        const hw = Math.max(1, Math.round(half * (0.35 + t * 0.65)));
        rect(ctx, cx - hw, y, hw * 2, 1, '#132536');
      }
      rect(ctx, cx - half, top, half * 2, 1, '#22415a');
    }
  }
}

function drawPeaksTrees(ctx: Ctx, width: number, height: number): void {
  const base = height;
  // Foreground pines — near-black with snow shelves.
  for (let i = 0; i < 6; i++) {
    const cx = 34 + i * Math.floor((width - 68) / 5);
    const h = 150 + ((i * 23) % 60);
    rect(ctx, cx - 3, base - 20, 6, 20, '#0d1622');
    for (let tier = 0; tier < 6; tier++) {
      const top = base - 20 - h + tier * Math.floor(h / 6);
      const bottom = top + Math.floor(h / 5);
      const half = 10 + tier * 5;
      for (let y = top; y < bottom; y++) {
        const t = (y - top) / Math.max(1, bottom - top);
        const hw = Math.max(2, Math.round(half * (0.4 + t * 0.6)));
        rect(ctx, cx - hw, y, hw * 2, 1, '#0d1622');
      }
      rect(ctx, cx - half, top, half * 2, 1, '#1b3348');
      rect(ctx, cx - half + 2, top + 1, 3, 1, '#cfe2ef');
    }
  }
}

function drawPeaksAurora(ctx: Ctx, _width: number, height: number): void {
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    const x0 = 24 + i * 96;
    for (let y = 0; y < height * 0.7; y++) {
      const sway = Math.round(Math.sin(y / 44 + i) * 16);
      rect(ctx, x0 + sway, y, 10 + i * 2, 1, i % 2 === 0 ? '#7ee0c4' : '#8fb8ff');
    }
  }
  ctx.globalAlpha = 1;
}

/* --- World 4: The Forgotten Kingdom --------------------------------- */

function drawTilesKingdom(ctx: Ctx): void {
  // f0: mossy flagstone
  rect(ctx, 0, 0, 16, 16, '#4b4f42');
  rect(ctx, 0, 0, 16, 2, '#6f8a4e');
  rect(ctx, 0, 2, 16, 1, '#4f6a3a');
  rect(ctx, 0, 3, 16, 1, '#3c4a33');
  rect(ctx, 3, 7, 4, 1, '#5d6353');
  rect(ctx, 11, 9, 3, 1, '#3c4237');
  rect(ctx, 6, 12, 2, 1, '#5d6353');
  pixel(ctx, 1, 10, '#7f8a6a');
  pixel(ctx, 9, 14, '#33382d');
  rect(ctx, 0, 15, 16, 1, '#2e3329');

  // f1: weathered stone fill
  rect(ctx, 16, 0, 16, 16, '#4b4f42');
  rect(ctx, 18, 3, 4, 2, '#5d6353');
  rect(ctx, 26, 6, 4, 2, '#3c4237');
  rect(ctx, 20, 10, 3, 1, '#5d6353');
  rect(ctx, 28, 12, 3, 2, '#69705c');
  rect(ctx, 23, 14, 4, 1, '#3c4237');
  pixel(ctx, 31, 2, '#69705c');
  pixel(ctx, 17, 12, '#69705c');
  pixel(ctx, 25, 8, '#2e3329');

  // f2: cracked causeway slab
  rect(ctx, 32, 0, 16, 6, '#5a6052');
  rect(ctx, 32, 0, 16, 1, '#7d8470');
  rect(ctx, 32, 1, 16, 1, '#6a7160');
  rect(ctx, 32, 5, 16, 1, '#2e3329');
  rect(ctx, 36, 1, 1, 4, '#2e3329');
  rect(ctx, 44, 1, 1, 4, '#2e3329');
  rect(ctx, 40, 2, 2, 3, '#4a5044');
  rect(ctx, 32, 6, 16, 1, '#24281f');

  // f3: carved block
  rect(ctx, 48, 0, 16, 16, '#565c4c');
  rect(ctx, 48, 0, 16, 1, '#767d68');
  rect(ctx, 48, 7, 16, 1, '#33382d');
  rect(ctx, 55, 0, 1, 7, '#33382d');
  rect(ctx, 51, 8, 1, 7, '#33382d');
  rect(ctx, 48, 15, 16, 1, '#282c23');
  rect(ctx, 50, 3, 4, 3, '#69705c');
}

function drawKingdomSky(ctx: Ctx, width: number, height: number): void {
  paintBands(ctx, width, height, [
    [0, '#12101a'],
    [50, '#1b1826'],
    [102, '#272233'],
    [152, '#373041'],
    [196, '#4c4351'],
    [230, '#6b6069'],
    [250, '#8b7f7f'],
  ]);
  // Pale break in the storm clouds.
  disc(ctx, 360, 128, 54, 'rgba(214,206,186,0.14)');
  disc(ctx, 360, 128, 34, 'rgba(228,220,200,0.22)');
}

function drawKingdomFar(ctx: Ctx, width: number, height: number): void {
  ridge(ctx, width, height, 40, '#221e2b', '#302b3b', 1.2, 2.1);
  // Distant broken spires.
  for (let i = 0; i < 14; i++) {
    const x = (i * 37 + 13) % width;
    const h = 34 + ((i * 19) % 44);
    const w = 7 + ((i * 5) % 7);
    rect(ctx, x, height - h, w, h, '#221e2b');
    rect(ctx, x, height - h, w, 2, '#302b3b');
    // crenellated / broken tops
    if (i % 2 === 0) rect(ctx, x, height - h - 5, 3, 5, '#221e2b');
    else rect(ctx, x + w - 3, height - h - 4, 3, 4, '#221e2b');
  }
}

function drawKingdomMid(ctx: Ctx, width: number, height: number): void {
  const base = height;
  // A ruined battlement wall with gaps.
  const wallTop = base - 52;
  rect(ctx, 0, wallTop, width, 52, '#1c1a26');
  rect(ctx, 0, wallTop, width, 2, '#282536');
  for (let x = 0; x < width; x += 20) {
    rect(ctx, x, wallTop - 9, 12, 9, '#1c1a26');
    rect(ctx, x, wallTop - 9, 12, 2, '#282536');
  }
  // Arrow slits + collapse.
  for (let x = 12; x < width; x += 46) rect(ctx, x, wallTop + 14, 4, 14, '#12101a');
  for (let x = 78; x < width; x += 160) {
    rect(ctx, x, wallTop - 4, 30, 12, '#2a2637');
    rect(ctx, x + 6, wallTop + 6, 22, 10, '#12101a');
  }
}

function drawKingdomNear(ctx: Ctx, width: number, height: number): void {
  const base = height;
  // Fallen columns and rubble silhouettes.
  for (let i = 0; i < 8; i++) {
    const cx = 28 + i * Math.floor((width - 56) / 7);
    const h = 96 + ((i * 27) % 70);
    const w = 16 + ((i * 6) % 8);
    for (let y = base - h; y < base; y++) {
      const wobble = Math.round(Math.sin(y / 40 + i) * 2);
      rect(ctx, cx - Math.floor(w / 2) + wobble, y, w, 1, '#161421');
      rect(ctx, cx - Math.floor(w / 2) + wobble, y, 2, 1, '#221f30');
      rect(ctx, cx + Math.floor(w / 2) - 2 + wobble, y, 2, 1, '#100e18');
    }
    // jagged broken crown
    for (let k = 0; k < 4; k++) {
      const bh = 4 + ((k * 7 + i * 3) % 12);
      rect(ctx, cx - Math.floor(w / 2) + k * 4, base - h - bh, 4, bh, '#161421');
    }
    if (i % 2 === 0) rect(ctx, cx - w, base - 12, w * 2, 5, '#161421');
  }
}

function drawKingdomColumns(ctx: Ctx, width: number, height: number): void {
  const base = height;
  for (let i = 0; i < 5; i++) {
    const cx = 44 + i * Math.floor((width - 88) / 4);
    const w = 26;
    const h = 190 + ((i * 31) % 60);
    for (let y = base - h; y < base; y++) {
      rect(ctx, cx - Math.floor(w / 2), y, w, 1, '#111019');
      rect(ctx, cx - Math.floor(w / 2), y, 3, 1, '#1d1b29');
      rect(ctx, cx + Math.floor(w / 2) - 3, y, 3, 1, '#0b0a11');
      if (y % 22 === 3) rect(ctx, cx - 4, y, 8, 2, '#0b0a11');
    }
    // capital + fluting
    rect(ctx, cx - Math.floor(w / 2) - 3, base - h, w + 6, 6, '#111019');
    for (let k = 0; k < 3; k++) rect(ctx, cx - 8 + k * 8, base - h + 8, 2, h - 20, '#0b0a11');
  }
}

function drawKingdomMist(ctx: Ctx, width: number, _height: number): void {
  for (let i = 0; i < 5; i++) {
    const y = 118 + i * 30;
    ctx.globalAlpha = 0.16 - i * 0.02;
    for (let x = 0; x < width; x++) {
      rect(ctx, x, y + Math.round(Math.sin(x / 60 + i) * 5), 1, 10 + (i % 3) * 4, '#cfc3a3');
    }
  }
  ctx.globalAlpha = 1;
}

/* --- Themed props --------------------------------------------------- */

function drawStalagmite(ctx: Ctx): void {
  const W = 14;
  const H = 22;
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const half = Math.max(1, Math.round(1 + 5.4 * Math.pow(t, 1.7)));
    rect(ctx, W / 2 - half, y, half * 2, 1, '#2a2220');
    rect(ctx, W / 2 - half, y, 2, 1, '#3d322c');
    rect(ctx, W / 2 + half - 2, y, 2, 1, '#171314');
  }
  pixel(ctx, 6, 16, '#8a4a2a');
  pixel(ctx, 8, 19, '#6b3a22');
  rect(ctx, 0, H - 2, W, 2, '#171314');
}

function drawCrystalCluster(ctx: Ctx): void {
  rect(ctx, 1, 10, 14, 4, '#2a2220');
  rect(ctx, 2, 9, 12, 1, '#3a2e28');
  rect(ctx, 3, 13, 10, 1, '#171314');
  const shard = (x: number, baseY: number, h: number, w: number, hi: string, lo: string): void => {
    for (let i = 0; i < h; i++) {
      const half = Math.max(0, Math.round((w / 2) * (1 - i / h)));
      rect(ctx, x - half, baseY - i, half * 2 + 1, 1, i > h * 0.55 ? lo : hi);
    }
    pixel(ctx, x, baseY - h, '#ffffff');
  };
  shard(5, 11, 9, 5, '#9ad3c7', '#3f7f78');
  shard(11, 11, 6, 4, '#f4c430', '#b8860b');
  shard(8, 11, 4, 3, '#ffe08a', '#b8860b');
}

function drawPineSnow(ctx: Ctx): void {
  const W = 26;
  const H = 38;
  rect(ctx, W / 2 - 2, H - 9, 4, 9, '#2c1e13');
  rect(ctx, W / 2 - 3, H - 3, 6, 3, '#1f150e');
  for (let tier = 0; tier < 3; tier++) {
    const top = 3 + tier * 9;
    const bottom = top + 15;
    const half = 4 + tier * 4;
    for (let y = top; y < bottom; y++) {
      const t = (y - top) / (bottom - top);
      const hw = Math.max(1, Math.round(half * (0.3 + t * 0.7)));
      rect(ctx, W / 2 - hw, y, hw * 2, 1, '#1e4633');
    }
    rect(ctx, W / 2 - half, top, half * 2, 1, '#f4f9ff');
    rect(ctx, W / 2 - half + 1, top + 1, 3, 1, '#cfe2ef');
    rect(ctx, W / 2 + half - 2, top + 2, 2, 1, '#cfe2ef');
  }
}

function drawIceSpike(ctx: Ctx): void {
  const W = 12;
  const H = 18;
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const half = Math.max(1, Math.round(1 + 4.4 * Math.pow(t, 1.6)));
    rect(ctx, W / 2 - half, y, half * 2, 1, '#7fb4cd');
    rect(ctx, W / 2 - half, y, 2, 1, '#dff3ff');
    rect(ctx, W / 2 + half - 2, y, 2, 1, '#47718a');
  }
  pixel(ctx, 5, 6, '#ffffff');
  rect(ctx, 1, H - 2, W - 2, 2, '#cfe2ef');
}

function drawRuinPillar(ctx: Ctx): void {
  const W = 18;
  const H = 40;
  const shaftTop = 7;
  // Broken crown.
  rect(ctx, 3, 0, 4, 5, '#4b4f42');
  rect(ctx, 11, 0, 4, 3, '#4b4f42');
  rect(ctx, 7, 4, 4, 4, '#4b4f42');
  // Shaft with fluting.
  for (let y = shaftTop; y < H - 5; y++) {
    rect(ctx, 4, y, 10, 1, '#565c4c');
    rect(ctx, 4, y, 2, 1, '#69705c');
    rect(ctx, 12, y, 2, 1, '#33382d');
    if (y % 9 === 0) rect(ctx, 6, y, 5, 1, '#3c4237');
  }
  // Base.
  rect(ctx, 2, H - 6, 14, 4, '#4b4f42');
  rect(ctx, 2, H - 6, 14, 1, '#69705c');
  rect(ctx, 0, H - 2, W, 2, '#2e3329');
  // Moss.
  pixel(ctx, 5, H - 8, '#6f8a4e');
  pixel(ctx, 11, H - 9, '#4f6a3a');
}

function drawRubble(ctx: Ctx): void {
  rect(ctx, 1, 5, 14, 4, '#4b4f42');
  rect(ctx, 2, 4, 6, 1, '#69705c');
  rect(ctx, 9, 3, 5, 2, '#565c4c');
  rect(ctx, 9, 3, 5, 1, '#767d68');
  rect(ctx, 4, 2, 4, 2, '#5d6353');
  rect(ctx, 1, 8, 14, 1, '#2e3329');
  rect(ctx, 11, 6, 3, 2, '#3c4237');
  pixel(ctx, 6, 6, '#6f8a4e');
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export function ensureTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('player_idle')) return; // already generated

  /* --- Adventurer sheets --- */
  makeSheet(scene, 'player_idle', 32, 24, 4, (ctx, i) => {
    drawAdventurer(ctx, {
      bodyY: i === 1 || i === 2 ? 1 : 0,
      eye: i === 3 ? 'blink' : 'open',
      frontLeg: { dx: 2, lift: 0 },
      backLeg: { dx: -2, lift: 0 },
    });
  });

  makeSheet(scene, 'player_run', 32, 24, 6, (ctx, i) => {
    const frontDx = [3, 1, -1, -3, -1, 1][i];
    const frontLift = [0, 1, 1, 0, 1, 1][i];
    const backDx = -frontDx;
    const backLift = [1, 0, 1, 1, 0, 1][(i + 2) % 6];
    const bob = [0, 1, 1, 0, 1, 1][i];
    const armSwing = [-2, -1, 0, 2, 1, 0][i];
    drawAdventurer(ctx, {
      bodyY: bob,
      frontLeg: { dx: frontDx, lift: frontLift },
      backLeg: { dx: backDx, lift: backLift },
      frontArm: { dx: -armSwing, dy: 0 },
      backArm: { dx: armSwing, dy: 0 },
    });
  });

  makeSheet(scene, 'player_jump', 32, 24, 1, (ctx) => {
    drawAdventurer(ctx, {
      bodyY: -1,
      frontLeg: { dx: 3, lift: 2 },
      backLeg: { dx: -2, lift: 1 },
      frontArm: { dx: -1, dy: -2 },
      backArm: { dx: 1, dy: -1 },
    });
  });

  makeSheet(scene, 'player_fall', 32, 24, 1, (ctx) => {
    drawAdventurer(ctx, {
      frontLeg: { dx: 3, lift: 1 },
      backLeg: { dx: -3, lift: 0 },
      frontArm: { dx: 1, dy: -2 },
      backArm: { dx: -2, dy: -2 },
    });
  });

  makeSheet(scene, 'player_attack', 32, 24, 4, (ctx, i) => {
    const poses: Pose[] = [
      {
        bodyX: -1,
        sword: 'windup',
        frontArm: { dx: -1, dy: -1 },
        frontLeg: { dx: 1, lift: 0 },
        backLeg: { dx: -3, lift: 0 },
        eye: 'open',
      },
      {
        bodyX: 0,
        sword: 'up',
        frontArm: { dx: 0, dy: -2 },
        frontLeg: { dx: 2, lift: 0 },
        backLeg: { dx: -3, lift: 0 },
        eye: 'open',
      },
      {
        bodyX: 1,
        sword: 'swing',
        frontArm: { dx: 2, dy: 1 },
        frontLeg: { dx: 3, lift: 0 },
        backLeg: { dx: -4, lift: 1 },
        eye: 'open',
        mouth: 'open',
      },
      {
        bodyX: 1,
        sword: 'down',
        frontArm: { dx: 2, dy: 2 },
        frontLeg: { dx: 3, lift: 0 },
        backLeg: { dx: -3, lift: 0 },
        eye: 'open',
      },
    ];
    drawAdventurer(ctx, poses[i]);
  });

  makeSheet(scene, 'player_hurt', 32, 24, 1, (ctx) => {
    drawAdventurer(ctx, {
      bodyX: -2,
      bodyY: 1,
      eye: 'hurt',
      mouth: 'open',
      frontLeg: { dx: 4, lift: 1 },
      backLeg: { dx: -4, lift: 0 },
      frontArm: { dx: -3, dy: -2 },
      backArm: { dx: 3, dy: -3 },
    });
  });

  makeSheet(scene, 'player_death', 32, 24, 6, (ctx, i) => {
    if (i === 0) {
      drawAdventurer(ctx, { bodyX: -1, eye: 'hurt', mouth: 'open', frontArm: { dx: -3, dy: -3 }, backArm: { dx: 3, dy: -3 } });
    } else if (i === 1) {
      drawAdventurer(ctx, { bodyX: -3, bodyY: 1, eye: 'hurt', mouth: 'open', frontLeg: { dx: 4, lift: 1 }, backLeg: { dx: -4, lift: 0 }, frontArm: { dx: -3, dy: -3 }, backArm: { dx: 3, dy: -3 } });
    } else if (i === 2) {
      drawAdventurer(ctx, { bodyX: -5, bodyY: 3, eye: 'hurt', mouth: 'open', frontLeg: { dx: 5, lift: 2 }, backLeg: { dx: -4, lift: 2 }, frontArm: { dx: -4, dy: -1 }, backArm: { dx: 4, dy: -1 } });
    } else {
      drawAdventurer(ctx, { lying: true });
    }
  });

  /* --- Enemies --- */
  makeSheet(scene, 'slime', 20, 16, 3, (ctx, i) => drawSlime(ctx, i));

  /* --- Collectibles --- */
  makeSheet(scene, 'coin', 10, 10, 4, (ctx, i) => drawCoin(ctx, i));
  makeSheet(scene, 'crystal', 12, 16, 3, (ctx, i) => drawCrystal(ctx, i));

  /* --- Structures --- */
  makeSheet(scene, 'checkpoint', 16, 32, 2, (ctx, i) => drawCheckpoint(ctx, i === 1));
  makeSheet(scene, 'exit', 48, 64, 3, (ctx, i) => drawExit(ctx, i));

  /* --- Props --- */
  makeImage(scene, 'tree_a', 48, 64, (ctx) => drawTree(ctx, 48, 64, 3));
  makeImage(scene, 'tree_b', 64, 80, (ctx) => drawTree(ctx, 64, 80, 7));
  makeImage(scene, 'tree_c', 40, 56, (ctx) => drawTree(ctx, 40, 56, 11));
  makeImage(scene, 'bush', 24, 13, drawBush);
  makeImage(scene, 'tuft', 13, 6, drawTuft);
  makeImage(scene, 'flower_a', 8, 8, (ctx) => drawFlower(ctx, PAL.gold));
  makeImage(scene, 'flower_b', 8, 8, (ctx) => drawFlower(ctx, PAL.redLight));
  makeImage(scene, 'mushroom', 10, 10, drawMushroom);
  makeImage(scene, 'rock', 13, 7, drawRock);
  makeImage(scene, 'sign', 17, 16, drawSign);

  /* --- Effects --- */
  makeImage(scene, 'slash', 32, 32, drawSlash);
  makeImage(scene, 'spark', 5, 5, drawSpark);
  makeImage(scene, 'ring', 16, 16, drawRing);
  makeImage(scene, 'glow', 32, 32, drawGlow);
  makeImage(scene, 'puff', 12, 9, drawPuff);
  makeImage(scene, 'px_dot', 3, 3, (ctx) => rect(ctx, 0, 0, 3, 3, PAL.cream));
  makeImage(scene, 'px_small', 2, 2, (ctx) => rect(ctx, 0, 0, 2, 2, PAL.cream));

  /* --- Tiles --- */
  makeImage(scene, 'tiles', 64, 16, drawTiles);
  // Name the four 16px tiles f0..f3 so sprites can request single tiles
  // (the tilemap itself slices the texture arithmetically and needs no frames).
  const forestTileTex = scene.textures.get('tiles');
  if (forestTileTex && !forestTileTex.has('f0')) {
    for (let i = 0; i < 4; i++) {
      forestTileTex.add(`f${i}`, 0, i * 16, 0, 16, 16);
    }
  }

  /* --- Backgrounds --- */
  makeImage(scene, 'bg_sky', 480, 270, (ctx) => drawSky(ctx, 480, 270));
  makeImage(scene, 'bg_hills', 480, 140, (ctx) => drawHills(ctx, 480, 140));
  makeImage(scene, 'bg_treeline', 480, 170, (ctx) => drawTreeLine(ctx, 480, 170, '#1a4131', '#122b21', 1));
  makeImage(scene, 'bg_treeline2', 480, 200, (ctx) => drawTreeLine(ctx, 480, 200, '#153627', '#0f281d', 1.4));
  makeImage(scene, 'bg_near', 480, 270, (ctx) => drawNearTrees(ctx, 480, 270));
  makeImage(scene, 'bg_beams', 480, 270, (ctx) => drawLightBeams(ctx, 480, 270));

  /* --- World 2: Ember Caverns --- */
  makeImage(scene, 'tiles_cavern', 64, 16, drawTilesCavern);
  makeImage(scene, 'bg_cav_sky', 480, 270, (ctx) => drawCavernSky(ctx, 480, 270));
  makeImage(scene, 'bg_cav_far', 480, 140, (ctx) => drawCavernFar(ctx, 480, 140));
  makeImage(scene, 'bg_cav_teeth', 480, 170, (ctx) => drawCavernTeeth(ctx, 480, 170));
  makeImage(scene, 'bg_cav_mid', 480, 200, (ctx) => drawCavernMid(ctx, 480, 200));
  makeImage(scene, 'bg_cav_near', 480, 270, (ctx) => drawCavernNear(ctx, 480, 270));
  makeImage(scene, 'bg_cav_glow', 480, 270, (ctx) => drawCavernGlow(ctx, 480, 270));
  makeImage(scene, 'stalagmite', 14, 22, drawStalagmite);
  makeImage(scene, 'crystal_cluster', 16, 14, drawCrystalCluster);

  /* --- World 3: Frostfall Peaks --- */
  makeImage(scene, 'tiles_peaks', 64, 16, drawTilesPeaks);
  makeImage(scene, 'bg_pk_sky', 480, 270, (ctx) => drawPeaksSky(ctx, 480, 270));
  makeImage(scene, 'bg_pk_far', 480, 140, (ctx) => drawPeaksFar(ctx, 480, 140));
  makeImage(scene, 'bg_pk_mid', 480, 170, (ctx) => drawPeaksMid(ctx, 480, 170));
  makeImage(scene, 'bg_pk_near', 480, 270, (ctx) => drawPeaksNear(ctx, 480, 270));
  makeImage(scene, 'bg_pk_trees', 480, 270, (ctx) => drawPeaksTrees(ctx, 480, 270));
  makeImage(scene, 'bg_pk_aurora', 480, 270, (ctx) => drawPeaksAurora(ctx, 480, 270));
  makeImage(scene, 'pine_snow', 26, 38, drawPineSnow);
  makeImage(scene, 'ice_spike', 12, 18, drawIceSpike);

  /* --- World 4: The Forgotten Kingdom --- */
  makeImage(scene, 'tiles_kingdom', 64, 16, drawTilesKingdom);
  makeImage(scene, 'bg_kg_sky', 480, 270, (ctx) => drawKingdomSky(ctx, 480, 270));
  makeImage(scene, 'bg_kg_far', 480, 140, (ctx) => drawKingdomFar(ctx, 480, 140));
  makeImage(scene, 'bg_kg_mid', 480, 170, (ctx) => drawKingdomMid(ctx, 480, 170));
  makeImage(scene, 'bg_kg_near', 480, 270, (ctx) => drawKingdomNear(ctx, 480, 270));
  makeImage(scene, 'bg_kg_cols', 480, 270, (ctx) => drawKingdomColumns(ctx, 480, 270));
  makeImage(scene, 'bg_kg_mist', 480, 270, (ctx) => drawKingdomMist(ctx, 480, 270));
  makeImage(scene, 'ruin_pillar', 18, 40, drawRuinPillar);
  makeImage(scene, 'rubble', 16, 10, drawRubble);

  /* --- Animation definitions (idempotent) --- */
  const anims = scene.anims;
  const frames = (key: string, count: number): Phaser.Types.Animations.AnimationFrame[] =>
    Array.from({ length: count }, (_, i) => ({ key, frame: `f${i}` }));

  const create = (config: Phaser.Types.Animations.Animation): void => {
    if (config.key && !anims.exists(config.key)) anims.create(config);
  };

  create({ key: 'player_idle', frames: frames('player_idle', 4), frameRate: 5, repeat: -1 });
  create({ key: 'player_run', frames: frames('player_run', 6), frameRate: 13, repeat: -1 });
  create({ key: 'player_jump', frames: frames('player_jump', 1), frameRate: 1 });
  create({ key: 'player_fall', frames: frames('player_fall', 1), frameRate: 1 });
  create({ key: 'player_attack', frames: frames('player_attack', 4), frameRate: 16, repeat: 0 });
  create({ key: 'player_hurt', frames: frames('player_hurt', 1), frameRate: 1 });
  create({ key: 'player_death', frames: frames('player_death', 6), frameRate: 9, repeat: 0 });
  create({ key: 'slime_move', frames: frames('slime', 3), frameRate: 5, repeat: -1 });
  create({ key: 'coin_spin', frames: frames('coin', 4), frameRate: 8, repeat: -1 });
  create({ key: 'crystal_shine', frames: frames('crystal', 3), frameRate: 4, repeat: -1 });
  create({ key: 'checkpoint_glow', frames: frames('checkpoint', 2), frameRate: 2, repeat: -1 });
  create({ key: 'exit_portal', frames: frames('exit', 3), frameRate: 6, repeat: -1 });
}
