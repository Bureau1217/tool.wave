import * as THREE from "three";
import { vertexShader, fragmentShader } from "./shader";

/** Convert a #rrggbb hex string to a normalised RGB array. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export interface MirrorBlocksOptions {
  /** Number of horizontal bands. Default 11. */
  rows?: number;
  /** Wave displacement amplitude in rows. Default 2.0. */
  waveAmp?: number;
  /** Vertical scroll speed. Default 0.8. */
  scrollSpeed?: number;
  /** Edge softness, 0 = hard, 1 = very soft. Default 0.35. */
  edgeSoftness?: number;
  /** Film-grain strength. Default 0.22. */
  grain?: number;
  /** Darkness of the central seam, 0–1. Default 0.45. */
  seam?: number;
  /** Four palette colours as #rrggbb (teal, green, violet, lavender). */
  palette?: [string, string, string, string];
  /** Cap the device pixel ratio. Default 2. */
  maxPixelRatio?: number;
}

const DEFAULTS: Required<Omit<MirrorBlocksOptions, "palette">> & {
  palette: [string, string, string, string];
} = {
  rows: 11,
  waveAmp: 2.0,
  scrollSpeed: 0.8,
  edgeSoftness: 0.35,
  grain: 0.22,
  seam: 0.45,
  palette: ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"],
  maxPixelRatio: 2,
};

/**
 * Full-screen animated shader effect: a vertically-mirrored field of soft
 * colour blocks with grain and a central seam. Renders into the canvas you
 * pass in and resizes with it.
 */
export class MirrorBlocksEffect {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private clock = new THREE.Clock();
  private rafId = 0;
  private running = false;
  private ro?: ResizeObserver;
  private prefersReducedMotion: MediaQueryList;
  private maxPixelRatio: number;

  constructor(canvas: HTMLCanvasElement, options: MirrorBlocksOptions = {}) {
    const opts = { ...DEFAULTS, ...options };
    this.maxPixelRatio = opts.maxPixelRatio;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
    });

    const [a, b, c, d] = opts.palette;
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uScrollSpeed: { value: opts.scrollSpeed },
        uWaveAmp: { value: opts.waveAmp },
        uGrain: { value: opts.grain },
        uSeam: { value: opts.seam },
        uColA: { value: new THREE.Vector3(...hexToRgb(a)) },
        uColB: { value: new THREE.Vector3(...hexToRgb(b)) },
        uColC: { value: new THREE.Vector3(...hexToRgb(c)) },
        uColD: { value: new THREE.Vector3(...hexToRgb(d)) },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(quad);

    this.prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    this.resize();
    this.observe(canvas);
  }

  /** Update any uniform at runtime, e.g. set({ grain: 0.1, rows: 14 }). */
  set(options: Partial<MirrorBlocksOptions>): void {
    const u = this.material.uniforms;
    if (options.rows !== undefined) u.uRows.value = options.rows;
    if (options.waveAmp !== undefined) u.uWaveAmp.value = options.waveAmp;
    if (options.scrollSpeed !== undefined)
      u.uScrollSpeed.value = options.scrollSpeed;
    if (options.edgeSoftness !== undefined)
      u.uEdgeSoftness.value = options.edgeSoftness;
    if (options.grain !== undefined) u.uGrain.value = options.grain;
    if (options.seam !== undefined) u.uSeam.value = options.seam;
    if (options.palette) {
      const [a, b, c, d] = options.palette;
      u.uColA.value.set(...hexToRgb(a));
      u.uColB.value.set(...hexToRgb(b));
      u.uColC.value.set(...hexToRgb(c));
      u.uColD.value.set(...hexToRgb(d));
    }
  }

  private observe(canvas: HTMLCanvasElement): void {
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  private resize(): void {
    const canvas = this.renderer.domElement;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.material.uniforms.uTime.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };

  /** Start the animation loop. Respects prefers-reduced-motion. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    if (this.prefersReducedMotion.matches) {
      // Render a single static frame instead of animating.
      this.material.uniforms.uTime.value = 0;
      this.renderer.render(this.scene, this.camera);
      this.running = false;
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Release GPU resources and observers. */
  dispose(): void {
    this.stop();
    this.ro?.disconnect();
    this.material.dispose();
    this.renderer.dispose();
  }
}
