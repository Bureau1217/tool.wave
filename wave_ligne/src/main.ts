import { WaveEffect } from "./WaveEffect";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

const effect = new WaveEffect(canvas, {
  waveAmp:     .5,   // oscillation amplitude: 0 = static, 1 = full palette cycle
  scrollSpeed: 1,   // speed of the oscillation
  seam:        0,
  palette: ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"],
});

effect.start();

// Pause when the tab is hidden to save the GPU.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) effect.stop();
  else effect.start();
});
