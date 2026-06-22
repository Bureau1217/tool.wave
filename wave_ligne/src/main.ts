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
    palette: ["#3d1581", "#fb34f9", "#fcfcfc", "#221cf5"],
  });

  effect.start();
  effects.push(effect);
}

document.addEventListener("visibilitychange", () => {
  effects.forEach(e => document.hidden ? e.stop() : e.start());
});
