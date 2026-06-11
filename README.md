# Sheep Run / 赶了个羊

Canvas 2.5D traffic-jam-like sheep puzzle prepared for Android packaging.

The latest direction is intentionally **not Unity** and **not Three.js**. The game only needs one multi-direction sheep; the board, barn, fence, hay, and UI can be rendered as stylized 2.5D Canvas assets. This keeps the first version small, fast, and easy to wrap for Android/iOS later with Capacitor.

## Current State

- Vite + TypeScript.
- Single full-screen `<canvas>` playfield.
- DOM menu/HUD/result overlays.
- One sheep barn target, many directional sheep, and wrong taps fail immediately.
- 200 generated local levels with a steep difficulty curve.
- Isometric grass board, barn, fence, hay, flowers, and 4-direction sheep sprites.
- Mobile home screen with continue progress, paged level selection, locked/completed states, and a short splash.
- Generated app icon, splash image, and Google Play feature graphic.
- Capacitor Android project with package `com.jnyoung.sheeprun`.
- Web Audio SFX/music that never blocks gameplay if audio unlock is delayed.
- zh-CN, en, ja localization.
- JSON level validation and release readiness audit.

## Run

```bash
npm install
npm run dev
```

## Validate And Build

```bash
npm run levels:generate
npm run brand:generate
npm test
npm run build
npm run release:audit
npm run android:aab
```

The current AAB output path is:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

For Google Play production upload, configure a real upload keystore using `android/keystore.properties.example`, then rebuild.

## Release Docs

- `docs/google-play-readiness.md`
- `docs/store-metadata.zh-CN.json`
- `public/privacy.html`
- `public/support.html`
- `public/data-deletion.html`
- `public/app-home.html`

## Older Design Notes

- `docs/00-handoff.md`
- `docs/01-canvas-25d-plan.md`
- `docs/02-visual-direction-and-prompts.md`
- `docs/NEXT_CODEX_PROMPT.md`
