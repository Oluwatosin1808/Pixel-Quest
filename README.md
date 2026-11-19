# Pixel Quest

A 16-bit style 2D pixel-art platformer built with **Phaser 3**, **React**, **TypeScript**, and **Vite**.

## Play

Cross four worlds, recover crystal fragments, defeat slimes and bats, and restore the ancient crystal:

1. **Whispering Woods** — mist, moss and creeping slimes
2. **Ember Caverns** — molten rock and sleeping stone
3. **Frostfall Peaks** — thin air, sharper teeth, and thin ice
4. **The Forgotten Kingdom** — ruins that remember your name

Each world is split into **five sub-levels** with checkpoints, pickups (hearts, shield, speed boots), coins, and a world crystal. Enemies get faster, more alert, and tougher with every sub-level you enter — and later worlds start on a higher difficulty tier with denser patrols, so the challenge keeps rising from World 1 through World 4.

## Controls

- **Move:** `A` / `D` or Arrow keys
- **Jump:** `Space` / `W` / `↑`
- **Attack:** `J` / `K` / `X`
- **Pause:** `Esc` / `P`
- **Touch:** on-screen controls on mobile (tap to go fullscreen)

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck and build for production (`dist/`)
- `npm run preview` — preview the production build locally
- `npm run typecheck` — run TypeScript checks
- `npm run validate:levels` — validate level layouts, placement, and reachability

## Progress & saves

Progress (unlocks, checkpoints, crystals, best score, settings) is saved in browser `localStorage`. Use **Continue** from the main menu to resume, or start a new run/reset data from the menus.

## Project structure

- `src/game/` — Phaser scenes, entities, systems, level/config data, textures and audio synthesis
- `src/components/` — React UI (menus, HUD, overlays, mobile controls)
- `src/store/` — UI/game bridge and state
- `scripts/` — level validation tooling
- `public/` — web app manifest and icons
