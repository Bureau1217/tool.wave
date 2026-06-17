import { WaveEffect } from "./WaveEffect";
import "./style.css";

const COUNT = 5;

const effects: WaveEffect[] = [];

for (let i = 0; i < COUNT; i++) {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  const effect = new WaveEffect(canvas, {
    rows:        COUNT,
    waveAmp:     0.5,
    scrollSpeed: 1,
    seam:        0,
    palette: ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"],
  });

  effect.start();
  effects.push(effect);
}

document.addEventListener("visibilitychange", () => {
  effects.forEach(e => document.hidden ? e.stop() : e.start());
});
