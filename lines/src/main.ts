import "./style.css";
import { CanvasSpace } from "pts";

// ---------------------------------------------------------------------------
// Sketch inspiré des images de _inspi (notamment img_4.png) :
// fines bandes horizontales remplies d'un dégradé issu d'une PALETTE RGB
// contrôlable. Le point échantillonné dans la palette dépend de la position
// (x, y), d'ondes Math.sin / Math.cos et du temps. Forte variation ligne à
// ligne : décalage de teinte, luminosité et stries claires par bande.
// ---------------------------------------------------------------------------

const space = new CanvasSpace("#scene").setup({
  bgcolor: "#FFFFFF",
  resize: true,
  retina: true,
});
const ctx = space.ctx as CanvasRenderingContext2D;

// --- PALETTE -----------------------------------------------------------------
// Tableau de couleurs RGB modifiable à la main pour contrôler le rendu.
// L'ordre définit le cycle du dégradé (boucle en fin de tableau).
type RGB = [number, number, number];
const palette: RGB[] = [
    [29, 98, 134],
    [44, 193, 129],
    [126, 124, 251],
    [188, 188, 249],
];

// Échantillonne la palette à une position continue (boucle), interpolation linéaire.
function samplePalette(pos: number): RGB {
  const n = palette.length;
  const x = (((pos % 1) + 1) % 1) * n;
  const i = Math.floor(x);
  const f = x - i;
  const a = palette[i % n];
  const b = palette[(i + 1) % n];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

// Petit bruit déterministe (stable par ligne) pour la variation ligne à ligne.
function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

// Applique luminosité + tirage vers le blanc (stries claires) à une couleur RGB.
function shade(c: RGB, bright: number, shine: number): string {
  const r = c[0] * bright + (255 - c[0] * bright) * shine;
  const g = c[1] * bright + (255 - c[1] * bright) * shine;
  const b = c[2] * bright + (255 - c[2] * bright) * shine;
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${cl(r)}, ${cl(g)}, ${cl(b)})`;
}

// Hauteur d'une bande (px logiques) : petit => dense.
const BAND_H = 4;

space.add({
  animate: (time) => {
    const t = time * 0.001;
    const w = space.width;
    const h = space.height;
    const rows = Math.ceil(h / BAND_H);

    // Position dans la palette en fonction de (x, y) + ondes + temps.
    const palettePos = (px: number, py: number) => {
      const nx = px / w;
      const ny = py / h;
      return (
        ny * 1.0 + // l'essentiel du dégradé est vertical
        nx * 0.25 + // léger balayage horizontal
        Math.sin(nx * 2.4 + t * 0.3) * 0.12 +
        Math.cos(ny * 3.0 - t * 0.25) * 0.18 +
        Math.sin((nx + ny) * 1.8 + t * 0.4) * 0.1 + // blocs diagonaux
        t * 0.05 // dérive temporelle
      );
    };

    for (let i = 0; i < rows; i++) {
      const y = i * BAND_H;
      const cy = y + BAND_H * 0.5;
      const seed = hash(i);

      // Décalage horizontal de la bande (deux ondes) -> stries entrelacées.
      const shift =
        Math.sin(i * 0.35 + t * 1.4) * (w * 0.1) +
        Math.cos(i * 0.11 - t * 0.7) * (w * 0.07);

      // Variation ligne à ligne : décalage de teinte, luminosité, et stries
      // claires aléatoires (certaines lignes tirent vers le blanc).
      const posJitter = (seed - 0.5) * 0.08;
      const bright = 0.82 + seed * 0.35 + Math.sin(i * 0.7 + t * 2) * 0.05;
      const shine = seed > 0.86 ? (seed - 0.86) * 2.2 : 0;

      // Position de la COUPURE NETTE : dégradé doux d'un côté, changement de
      // couleur brutal de l'autre. Le point varie par ligne (bord dentelé)
      // et la coupure peut être à gauche ou à droite selon la ligne.
      const flip = seed > 0.5; // côté de la coupure
      const breakU =
        0.5 + Math.sin(i * 0.22 + t * 0.9) * 0.28 + (seed - 0.5) * 0.15;
      const bu = Math.max(0.08, Math.min(0.92, breakU));

      const base = palettePos(shift, cy) + posJitter;
      const smoothSpan = 0.35; // étendue de palette parcourue par le dégradé doux
      const jump = 0.42 + seed * 0.25; // ampleur du saut brutal

      const col = (p: number) => shade(samplePalette(p), bright, shine);
      const grad = ctx.createLinearGradient(0, 0, w, 0);

      if (flip) {
        // Dégradé doux à GAUCHE [0, bu], puis coupure nette vers la droite.
        const SMOOTH = 10;
        for (let s = 0; s <= SMOOTH; s++) {
          const f = s / SMOOTH;
          grad.addColorStop(bu * f, col(base + smoothSpan * f));
        }
        grad.addColorStop(bu, col(base + smoothSpan + jump)); // saut brutal
        grad.addColorStop(1, col(base + smoothSpan + jump + 0.08));
      } else {
        // Coupure nette à gauche, puis dégradé doux à DROITE [bu, 1].
        grad.addColorStop(0, col(base + jump));
        grad.addColorStop(bu, col(base + jump + 0.08)); // saut brutal
        const SMOOTH = 10;
        for (let s = 0; s <= SMOOTH; s++) {
          const f = s / SMOOTH;
          grad.addColorStop(bu + (1 - bu) * f, col(base + smoothSpan * f));
        }
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, y, w, BAND_H);
    }

    // Fines séparations sombres et discrètes (scanlines) par-dessus.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let i = 0; i < rows; i++) {
      ctx.fillRect(0, i * BAND_H + BAND_H - 1, w, 1);
    }
  },
});

space.play();
