import "./style.css";
import { CanvasSpace } from "pts";

// ---------------------------------------------------------------------------
// Sketch inspiré des images de _inspi : un champ de couleur arc-en-ciel doux
// (grandes zones / blocs) échantillonné en fines bandes horizontales. Chaque
// bande est légèrement décalée horizontalement (effet entrelacé / scanlines)
// par des ondes Math.sin / Math.cos, et le champ entier dérive dans le temps.
// La teinte varie peu le long d'une bande -> dégradés doux, pas un arc-en-ciel
// complet par ligne.
// ---------------------------------------------------------------------------

const space = new CanvasSpace("#scene").setup({
  bgcolor: "#0b1220",
  resize: true,
  retina: true,
});

const ctx = space.ctx as CanvasRenderingContext2D;

// Hauteur d'une bande (px logiques) : petit => dense.
const BAND_H = 4;
// Paliers du dégradé horizontal par bande (lissage).
const STOPS = 16;

space.add({
  animate: (time) => {
    const t = time * 0.001;
    const w = space.width;
    const h = space.height;
    const rows = Math.ceil(h / BAND_H);

    // Champ de teinte 2D doux : peu de cycles -> grandes zones de couleur.
    const hueField = (px: number, py: number) => {
      const nx = px / w;
      const ny = py / h;
      return (
        nx * 60 + // léger balayage horizontal
        ny * 160 + // bandes de couleur verticales (le gros du dégradé)
        Math.sin(nx * 2.5 + t * 0.3) * 45 +
        Math.cos(ny * 3.0 - t * 0.25) * 55 +
        Math.sin((nx + ny) * 1.8 + t * 0.4) * 35 + // blocs diagonaux
        t * 18 // dérive temporelle
      );
    };

    for (let i = 0; i < rows; i++) {
      const y = i * BAND_H;
      const cy = y + BAND_H * 0.5;

      // Décalage horizontal de la bande (combinaison de deux ondes) : c'est
      // ce qui produit les stries entrelacées qui ondulent.
      const shift =
        Math.sin(i * 0.35 + t * 1.4) * (w * 0.12) +
        Math.cos(i * 0.11 - t * 0.7) * (w * 0.08);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      for (let s = 0; s <= STOPS; s++) {
        const u = s / STOPS;
        const px = u * w + shift;
        const hue = hueField(px, cy);
        // Légère variation fine de luminosité ligne à ligne (grain).
        const light = 60 + Math.sin(i * 0.9 + u * 3 + t) * 7;
        const sat = 88 + Math.sin(cy / h * 4 + t * 0.5) * 8;
        grad.addColorStop(
          u,
          `hsl(${((hue % 360) + 360) % 360}, ${sat}%, ${light}%)`,
        );
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, y, w, BAND_H);
    }

    // Fines séparations sombres et discrètes (scanlines) par-dessus.
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < rows; i++) {
      ctx.fillRect(0, i * BAND_H + BAND_H - 1, w, 1);
    }
  },
});

space.play();
