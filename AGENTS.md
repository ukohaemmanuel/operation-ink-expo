# Operation Safe Return

Expo SDK 57 React Native game. Paper-and-ink hostage rescue. Do not add Project I.G.I. audio or vendor the original Vite app.

## Commands

```sh
npm install
npx expo start
npm test          # tsx scripts/mission-checks.ts
npm run typecheck # tsc --noEmit
```

Use `npx expo install` for Expo modules. The 3D stack is `expo-gl` + `three@0.166` + `expo-three`'s Renderer. Screens live in `App.tsx` (title ↔ game), not Expo Router.

## Layout

- `src/game/sim.ts` and `src/game/world.ts` are the mission. They do not import React or Three, so Node can test them.
- `src/game/scene.ts` builds the ink compound.
- `src/ui/` is the touch HUD.
- `assets/sfx/` is procedural CC0 audio from `scripts/generate-sfx.mjs`.

Mission state must reset on retry. Keep the paper white, the outlines black, and the hostage `#2878d0`.
