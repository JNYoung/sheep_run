# Sheep Run / 赶了个羊

Canvas 2.5D MVP for a tiny traffic-jam-like sheep puzzle.

The latest direction is intentionally **not Unity** and **not Three.js**. The game only needs one multi-direction sheep; the board, barn, fence, hay, and UI can be rendered as stylized 2.5D Canvas assets. This keeps the first version small, fast, and easy to wrap for Android/iOS later with Capacitor.

## Current MVP

- Vite + TypeScript.
- Single full-screen `<canvas>` playfield.
- DOM menu/HUD/result overlays.
- One sheep, one barn, one correct tap.
- Wrong tap fails immediately.
- Isometric grass board, barn, fence, hay, flowers, and directional procedural sheep.
- Web Audio placeholder SFX/music.
- zh-CN, en, ja localization.
- JSON level validation.

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm test
npm run build
```

## Next Steps

Read these before continuing:

- `docs/00-handoff.md`
- `docs/01-canvas-25d-plan.md`
- `docs/02-visual-direction-and-prompts.md`
- `docs/NEXT_CODEX_PROMPT.md`

The next implementation pass should improve the sheep directional art and add a small level-selection flow, while keeping the simulation rules independent from Canvas rendering.
