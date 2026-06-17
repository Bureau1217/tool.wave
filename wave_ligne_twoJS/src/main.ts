import { MirrorBlocksEffect } from "./MirrorBlocksEffect";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

const effect = new MirrorBlocksEffect(canvas, {
  rows:        11,    // horizontal block-rows visible vertically
  colorSpan:   1.5,   // palette cycles across each half-width
  waveAmp:     0.35,  // how far each row-block shifts the gradient sideways
  scrollSpeed: 0.4,   // vertical scroll speed
  grain:       0.18,  // film-grain amount
  seam:        0.5,   // centre seam darkness
  palette: ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"],
});

effect.start();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) effect.stop();
  else effect.start();
});
