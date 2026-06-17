# Mirror Blocks Effect

Effet de fond animé en **TypeScript + Three.js / WebGL** : un champ de blocs
de couleur (teal / vert / violet / lavande) à symétrie miroir verticale, avec
grain de film, couture sombre centrale et respiration vers le centre.
Boucle en continu.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production dans /dist
```

## Utilisation

```ts
import { MirrorBlocksEffect } from "./MirrorBlocksEffect";

const canvas = document.querySelector("#scene")!;
const effect = new MirrorBlocksEffect(canvas, {
  rows: 11,            // nombre de bandes horizontales
  blocks: 6,           // colonnes de blocs par demi (miroir)
  scrollSpeed: 0.8,    // vitesse de défilement / churn
  breathe: 0.4,        // respiration vers le centre
  edgeSoftness: 0.35,  // 0 = bords nets, 1 = très flous
  grain: 0.22,         // force du grain
  seam: 0.45,          // noirceur de la couture centrale (0–1)
  palette: ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"],
});

effect.start();
```

## API

- `start()` — lance la boucle (respecte `prefers-reduced-motion`).
- `stop()` — met en pause.
- `set({ ... })` — change n'importe quel paramètre à chaud.
- `dispose()` — libère les ressources GPU.

Le canvas est plein écran via le CSS fourni, mais l'effet s'adapte à
n'importe quelle taille de canvas (il observe le redimensionnement).
