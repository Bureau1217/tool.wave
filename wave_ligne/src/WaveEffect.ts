import { CanvasSpace, CanvasForm, Group, Pt } from "pts";

// ── colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

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

// ── options ───────────────────────────────────────────────────────────────────

export interface WaveOptions {
  waveAmp?: number;
  scrollSpeed?: number;
  grain?: number;
  seam?: number;
  palette?: [string, string, string, string];
}

// ── effect ────────────────────────────────────────────────────────────────────

export class WaveEffect {
  private space: CanvasSpace;
  private form: CanvasForm;
  private colors: [number, number, number][];
  private waveAmp: number;
  private scrollSpeed: number;
  private seam: number;

  constructor(canvas: HTMLCanvasElement, options: WaveOptions = {}) {
    this.waveAmp     = options.waveAmp     ?? 0.3;
    this.scrollSpeed = options.scrollSpeed ?? 0.5;
    this.seam        = options.seam        ?? 0.45;
    this.colors      = (options.palette    ?? ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"])
                         .map(hexToRgb) as [number, number, number][];

    this.space = new CanvasSpace(canvas).setup({ bgcolor: "#000000", resize: true });
    this.form  = this.space.getForm();

    this.space.add({ animate: (time) => this.draw(time / 1000) });
  }

  private draw(t: number): void {
    const w  = this.space.size.x;
    const h  = this.space.size.y;
    const cx = w / 2;

    // Oscillating phase shifts the gradient position back and forth
    const phase = Math.sin(t * this.scrollSpeed) * this.waveAmp;

    // Build colour stops: centre (mx=0) → edge (mx=1)
    const STOPS = 50;
    const stops: [number, string][] = [];
    for (let i = 0; i <= STOPS; i++) {
      const mx = i / STOPS;
      const [r, g, b] = samplePalette(mx * 0.5 + phase, this.colors);
      // Darken at centre (seam)
      const s = Math.exp(-(mx * mx) / 0.006) * this.seam;
      stops.push([mx, `rgb(${(r * (1 - s)) | 0},${(g * (1 - s)) | 0},${(b * (1 - s)) | 0})`]);
    }

    // form.gradient() returns a builder function;
    // call it with a Group of [startPt, endPt] to get a CanvasGradient.
    const gradBuilder = this.form.gradient(stops);

    // Right half: centre → right edge
    const gradR = gradBuilder(new Group(new Pt(cx, 0), new Pt(w, 0)));
    this.form.fill(gradR).rect(new Group(new Pt(cx, 0), new Pt(w, h)));

    // Left half: centre → left edge (mirror)
    const gradL = gradBuilder(new Group(new Pt(cx, 0), new Pt(0, 0)));
    this.form.fill(gradL).rect(new Group(new Pt(0, 0), new Pt(cx, h)));

  }

  start():   void { this.space.play(); }
  stop():    void { this.space.pause(); }
  dispose(): void { this.space.dispose(); }
}
