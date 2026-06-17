import Two from 'two.js';

// ── colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Cycles smoothly through the palette colours given t ∈ ℝ (wraps).
function samplePalette(
  t: number,
  colors: [number, number, number][]
): [number, number, number] {
  t = ((t % 1) + 1) % 1;
  const n = colors.length;
  const pos = t * n;
  const i = Math.floor(pos);
  const f = pos - i;
  const a = colors[i];
  const b = colors[(i + 1) % n];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

// Deterministic pseudo-random value in [0, 1) for an integer seed.
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── options ───────────────────────────────────────────────────────────────────

export interface MirrorBlocksOptions {
  /** Number of horizontal block-rows visible vertically. Default 11. */
  rows?: number;
  /** How many times the palette cycles across each half-width. Default 1.5. */
  colorSpan?: number;
  /** Max horizontal phase shift each row-block can take, 0–1. Default 0.35. */
  waveAmp?: number;
  /** Vertical scroll speed (blocks drift upward). Default 0.4. */
  scrollSpeed?: number;
  /** Film-grain strength. Default 0.18. */
  grain?: number;
  /** Darkness of the central seam, 0–1. Default 0.5. */
  seam?: number;
  /** Four palette colours as #rrggbb. */
  palette?: [string, string, string, string];
}

// ── constants ─────────────────────────────────────────────────────────────────

/** Height in pixels of each horizontal scan strip (smaller = softer). */
const STRIP_H = 2;
/** Colour stops per gradient strip (horizontal resolution). */
const STOPS_N = 24;

// ── effect ────────────────────────────────────────────────────────────────────

/**
 * Mirrored colour-block field.
 *
 * The colour at any pixel is sampled from the palette as:
 *
 *   colour = palette( mx · colorSpan  +  blockShift  )
 *
 * where:
 *   • mx        = |x − centre| / halfWidth   (0 at the seam, 1 at the edges)
 *   • blockShift = a per-row-block horizontal phase offset
 *
 * `mx · colorSpan` gives the dominant horizontal gradient that cycles outward
 * from the dark central seam. Quantising the vertical axis into row-blocks and
 * giving each block its own `blockShift` makes that gradient jump sideways from
 * one block to the next — the stepped, mirrored "blocks" look. The blocks drift
 * upward over time for the scrolling animation. Everything is mirrored about the
 * vertical centre line.
 */
export class MirrorBlocksEffect {
  private two: Two;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private colors: [number, number, number][];
  private rows: number;
  private colorSpan: number;
  private waveAmp: number;
  private scrollSpeed: number;
  private grain: number;
  private seam: number;

  private t0 = performance.now();
  private rafId = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement, opts: MirrorBlocksOptions = {}) {
    this.canvas      = canvas;
    this.rows        = opts.rows        ?? 11;
    this.colorSpan   = opts.colorSpan   ?? 1.5;
    this.waveAmp     = opts.waveAmp     ?? 0.35;
    this.scrollSpeed = opts.scrollSpeed ?? 0.4;
    this.grain       = opts.grain       ?? 0.18;
    this.seam        = opts.seam        ?? 0.5;
    this.colors      = (opts.palette    ?? ['#1d6286', '#2cc181', '#7e7cfb', '#bcbcf9'])
                         .map(hexToRgb) as [number, number, number][];

    // Two.js owns canvas sizing (fitted = resize with parent container).
    this.two = new Two({ type: Two.Types.canvas, domElement: canvas, fitted: true });
    this.ctx = canvas.getContext('2d')!;
  }

  // ── rendering ────────────────────────────────────────────────────────────

  private draw(t: number): void {
    const ctx = this.ctx;
    // two.width/height are logical (CSS) px; canvas.width/height are real px
    // (Two.js multiplies by DPR). Scale the context so we draw in logical px.
    const w   = this.two.width;
    const h   = this.two.height;
    const dpr = this.canvas.width / w || 1;
    const cx  = w / 2;

    ctx.save();
    ctx.scale(dpr, dpr);

    const scroll = t * this.scrollSpeed;

    // Scan top-to-bottom in thin horizontal strips.
    for (let y = 0; y < h; y += STRIP_H) {
      // Continuous vertical coordinate that scrolls upward over time.
      const vy = (y / h) * this.rows + scroll;

      // Quantise into a row-block, then interpolate the block's horizontal
      // phase shift toward the next block so the step edges aren't razor-sharp.
      const block = Math.floor(vy);
      const frac  = vy - block;
      const shiftA = hash(block);
      const shiftB = hash(block + 1);
      // Mostly hold the current block's value, easing across the last 15%.
      const ease   = frac < 0.85 ? 0 : (frac - 0.85) / 0.15;
      const blockShift = (shiftA + (shiftB - shiftA) * ease) * this.waveAmp;

      // Build colour stops from the seam (mx=0) out to the edge (mx=1).
      const stops: string[] = [];
      for (let i = 0; i <= STOPS_N; i++) {
        const mx = i / STOPS_N;
        const [r, g, b] = samplePalette(mx * this.colorSpan + blockShift, this.colors);
        // Gaussian dark seam hugging the centre line.
        const s = Math.exp(-(mx * mx) / 0.01) * this.seam;
        stops.push(`rgb(${(r * (1 - s)) | 0},${(g * (1 - s)) | 0},${(b * (1 - s)) | 0})`);
      }

      // Right half: seam → right edge.
      const gR = ctx.createLinearGradient(cx, 0, w, 0);
      stops.forEach((c, i) => gR.addColorStop(i / STOPS_N, c));
      ctx.fillStyle = gR;
      ctx.fillRect(cx, y, cx, STRIP_H);

      // Left half: seam → left edge (mirror of the right).
      const gL = ctx.createLinearGradient(cx, 0, 0, 0);
      stops.forEach((c, i) => gL.addColorStop(i / STOPS_N, c));
      ctx.fillStyle = gL;
      ctx.fillRect(0, y, cx, STRIP_H);
    }

    // Film grain: sparse random bright/dark pixels for the gritty texture.
    if (this.grain > 0) {
      const count = ((w * h * this.grain * 0.01) | 0);
      for (let i = 0; i < count; i++) {
        const alpha = Math.random() * 0.5 * this.grain;
        ctx.fillStyle = Math.random() > 0.5
          ? `rgba(255,255,255,${alpha})`
          : `rgba(0,0,0,${alpha})`;
        ctx.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1);
      }
    }

    ctx.restore();
  }

  // ── animation loop ────────────────────────────────────────────────────────

  // Own rAF loop (not two.play) so Two.js doesn't clear the canvas between our
  // draw call and its own render step.
  private frame = (): void => {
    if (!this.running) return;
    this.draw((performance.now() - this.t0) / 1000);
    this.rafId = requestAnimationFrame(this.frame);
  };

  // ── lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void { this.stop(); }
}
