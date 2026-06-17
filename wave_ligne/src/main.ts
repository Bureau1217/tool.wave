import { MirrorBlocksEffect } from "./MirrorBlocksEffect";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

const effect = new MirrorBlocksEffect(canvas, {
  waveAmp: 0.3,      // oscillation: 0 = static, 1 = cycle through full palette
  scrollSpeed: 0.5,  // speed of the oscillation
  grain: 0.15,
  seam: 0.45,
  palette: ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"],
});

effect.start();

// Pause when the tab is hidden to save the GPU.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) effect.stop();
  else effect.start();
});
